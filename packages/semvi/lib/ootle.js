// Live reads from Tari's public Ootle indexer. No keys, no wallet, read-only.
import {decodeCbor, hex} from './cbor.js';

export const INDEXER = 'https://indexer-a.ootle.tari.com';
export const MAX_JOBS = 256;
export const explorerTx = tx => `https://explorer.tari.mw/tx/${tx}`;

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export function createIndexer(url = INDEXER) {
  const base = url.replace(/\/+$/, '');
  const receiptUrl = tx => `${base}/transaction-receipts/${encodeURIComponent(tx)}`;

  async function get(path) {
    const r = await fetch(base + path, {signal: AbortSignal.timeout(15000)});
    if (!r.ok) throw Error(`Tari indexer returned HTTP ${r.status} for ${path}`);
    return r.json();
  }

  async function substate(id) {
    const j = await get(`/substates/${encodeURIComponent(id)}`);
    const raw = j?.state?.up?.substate;
    if (!raw) throw Error(`${id} is not a live substate on this network`);
    return {value: decodeCbor(b64(raw)), version: j.version, verified: j.verified === true, anchorEpoch: j.proof?.anchor?.epoch};
  }

  async function network() {
    const [info, stats] = await Promise.all([get('/info'), get('/epoch-manager/stats')]);
    return {network: info.network, version: info.version ?? info.indexer_version, epoch: stats.current_epoch};
  }

  async function template(address) {
    return get(`/templates/catalogue/${encodeURIComponent(address)}`);
  }

  // Component state is [payer, vault ref, consumed job IDs] (see src/lib.rs).
  async function vault(component) {
    const s = await substate(component);
    const [header, [state]] = s.value[1][0];
    const [payer, fundsRef, consumed] = state;
    const vaultId = 'vault_' + hex(fundsRef.value);
    const balance = await vaultBalance(vaultId);
    return {
      component, template: hex(header[0]), payer: hex(payer), vaultId,
      balance, jobs: consumed.map(hex), jobsUsed: consumed.length, capacity: MAX_JOBS,
      version: s.version, verified: s.verified, anchorEpoch: s.anchorEpoch,
    };
  }

  async function vaultBalance(vaultId) {
    const amount = findAmount((await substate(vaultId)).value);
    if (amount === null) throw Error(`Could not decode the balance of ${vaultId}`);
    return amount;
  }

  async function receipt(tx) {
    const raw = await get(`/transaction-receipts/${encodeURIComponent(tx)}`);
    const digest = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', b64(raw.receipt))));
    return {raw, sha256: digest};
  }

  return {url: base, network, template, vault, vaultBalance, receipt, receiptUrl};
}

// Find the tagged resource address followed by its revealed amount in the vault.
function findAmount(value) {
  if (!Array.isArray(value)) return null;
  const [resource, amount] = value;
  if (resource?.tag === 131 && (typeof amount === 'number' || typeof amount === 'bigint')) return BigInt(amount);
  for (const item of value) {
    const nested = findAmount(item);
    if (nested !== null) return nested;
  }
  return null;
}

export async function jobId(reference) {
  if (typeof reference !== 'string') throw TypeError('reference must be a string');
  const data = new TextEncoder().encode('semvi.job.v1\0' + reference);
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', data)));
}

export const {network, template, vault, vaultBalance, receipt, receiptUrl} = createIndexer();
