#!/usr/bin/env node
// Semvi operator console: serves the web app plus a local API that drives YOUR Tari wallet daemon.
// Binds to 127.0.0.1 only. Signing keys and the walletd cookie never leave this process.
import http from 'node:http';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as ootle from '../web/lib/ootle.js';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = (k, d) => process.env[k] ?? d;
const cfg = {
  port: Number(env('SEMVI_PORT', 4317)),
  walletd: env('TARI_WALLETD_URL', 'http://127.0.0.1:5100/json_rpc'),
  cookieFile: env('TARI_WALLET_COOKIE_FILE'),
  payerKey: env('SEMVI_PAYER_KEY'),
  vault: env('SEMVI_VAULT'),
  recipient: env('SEMVI_RECIPIENT'),
  relayers: env('SEMVI_RELAYERS', '').split(',').filter(Boolean), // walletd account names
  approved: env('SEMVI_APPROVED_NETWORK'), // must equal the daemon's network before anything is submitted
  maxFee: Number(env('SEMVI_MAX_FEE', 10000)), // microTARI per transaction
  rehearse: env('SEMVI_REHEARSE') === '1', // dry-run every relay: nothing is submitted or spent
  runDir: path.resolve(env('SEMVI_RUN_DIR', path.join(root, '.semvi-runs'))),
  bin: p => path.join(root, 'target/debug/examples', p),
};
for (const k of ['cookieFile', 'payerKey', 'vault', 'recipient']) if (!cfg[k]) { console.error(`Missing config: ${k}. See console/README.md`); process.exit(1); }
if (cfg.relayers.length < 1) { console.error('Set SEMVI_RELAYERS to one or more walletd account names'); process.exit(1); }

