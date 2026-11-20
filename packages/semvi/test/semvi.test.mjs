import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {after, before, test} from 'node:test';
import {Semvi, jobId} from 'semvi';
import {jobId as browserJobId} from '../../../web/lib/ootle.js';
import {inspectIntent} from '../../../web/intent.js';

const evidence = new URL('../../../evidence/2026-11-20/', import.meta.url);
const load = async path => JSON.parse(await readFile(new URL(path, evidence), 'utf8'));
const reference = 'invoice-2026-1120-0042';
const hash = '43504c17c4820f11d63c08b7ab7e73c2712327af8a2361fce57a7a575863322c';
const paidTx = '568fae79b3f70690c1434ce9487dd7c12c6a2cb40c547d4a86995d9cd0c785ab';
const refusalTx = '33e8091ed429eafbbfc8ce41e33a25e869f3f3f347254f60ae697bf084d83778';
const [intent, paid, refused, dryPaid, dryRefused, balances, archivedRequest, indexedReceipt] = await Promise.all([
  load('live-run/intent-43504c17c482.json'), load(`live-run/receipt-${paidTx}.json`),
  load(`live-run/receipt-${refusalTx}.json`), load('mainnet-payment-dry-run.json'),
  load('mainnet-retry-dry-run.json'), load('mainnet-recipient-before-retry.json'),
  load('mainnet-payment-request.json'), load(`live-run/indexer-receipt-${paidTx}.json`),
]);
const nativeBinDir = process.env.SEMVI_TEST_BIN_DIR;
const {vault, recipient} = intent;
const epoch = Number(intent.expiry_epoch) - 4;
const relayers = ['relayer-a', 'relayer-b'].map((name, index) => ({
  name, component_address: 'component_' + (index + 1).toString().repeat(64),
  owner_key_id: {Derived: {index, key_branch: 'account'}},
}));
const indexerUrl = 'http://indexer.test';
const walletUrl = 'http://wallet.test/json_rpc';
let temp, binDir, cookieFile, payerKeyFile;

before(async () => {
  temp = await mkdtemp(join(tmpdir(), 'semvi-test-'));
  binDir = nativeBinDir ? resolve(nativeBinDir) : temp;
  payerKeyFile = join(temp, 'payer.key');
  cookieFile = join(temp, 'wallet.cookie');
  await writeFile(cookieFile, 'mock-cookie\n', {mode: 0o600});
  if (nativeBinDir) {
    execFileSync(join(binDir, 'intent'), ['keygen', payerKeyFile], {stdio: 'pipe'});
    return;
  }
  const stubIntent = structuredClone(intent);
  stubIntent.args[4].Literal = '80'; // No real signature needed for the wallet mock.
  await writeFile(payerKeyFile, 'test-only', {mode: 0o600});
  await writeFile(join(binDir, 'intent'), `#!/usr/bin/env node
const assert = require('node:assert/strict');
assert.deepEqual(process.argv.slice(2), ${JSON.stringify([
    'sign', payerKeyFile, intent.network, vault, hash, recipient, intent.amount_micro, intent.expiry_epoch,
  ])});
console.log(${JSON.stringify(JSON.stringify(stubIntent))});
`, {mode: 0o700});
  await writeFile(join(binDir, 'prepare'), `#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const intent = JSON.parse(fs.readFileSync(spec.intent_file, 'utf8'));
assert.equal(spec.action, 'execute');
assert.equal(spec.network, intent.network);
assert.equal(spec.current_epoch, '${epoch}');
assert.equal(spec.max_fee, '10000');
const params = ${JSON.stringify(archivedRequest)};
params.seal_signer = spec.seal_signer;
params.transaction.V2.fee_instructions[0].CallMethod.call.Address = spec.fee_account;
params.transaction.V2.instructions[0].CallMethod.args = intent.args;
const nonce = (BigInt(Date.now()) * 1000000n + process.hrtime.bigint() % 1000000n) | 1n;
console.log(JSON.stringify(params).replace(/"nonce":\\d+/, '"nonce":' + nonce));
`, {mode: 0o700});
});

after(async () => {
  if (temp) await rm(temp, {recursive: true, force: true});
});

const json = data => Response.json(data);
const rawSubstate = hex => json({state: {up: {substate: Buffer.from(hex, 'hex').toString('base64')}},
  version: 2, verified: true, proof: {anchor: {epoch}}});

// Minimal component and vault CBOR in the shapes consumed by the browser's decoder.
function componentState(jobs) {
  return rawSubstate('82008182815820' + 'aa'.repeat(32) + '81835820' + intent.payer +
    'd8815820' + 'bb'.repeat(32) + (jobs.length ? '815820' + jobs[0] : '80'));
}

