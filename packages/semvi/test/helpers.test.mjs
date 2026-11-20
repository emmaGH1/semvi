import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {test} from 'node:test';
import {gzipSync} from 'node:zlib';
import {HELPERS_VERSION, installHelpers, resolveBinDir} from '../lib/helpers.js';

const host = `${process.platform}-${process.arch}`;
const supported = ['linux-x64', 'linux-arm64', 'darwin-x64', 'darwin-arm64'].includes(host);
const helpers = [['intent'], ['prepare']];
const bootstrap = {checksums: {}, platform: 'linux', arch: 'x64'};

function archive(entries) {
  const tar = [];
  for (const [name, type = '0', prefix = ''] of entries) {
    const body = type === '0' ? Buffer.from(`${name} fixture`) : Buffer.alloc(0);
    const header = Buffer.alloc(512);
    header.write(name, 0, 100);
    header.write(body.length.toString(8).padStart(11, '0'), 124, 11);
    header.fill(32, 148, 156);
    header.write(type, 156, 1);
    if (type === '1' || type === '2') header.write('prepare', 157);
    header.write('ustar\0' + '00', 257);
    header.write(prefix, 345, 155);
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148);
    tar.push(header, body, Buffer.alloc((512 - body.length % 512) % 512));
  }
  return gzipSync(Buffer.concat([...tar, Buffer.alloc(1024)]));
}

function mockRelease(t, bytes, target = 'linux-x64') {
  const name = `semvi-helpers-${HELPERS_VERSION}-${target}.tar.gz`;
  const url = `https://github.com/emmaGH1/semvi/releases/download/helpers-v${HELPERS_VERSION}`;
  const hash = createHash('sha256').update(bytes).digest('hex');
  t.mock.method(globalThis, 'fetch', async path => {
    if (path === `${url}/SHA256SUMS`) return new Response(`${hash}  ${name}\n`);
    assert.equal(path, `${url}/${name}`);
    return new Response(bytes);
  });
}

async function tempInstall(t, env = {}) {
  const root = await mkdtemp(join(tmpdir(), 'semvi-helper-test-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  return {...env, SEMVI_HELPERS_DIR: join(root, 'helpers')};
}

test('a fresh pinned install downloads only the archive', async t => {
  const env = await tempInstall(t);
  const bytes = archive(helpers);
  const checksums = {'linux-x64': createHash('sha256').update(bytes).digest('hex')};
  const fetch = t.mock.method(globalThis, 'fetch', async path => {
    assert.ok(path.endsWith(`/semvi-helpers-${HELPERS_VERSION}-linux-x64.tar.gz`));
    return new Response(bytes);
  });
  assert.equal(await installHelpers({...bootstrap, env, checksums}), env.SEMVI_HELPERS_DIR);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(await readFile(join(env.SEMVI_HELPERS_DIR, 'prepare'), 'utf8'), 'prepare fixture');
});

test('unpinned install requires explicit opt-in and unsupported platforms are explained before download', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('Unexpected download'));
  await assert.rejects(installHelpers({platform: 'win32', arch: 'x64'}), /win32-x64.*linux-x64.*darwin-arm64/);
  await assert.rejects(installHelpers(bootstrap), /No embedded SHA-256.*--allow-unpinned/);
});

test('a pinned checksum mismatch is rejected before extracting or writing, even with opt-in', async t => {
  const env = await tempInstall(t);
  t.mock.method(globalThis, 'fetch', async path => {
    assert.ok(path.endsWith(`/semvi-helpers-${HELPERS_VERSION}-linux-x64.tar.gz`));
    return new Response('not a gzip archive');
  });
  await assert.rejects(installHelpers({...bootstrap, allowUnpinned: true, env, checksums: {'linux-x64': '0'.repeat(64)}}),
    /SHA-256 mismatch/);
  await assert.rejects(stat(env.SEMVI_HELPERS_DIR), {code: 'ENOENT'});
});

test('archive rejects traversal, absolute paths, links and unexpected files', async t => {
  for (const [label, entry] of [
    ['parent directory', ['../intent']],
    ['absolute path', ['/intent']],
    ['ustar path prefix', ['intent', '0', '..']],
    ['symbolic link', ['intent', '2']],
    ['hard link', ['intent', '1']],
    ['unexpected file', ['extra']],
    ['duplicate file', ['prepare']],
  ]) {
    await t.test(label, async sub => {
      const env = await tempInstall(sub);
      mockRelease(sub, archive([entry, ['prepare']]));
      await assert.rejects(installHelpers({...bootstrap, allowUnpinned: true, env}),
        /Unexpected entry in Semvi helper archive/);
      await assert.rejects(stat(env.SEMVI_HELPERS_DIR), {code: 'ENOENT'});
    });
  }
});

test('binDir precedence is explicit, environment, installed helpers, then Cargo', {skip: !supported}, async t => {
  const env = await tempInstall(t, {SEMVI_BIN_DIR: 'environment'});
  assert.equal(resolveBinDir('explicit', env), resolve('explicit'));
  assert.equal(resolveBinDir(undefined, env), resolve('environment'));
  delete env.SEMVI_BIN_DIR;
  assert.equal(resolveBinDir(undefined, env), resolve('target/debug/examples'));

  const bytes = archive(helpers);
  const checksums = {[host]: createHash('sha256').update(bytes).digest('hex')};
  mockRelease(t, bytes, host);
  assert.equal(await installHelpers({allowUnpinned: true, env, checksums: {}}), env.SEMVI_HELPERS_DIR);
  assert.equal(await readFile(join(env.SEMVI_HELPERS_DIR, 'intent'), 'utf8'), 'intent fixture');
  for (const [name] of helpers) {
    assert.ok((await stat(join(env.SEMVI_HELPERS_DIR, name))).mode & 0o100);
  }
  assert.equal(resolveBinDir(undefined, env, checksums), env.SEMVI_HELPERS_DIR);
  assert.equal(resolveBinDir(undefined, env, {[host]: '0'.repeat(64)}), resolve('target/debug/examples'));
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', () => assert.fail('Unexpected download for installed pinned helpers'));
  assert.equal(await installHelpers({env, checksums}), env.SEMVI_HELPERS_DIR);
  env.SEMVI_BIN_DIR = 'environment';
  assert.equal(resolveBinDir(undefined, env, checksums), resolve('environment'));
  assert.equal(resolveBinDir('explicit', env, checksums), resolve('explicit'));
});
