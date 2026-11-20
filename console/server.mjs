#!/usr/bin/env node
// Semvi operator console: serves the web app plus a local API that drives YOUR Tari wallet daemon.
// Binds to 127.0.0.1 only. Signing keys and the walletd cookie never leave this process.
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Semvi} from '../packages/semvi/index.js';

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
  network: 'mainnet',
  binDir: path.join(root, 'target/debug/examples'),
};
for (const k of ['cookieFile', 'payerKey', 'vault', 'recipient']) if (!cfg[k]) { console.error(`Missing config: ${k}. See console/README.md`); process.exit(1); }
if (cfg.relayers.length < 1) { console.error('Set SEMVI_RELAYERS to one or more walletd account names'); process.exit(1); }

const semvi = new Semvi(cfg);

const session = {startedAt: new Date().toISOString(), intents: Object.create(null), transactions: [], feesPaid: 0};
const runDir = path.join(cfg.runDir, session.startedAt.replace(/[:.]/g, '-'));
await mkdir(runDir, {recursive: true, mode: 0o700});
const save = (name, data) => writeFile(path.join(runDir, name), JSON.stringify(data, null, 2) + '\n', {mode: 0o600});
const log = (event, data = {}) => { const e = {at: new Date().toISOString(), event, ...data}; console.log(JSON.stringify(e)); return e; };

async function status() {
  const [info, indexer, vault, relayers] = await Promise.all([
    semvi.walletInfo(), semvi.indexerInfo(), semvi.vaultState(), Promise.all(cfg.relayers.map(name => semvi.account(name))),
  ]);
  return {walletd: {network: info.network, version: info.version}, indexer,
    approved: cfg.approved === cfg.network && info.network === cfg.network, rehearse: cfg.rehearse,
    vault: {...vault, balance: String(vault.balance)}, recipient: cfg.recipient, relayers, maxFee: cfg.maxFee,
    session: {intents: Object.keys(session.intents).length, transactions: session.transactions.length, feesPaid: session.feesPaid, runDir}};
}

async function sign({reference, amount}) {
  if (!/^[\w.:\-]{3,80}$/.test(reference ?? '')) throw Error('Use 3–80 letters, digits or . : _ - for the business reference');
  const micro = Number(amount);
  if (!Number.isSafeInteger(micro) || micro <= 0 || micro > 1000) throw Error('Console payouts are limited to 1–1000 microTARI');
  const intent = await semvi.sign({reference, recipient: cfg.recipient, amount: micro, payerKeyFile: cfg.payerKey});
  const {job} = intent;
  const file = `intent-${job.slice(0, 12)}.json`;
  await save(file, intent);
  session.intents[job] = {reference, file: path.join(runDir, file), intent};
  return log('signed', {reference, job, amount: micro, expiry: Number(intent.expiry_epoch), payer: intent.payer, message: intent.message});
}

async function relay({job, relayer}) {
  const entry = session.intents[job];
  if (!entry) throw Error('Sign this job in the console first');
  if (!cfg.rehearse && cfg.approved !== cfg.network) {
    throw Error(`Submission blocked: set SEMVI_APPROVED_NETWORK=${cfg.network} to approve spending fees on this network`);
  }
  if (!cfg.relayers.includes(relayer)) throw Error(`Unknown relayer ${relayer}`);

  const result = await semvi.submit(entry.intent, {
    account: relayer, maxFee: cfg.maxFee, dryRun: cfg.rehearse,
    onSpec: spec => save(`spec-${randomUUID()}.json`, {...spec, intent_file: entry.file}),
  });
  const record = {tx: result.tx, job, reference: entry.reference, relayer, feeAccount: result.feeAccount};
  session.transactions.push(record);
  if (cfg.rehearse) {
    Object.assign(record, {rehearsal: true, status: `${result.walletStatus} (dry run)`, reason: result.reason, fee: result.fee});
    log('rehearsed', record);
    return record;
  }
  Object.assign(record, {submittedAt: new Date().toISOString(), status: 'Pending'});
  log('submitted', record);
  void watch(record);
  return record;
}

async function watch(record) {
  try {
    const {walletStatus, reason, fee, receipt} = await semvi.waitForResult(record.tx);
    Object.assign(record, {status: walletStatus, reason, fee, finalizedAt: new Date().toISOString()});
    session.feesPaid += Number(fee ?? 0);
    await save(`receipt-${record.tx}.json`, receipt);
    await save('session.json', session);
    log('finalized', record);
  } catch (error) {
    if (error.code === 'SEMVI_RELAY_UNKNOWN') record.status = 'Unknown (not finalized after 3 minutes)';
    log('watch_error', {tx: record.tx, message: error.message});
  }
}

async function outcome(job) {
  const [settlement, recipient] = await Promise.all([
    semvi.status(job), semvi.accountVaultBalance(cfg.recipient).catch(() => null),
  ]);
  return {job, consumed: settlement.paid, jobsUsed: settlement.jobsUsed, vaultBalance: String(settlement.balance),
    recipientBalance: recipient === null ? null : String(recipient), transactions: session.transactions.filter(t => t.job === job)};
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