function mockChain(t, options = {}) {
  const submissions = [];
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, request) => {
    if (url.startsWith(indexerUrl + '/')) {
      assert.equal(request.method ?? 'GET', 'GET');
      switch (new URL(url).pathname) {
        case '/info': return json({network: options.indexerNetwork ?? 'mainnet', version: '0.55.0'});
        case '/epoch-manager/stats': return json({current_epoch: epoch});
        case `/substates/${vault}`: return componentState(options.jobs ?? []);
        case '/substates/vault_' + 'bb'.repeat(32): return rawSubstate('82d8835820' + '01'.repeat(32) + '190320');
        case `/transaction-receipts/${paidTx}`: return json(indexedReceipt);
        default: assert.fail(`Unexpected indexer URL ${url}`);
      }
    }
    assert.equal(url, walletUrl);
    assert.equal(request.headers.Authorization, 'Bearer mock-cookie');
    const {method, params} = JSON.parse(request.body);
    calls.push(method);
    switch (method) {
      case 'wallet.get_info':
        return json({result: {network: options.walletNetwork ?? 'mainnet', version: '0.55.0'}});
      case 'accounts.get': {
        const account = relayers.find(a => a.name === params.name_or_address.Name);
        assert.ok(account);
        return json({result: {account}});
      }
      case 'accounts.get_balances': {
        assert.equal(params.refresh, true);
        const [tari] = balances.result.balances;
        return json({result: {balances: [
          {...tari, resource_address: 'resource_' + '00'.repeat(32), balance: '999999'},
          {...tari, balance: options.balance ?? '50000'},
        ]}});
      }
      case 'transactions.submit':
      case 'transactions.submit_dry_run':
        submissions.push({method, params, nonce: request.body.match(/"nonce":\s*(\d+)/)?.[1]});
        return options.submit(method, submissions.length);
      case 'transactions.get_result':
        return json({result: options.result(params.transaction_id)});
      default: assert.fail(`Unexpected walletd method ${method}`);
    }
  });
  return {calls, submissions, semvi: new Semvi({walletd: walletUrl, indexer: indexerUrl, vault, cookieFile, binDir})};
}

const sign = semvi => semvi.sign({reference, recipient, amount: intent.amount_micro, payerKeyFile});
const opts = {account: relayers[0].name, maxFee: 10_000, timeoutMs: 500, pollIntervalMs: 5};

test('CLI, package and browser derive the same domain-separated job ID', async () => {
  assert.equal(await jobId(reference), hash);
  assert.equal(await browserJobId(reference), hash);
  const cli = new URL('../../../scripts/job-id.mjs', import.meta.url);
  assert.equal(execFileSync(process.execPath, [cli.pathname, reference], {encoding: 'utf8'}).trim(), hash);
  assert.notEqual(await jobId('é'), await jobId('e\u0301'));
});

test('signs a portable intent and relays a payment after a pending result', async t => {
  let polls = 0;
  const {semvi, submissions} = mockChain(t, {
    submit: () => json({result: {transaction_id: paidTx}}),
    result: tx => ++polls === 1 ? {transaction_id: tx, status: 'Pending', result: null} : paid,
  });
  const job = await sign(semvi);
  assert.deepEqual({...inspectIntent(job), payer: intent.payer}, inspectIntent(intent));
  if (nativeBinDir) assert.notEqual(job.payer, intent.payer);

  const result = await semvi.relay(JSON.parse(JSON.stringify(job)), opts);
  const [{params, nonce, method}] = submissions;
  assert.equal(method, 'transactions.submit');
  assert.equal(params.transaction.V2.instructions[0].CallMethod.call.Address, vault);
  assert.deepEqual(params.transaction.V2.instructions[0].CallMethod.args, job.args);
  assert.equal(params.transaction.V2.fee_instructions[0].CallMethod.call.Address, relayers[0].component_address);
  assert.deepEqual(params.seal_signer, relayers[0].owner_key_id);
  assert.ok(BigInt(nonce) > BigInt(Number.MAX_SAFE_INTEGER));
  if (!nativeBinDir) assert.notEqual(BigInt(nonce), BigInt(Number(nonce)), 'the builder’s nonce must survive the wire unchanged');
  assert.equal(result.tx, paidTx);
  assert.equal(result.status, 'paid');
  assert.equal(result.fee, 4597);
  assert.equal(polls, 2);
});

