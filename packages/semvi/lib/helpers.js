import {createHash} from 'node:crypto';
import {constants, accessSync, readFileSync, statSync} from 'node:fs';
import {chmod, mkdir, mkdtemp, rename, rm, writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {basename, dirname, join, resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';

export const HELPERS_VERSION = '0.1.0';
const SHA256 = Object.freeze({
  'linux-x64': '76ac7379f51faf494cdf2ce5514c342898527c62b63f6a2cdc7f5666f7b33a04',
  'linux-arm64': '0513e1cd36165aa58b1ffcf59bfe34f0bd56fe2b07fee08ee567177a15ede261',
  'darwin-x64': '08aaf14fb763e7dd69776f2b8eff34ab3d9d5d4f9f1cbe86f8d5c7a0363612c4',
  'darwin-arm64': 'f9f717fc409fae99a49e190e99da84b3c587a8699cabc2f94cda1b469d469b46',
});
const RELEASE = `https://github.com/emmaGH1/semvi/releases/download/helpers-v${HELPERS_VERSION}`;
const HELPERS = ['intent', 'prepare'];
const INSTALL_RECORD = '.semvi-helpers';
const HASH = /^[0-9a-f]{64}$/;
const BLOCK_SIZE = 512;
const MAX_ARCHIVE_SIZE = 32 * 1024 * 1024;

function installDir(platform, env) {
  return resolve(env.SEMVI_HELPERS_DIR || join(homedir(), '.cache', 'semvi', 'helpers', HELPERS_VERSION, platform));
}

function installed(dir, platform, expected) {
  try {
    const [version, target, hash] = readFileSync(join(dir, INSTALL_RECORD), 'utf8').trim().split(' ');
    if (version !== HELPERS_VERSION || target !== platform || !HASH.test(hash) || (expected && hash !== expected)) {
      return false;
    }
    return HELPERS.every(name => {
      const path = join(dir, name);
      accessSync(path, constants.X_OK);
      return statSync(path).isFile();
    });
  } catch {
    return false;
  }
}

export function resolveBinDir(binDir, env = process.env, checksums = SHA256) {
  const override = binDir ?? env.SEMVI_BIN_DIR;
  if (override != null) return resolve(override);
  const platform = `${process.platform}-${process.arch}`;
  if (Object.hasOwn(SHA256, platform)) {
    const dir = installDir(platform, env);
    if (installed(dir, platform, checksums[platform])) return dir;
  }
  return resolve('target/debug/examples');
}

async function download(name, maxBytes) {
  const response = await fetch(`${RELEASE}/${name}`, {signal: AbortSignal.timeout(120_000)});
  if (!response.ok || !response.body) throw Error(`Could not download ${name}: HTTP ${response.status}`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > maxBytes) throw Error(`${name} exceeds the download size limit`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);
}

function unpack(archive) {
  const tar = gunzipSync(archive, {maxOutputLength: 2 * MAX_ARCHIVE_SIZE});
  const files = new Map();
  for (let offset = 0; offset + BLOCK_SIZE <= tar.length;) {
    const header = tar.subarray(offset, offset + BLOCK_SIZE);
    if (header.every(byte => byte === 0)) {
      const end = tar.subarray(offset);
      if (files.size === HELPERS.length && end.length >= 2 * BLOCK_SIZE &&
          end.length % BLOCK_SIZE === 0 && end.every(byte => byte === 0)) return files;
      break;
    }
    const name = header.toString('latin1', 0, 100).replace(/\0+$/, '');
    const type = header[156];
    if (header.toString('latin1', 257, 263) !== 'ustar\0' ||
        header.subarray(157, 257).some(byte => byte !== 0) ||
        header.subarray(345, 500).some(byte => byte !== 0) ||
        (type !== 0 && type !== 48) ||
        !HELPERS.includes(name) || files.has(name)) {
      throw Error('Unexpected entry in Semvi helper archive (expected only regular intent and prepare files)');
    }
    const sizeField = header.toString('latin1', 124, 136).replace(/[\0 ]+$/, '');
    const size = /^[0-7]+$/.test(sizeField) ? Number.parseInt(sizeField, 8) : NaN;
    const start = offset + BLOCK_SIZE;
    offset = start + Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE;
    if (!(size > 0 && offset <= tar.length)) throw Error('Invalid file size in Semvi helper archive');
    files.set(name, tar.subarray(start, start + size));
  }
  throw Error('Incomplete or malformed Semvi helper archive');
}

export async function installHelpers({
  allowUnpinned = false, env = process.env, platform = process.platform, arch = process.arch, checksums = SHA256,
} = {}) {
  const target = `${platform}-${arch}`;
  if (!Object.hasOwn(SHA256, target)) {
    throw Error(`Semvi helpers do not support ${target}. Supported platforms: ${Object.keys(SHA256).join(', ')}.`);
  }

  let expected = checksums[target];
  const name = `semvi-helpers-${HELPERS_VERSION}-${target}.tar.gz`;
  if (!expected) {
    if (!allowUnpinned) {
      throw Error(`No embedded SHA-256 for ${name}. Use --allow-unpinned only if you trust the GitHub release.`);
    }
    const sums = await download('SHA256SUMS', 16 * 1024);
    const matches = sums.toString('utf8').split(/\r?\n/).map(line => line.match(/^([0-9a-f]{64}) [ *](.+)$/))
      .filter(match => match?.[2] === name);
    if (matches.length !== 1) throw Error(`Expected one SHA-256 for ${name} in SHA256SUMS`);
    [, expected] = matches[0];
  }

  const dir = installDir(target, env);
  if (installed(dir, target, expected)) return dir;

  const archive = await download(name, MAX_ARCHIVE_SIZE);
  if (createHash('sha256').update(archive).digest('hex') !== expected) {
    throw Error(`SHA-256 mismatch for ${name}`);
  }
  const files = unpack(archive);
  const parent = dirname(dir);
  await mkdir(parent, {recursive: true});
  const stage = await mkdtemp(join(parent, `.${basename(dir)}-`));
  try {
    for (const [file, bytes] of files) {
      const path = join(stage, file);
      await writeFile(path, bytes, {mode: 0o600});
      await chmod(path, 0o700);
    }
    await writeFile(join(stage, INSTALL_RECORD), `${HELPERS_VERSION} ${target} ${expected}\n`, {mode: 0o600});
    // Publish the complete pair at once. A concurrent install of the same archive can win.
    try {
      await rename(stage, dir);
    } catch (error) {
      if (error.code !== 'EEXIST' && error.code !== 'ENOTEMPTY') throw error;
      if (!installed(dir, target, expected)) {
        throw Error(`Semvi helper directory ${dir} is occupied. Move it aside or set SEMVI_HELPERS_DIR to an empty directory.`);
      }
    }
  } finally {
    await rm(stage, {recursive: true, force: true});
  }
  return dir;
}