async function rpc(method, params = {}) {
  const cookie = (await readFile(cfg.cookieFile, 'utf8')).trim();
  const r = await fetch(cfg.walletd, {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${cookie}`},
    body: JSON.stringify({jsonrpc: '2.0', id: 1, method, params}), signal: AbortSignal.timeout(60000)});
  const j = await r.json();
  if (j.error) throw Error(`walletd ${method}: ${j.error.message}`);
  return j.result;
}

const session = {startedAt: new Date().toISOString(), intents: {}, transactions: [], feesPaid: 0};
const runDir = path.join(cfg.runDir, session.startedAt.replace(/[:.]/g, '-'));
await mkdir(runDir, {recursive: true});
const save = (name, data) => writeFile(path.join(runDir, name), JSON.stringify(data, null, 2) + '\n');
const log = (event, data = {}) => { const e = {at: new Date().toISOString(), event, ...data}; console.log(JSON.stringify(e)); return e; };

async function accounts() {
  const list = await rpc('accounts.list', {offset: 0, limit: 50});
  const out = [];
  for (const name of cfg.relayers) {
    const a = list.accounts.find(x => x.account.name === name)?.account;
    if (!a) throw Error(`walletd has no account named ${name}`);
    const b = await rpc('accounts.get_balances', {account: {Name: name}, refresh: true});
    out.push({name, address: a.component_address, keyId: a.owner_key_id, balance: b.balances.find(x => x.token_symbol === 'TARI')?.balance ?? '0'});
  }
  return out;
}

async function status() {
  const [info, net, vault] = await Promise.all([rpc('wallet.get_info'), ootle.network(), ootle.vault(cfg.vault)]);
  return {walletd: {network: info.network, version: info.version}, indexer: {url: ootle.INDEXER, ...net}, approved: cfg.approved === info.network, rehearse: cfg.rehearse,
    vault: {...vault, balance: String(vault.balance)}, recipient: cfg.recipient, relayers: await accounts(), maxFee: cfg.maxFee,
    session: {intents: Object.keys(session.intents).length, transactions: session.transactions.length, feesPaid: session.feesPaid, runDir}};
}

async function recipientBalance() {
  const b = await rpc('accounts.get_balances', {account: {ComponentAddress: cfg.recipient}, refresh: true}).catch(() => null);
  const vaultId = b?.balances?.find(x => x.token_symbol === 'TARI')?.vault_address;
  if (vaultId) return String(await ootle.vaultBalance(vaultId)); // read from the public indexer, not the wallet's cache
  return null;
}

async function sign({reference, amount}) {
  if (!/^[\w.:\-]{3,80}$/.test(reference ?? '')) throw Error('Use 3–80 letters, digits or . : _ - for the business reference');
  const micro = Number(amount);
  if (!Number.isSafeInteger(micro) || micro <= 0 || micro > 1000) throw Error('Console payouts are limited to 1–1000 microTARI');
  const job = await ootle.jobId(reference);
  const {epoch} = await ootle.network();
  const expiry = epoch + 4;
  const {stdout} = await run(cfg.bin('intent'), ['sign', cfg.payerKey, 'mainnet', cfg.vault, job, cfg.recipient, String(micro), String(expiry)]);
  const intent = JSON.parse(stdout);
  const file = path.join(runDir, `intent-${job.slice(0, 12)}.json`);
  await writeFile(file, stdout);
  session.intents[job] = {reference, file, intent};
  return log('signed', {reference, job, amount: micro, expiry, payer: intent.payer, message: intent.message});
}

function summarize(result) {
  const r = result?.result ?? result;
  const failure = JSON.stringify(r).match(/Template error: (\w+)/)?.[1] ?? null;
  return {status: result.status, reason: failure, fee: r?.fee_receipt?.total_fees_paid ?? r?.total_fees_required ?? null};
}

function summarizeDry(dry) {
  const f = dry?.result?.finalize ?? {};
  const kind = Object.keys(f.result ?? {})[0];
  return {status: kind === 'Accept' ? 'Accepted (dry run)' : `${kind ?? 'Unknown'} (dry run)`, reason: JSON.stringify(f).match(/Template error: (\w+)/)?.[1] ?? null, fee: f.fee_receipt?.total_fees_paid ?? dry.required_fees ?? null};
}

async function relay({job, relayer}) {
  const entry = session.intents[job];
  if (!entry) throw Error('Sign this job in the console first');
  const info = await rpc('wallet.get_info');
  if (!cfg.rehearse && cfg.approved !== info.network) throw Error(`Submission blocked: set SEMVI_APPROVED_NETWORK=${info.network} to approve spending fees on this network`);
  const acct = (await accounts()).find(a => a.name === relayer);
  if (!acct) throw Error(`Unknown relayer ${relayer}`);
  if (BigInt(acct.balance) < BigInt(cfg.maxFee)) throw Error(`${relayer} holds ${acct.balance} µT; it needs at least ${cfg.maxFee} µT to cover the fee ceiling`);
  const {epoch} = await ootle.network();
  const spec = {action: 'execute', network: info.network, current_epoch: String(epoch), fee_account: acct.address, max_fee: String(cfg.maxFee), seal_signer: acct.keyId, intent_file: entry.file, other_signers: []};
  const specFile = path.join(runDir, `spec-${Date.now()}.json`);
  await writeFile(specFile, JSON.stringify(spec, null, 2));
  const {stdout} = await run(cfg.bin('prepare'), [specFile]);
  if (cfg.rehearse) {
    const dry = await rpc('transactions.submit_dry_run', JSON.parse(stdout));
    const record = {tx: dry.transaction_id ?? `dry-run-${Date.now()}`, job, reference: entry.reference, relayer, feeAccount: acct.address, rehearsal: true, ...summarizeDry(dry)};
    session.transactions.push(record);
    log('rehearsed', record);
    return record;
  }
  const submitted = await rpc('transactions.submit', JSON.parse(stdout));
  const tx = submitted.transaction_id;
  const record = {tx, job, reference: entry.reference, relayer, feeAccount: acct.address, submittedAt: new Date().toISOString(), status: 'Pending'};
  session.transactions.push(record);
  log('submitted', record);
  watch(record);
  return record;
}

async function watch(record) {
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const res = await rpc('transactions.get_result', {transaction_id: record.tx}).catch(() => null);
    if (res && res.status && res.status !== 'Pending' && res.status !== 'New') {
      Object.assign(record, summarize(res), {finalizedAt: new Date().toISOString()});
      session.feesPaid += Number(record.fee ?? 0);
      await save(`receipt-${record.tx}.json`, res);
      await save('session.json', session);
      log('finalized', record);
      return;
    }
  }
  record.status = 'Unknown (not finalized after 3 minutes)';
}

async function outcome(job) {
  const vault = await ootle.vault(cfg.vault);
  return {job, consumed: vault.jobs.includes(job), jobsUsed: vault.jobs.length, vaultBalance: String(vault.balance),
    recipientBalance: await recipientBalance(), transactions: session.transactions.filter(t => t.job === job)};
}

const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.ttf': 'font/ttf'};
const body = req => new Promise((ok, no) => { let s = ''; req.on('data', c => { s += c; if (s.length > 1e5) no(Error('Body too large')); }); req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { no(e); } }); });

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const send = (code, data) => { res.writeHead(code, {'Content-Type': 'application/json'}); res.end(JSON.stringify(data)); };
  try {
    if (url.pathname.startsWith('/api/')) {
      if (req.headers.origin && req.headers.origin !== `http://127.0.0.1:${cfg.port}` && req.headers.origin !== `http://localhost:${cfg.port}`) return send(403, {error: 'Cross-origin requests are refused'});
      if (url.pathname === '/api/status') return send(200, await status());
      if (req.method !== 'POST') return send(405, {error: 'Use POST'});
      const b = await body(req);
      if (url.pathname === '/api/sign') return send(200, await sign(b));
      if (url.pathname === '/api/relay') return send(200, await relay(b));
      if (url.pathname === '/api/transaction') return send(200, session.transactions.find(t => t.tx === b.tx) ?? {error: 'Unknown transaction'});
      if (url.pathname === '/api/outcome') return send(200, await outcome(b.job));
      return send(404, {error: 'Unknown endpoint'});
    }
    const file = path.join(root, 'web', path.normalize(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(path.join(root, 'web'))) return send(403, {error: 'Forbidden'});
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type': types[path.extname(file)] ?? 'application/octet-stream'}); res.end(data);
  } catch (e) {
    if (e.code === 'ENOENT') return send(404, {error: 'Not found'});
    log('error', {path: url.pathname, message: e.message});
    send(400, {error: e.message});
  }
}).listen(cfg.port, '127.0.0.1', () => log('listening', {url: `http://127.0.0.1:${cfg.port}/#console`, runDir}));