test('lost submit response permits a fresh relay of the same job with a different signer', async t => {
  const jobs = [];
  const {semvi, submissions} = mockChain(t, {
    jobs,
    submit: (_, attempt) => {
      if (attempt === 1) {
        jobs.push(hash);
        throw Error('mock connection broken after submission');
      }
      return json({result: {transaction_id: refusalTx}});
    },
    result: () => refused,
  });
  const job = await sign(semvi);
  assert.equal((await semvi.status(job)).paid, false);
  await assert.rejects(semvi.relay(job, opts), {code: 'SEMVI_RELAY_UNKNOWN'});
  assert.equal(submissions.length, 1);

  const retry = await semvi.relay(job, {...opts, account: relayers[1].name});
  assert.equal(retry.status, 'already_paid');
  assert.equal(retry.reason, 'OperationConsumed');
  assert.equal(retry.tx, refusalTx);
  assert.equal(retry.fee, 1968);
  assert.notEqual(submissions[0].nonce, submissions[1].nonce);
  assert.notDeepEqual(submissions[0].params.seal_signer, submissions[1].params.seal_signer);
  const instructions = ({params}) => params.transaction.V2.instructions;
  assert.deepEqual(instructions(submissions[0]), instructions(submissions[1]));
  assert.deepEqual(await semvi.status(job), {job: hash, paid: true, balance: 800n, jobsUsed: 1, capacity: 256});
  assert.deepEqual((await semvi.receipt(paidTx)).raw, indexedReceipt);
});

test('a final refusal such as input locking is failed, even if a log mentions OperationConsumed', async t => {
  const {semvi} = mockChain(t, {
    submit: () => json({result: {transaction_id: refusalTx}}),
    result: () => ({...refused, result: {...refused.result, logs: ['Template error: OperationConsumed'],
      result: {AcceptFeeRejectRest: [{}, {FailedToLockInputs: vault}]}}}),
  });
  const result = await semvi.relay(await sign(semvi), opts);
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'FailedToLockInputs');
});

test('a poll timeout retains the transaction ID for later reconciliation', async t => {
  const {semvi} = mockChain(t, {
    submit: () => json({result: {transaction_id: paidTx}}),
    result: tx => ({transaction_id: tx, status: 'New', result: null}),
  });
  await assert.rejects(semvi.relay(await sign(semvi), {...opts, timeoutMs: 20}),
    {code: 'SEMVI_RELAY_UNKNOWN', tx: paidTx});
});

test('rehearsal only calls submit_dry_run and returns simulated statuses and fee estimates', async t => {
  const {semvi, calls, submissions} = mockChain(t, {
    submit: (method, attempt) => {
      assert.equal(method, 'transactions.submit_dry_run');
      return json(attempt === 1 ? dryPaid : dryRefused);
    },
  });
  const job = await sign(semvi);
  const r1 = await semvi.relay(job, {...opts, dryRun: true});
  const r2 = await semvi.relay(job, {...opts, account: relayers[1].name, dryRun: true});
  assert.deepEqual([r1.status, r1.dryRun, r1.fee], ['paid', true, 5278]);
  assert.deepEqual([r2.status, r2.reason, r2.dryRun, r2.fee], ['already_paid', 'OperationConsumed', true, 1985]);
  assert.equal(calls.includes('transactions.get_result'), false);
  assert.equal(submissions.length, 2);
  assert.equal((await semvi.status(job)).paid, false);
});

test('wrong vault, unapproved wallet network, invalid cap and insufficient TARI stop before submitting', async t => {
  const wrong = mockChain(t, {walletNetwork: 'localnet'});
  const job = await sign(wrong.semvi);
  await assert.rejects(wrong.semvi.relay({...job, vault: recipient}, opts), /does not match/);
  await assert.rejects(wrong.semvi.relay(job, {...opts, maxFee: -1}), /maxFee/);
  assert.deepEqual(wrong.calls, []);
  await assert.rejects(wrong.semvi.relay(job, opts), /Walletd network localnet/);
  assert.deepEqual(wrong.calls, ['wallet.get_info']);

  t.mock.restoreAll();
  const underfunded = mockChain(t, {balance: '9999'});
  await assert.rejects(underfunded.semvi.relay(job, opts), /cover the fee ceiling/);
  assert.deepEqual(underfunded.submissions, []);

  t.mock.restoreAll();
  const mismatched = mockChain(t, {indexerNetwork: 'localnet'});
  await assert.rejects(mismatched.semvi.status(job), /Indexer network localnet/);
  await assert.rejects(mismatched.semvi.relay(job, opts), /Indexer network localnet/);
  assert.deepEqual(mismatched.submissions, []);
});

test('native prepare rejects forged intent display fields before submit', {skip: !nativeBinDir}, async t => {
  const {semvi, submissions} = mockChain(t);
  const job = await sign(semvi);
  await assert.rejects(semvi.relay({...job, amount_micro: '101'}, opts), /display fields do not match/);
  assert.deepEqual(submissions, []);
});
