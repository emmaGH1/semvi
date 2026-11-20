// Live reads from Tari's public Ootle indexer. No keys, no wallet, read-only.
import {decodeCbor, hex} from './cbor.js';

export const INDEXER = 'https://indexer-a.ootle.tari.com';
export const explorerTx = tx => `https://explorer.tari.mw/tx/${tx}`;
export const receiptUrl = tx => `${INDEXER}/transaction-receipts/${tx}`;

async function get(path) {
  const r = await fetch(INDEXER + path, {signal: AbortSignal.timeout(15000)});
  if (!r.ok) throw Error(`Tari indexer returned HTTP ${r.status} for ${path}`);
  return r.json();
}
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function substate(id) {
  const j = await get(`/substates/${id}`);
  const raw = j?.state?.up?.substate;
  if (!raw) throw Error(`${id} is not a live substate on this network`);
  return {value: decodeCbor(b64(raw)), version: j.version, verified: j.verified === true, anchorEpoch: j.proof?.anchor?.epoch};
}

export async function network() {
  const [info, stats] = await Promise.all([get('/info'), get('/epoch-manager/stats')]);
  return {network: info.network, version: info.version ?? info.indexer_version, epoch: stats.current_epoch};
}

export async function template(address) {
  return get(`/templates/catalogue/${address}`);
}

// Semvi component state is [payer, vault ref, consumed job IDs] (see src/lib.rs).
export async function vault(component) {
  const s = await substate(component);
  const [header, [state]] = s.value[1][0];
  const [payer, fundsRef, consumed] = state;
  const vaultId = 'vault_' + hex(fundsRef.value);
  const funds = await substate(vaultId);
  return {
    component, template: hex(header[0]), payer: hex(payer), vaultId,
    balance: findAmount(funds.value), jobs: consumed.map(hex),
    version: s.version, verified: s.verified, anchorEpoch: s.anchorEpoch,
  };
}

export async function vaultBalance(vaultId) {
  return findAmount((await substate(vaultId)).value);
}

// Ootle vault substate: a resource container whose first element is the tagged resource address
// followed by its revealed amount. Search for that shape instead of trusting fixed offsets.
function findAmount(v) {
  if (Array.isArray(v)) {
    if (v.length >= 2 && v[0] && v[0].tag === 131 && (typeof v[1] === 'number' || typeof v[1] === 'bigint')) return BigInt(v[1]);
    for (const x of v) { const a = findAmount(x); if (a !== null) return a; }
  }
  return null;
}

export async function receipt(tx) {
  const j = await get(`/transaction-receipts/${tx}`);
  const bytes = b64(j.receipt);
  const digest = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
  return {raw: j, sha256: digest};
}

export async function jobId(reference) {
  const data = new TextEncoder().encode('semvi.job.v1\0' + reference);
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', data)));
}
