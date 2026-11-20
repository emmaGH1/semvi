import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {Semvi} from 'semvi';

test('mainnet indexer reads the Semvi vault and archived payout receipt', async () => {
  const proof = JSON.parse(await readFile(new URL('../../../web/mainnet-proof.json', import.meta.url), 'utf8'));
  const semvi = new Semvi({vault: proof.vault});
  const paidTx = '568fae79b3f70690c1434ce9487dd7c12c6a2cb40c547d4a86995d9cd0c785ab';
  const archived = JSON.parse(await readFile(new URL(
    `../../../evidence/2026-11-20/live-run/indexer-receipt-${paidTx}.json`, import.meta.url), 'utf8'));
  const [info, vault, receipt] = await Promise.all([semvi.indexerInfo(), semvi.vaultState(), semvi.receipt(paidTx)]);
  assert.equal(info.network, 'mainnet');
  assert.ok(info.epoch > 0);
  assert.equal(vault.capacity, 256);
  assert.equal(vault.jobsUsed, vault.jobs.length);
  assert.ok(vault.jobs.includes('43504c17c4820f11d63c08b7ab7e73c2712327af8a2361fce57a7a575863322c'));
  assert.equal(typeof vault.balance, 'bigint');
  assert.equal(receipt.raw.receipt, archived.receipt);
  assert.match(receipt.sha256, /^[a-f0-9]{64}$/);
});
