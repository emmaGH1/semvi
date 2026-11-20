import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const checks = [];
async function check(name, run) {
  try { await run(); checks.push(true); console.log(`PASS ${name}`); }
  catch (e) { checks.push(false); console.error(`FAIL ${name}: ${e.message}`); }
}
await check('Official indexer reports mainnet', async () => {
  const r = await fetch('https://indexer-a.ootle.tari.com/info', { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw Error(`HTTP ${r.status}`);
  const j = await r.json();
  if (j.network !== 'mainnet') throw Error(`Wrong network: ${j.network}`);
});
await check('Mainnet consensus epoch available', async () => {
  const r = await fetch('https://indexer-a.ootle.tari.com/epoch-manager/stats', { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw Error(`HTTP ${r.status}`);
  const j = await r.json();
  if (!Number.isSafeInteger(j.current_epoch) || j.current_epoch <= 0) throw Error('Missing epoch');
});
await check('Compiled contract is a WASM binary', async () => {
  const b = await readFile('target/wasm32-unknown-unknown/release/oncerail.wasm');
  if (b.subarray(0,4).toString('hex') !== '0061736d') throw Error('Invalid WASM');
});
await check('Recorded engine proof matches current contract and test sources', async()=>{
  const m=JSON.parse(await readFile('evidence/2026-11-20/engine-manifest.json','utf8'));
  if(m.tests_passed!==9)throw Error('Expected nine passing engine tests');
  for(const [path,expected] of Object.entries(m.hashes)){
    const actual=createHash('sha256').update(await readFile(path)).digest('hex');
    if(actual!==expected)throw Error(`Evidence is stale for ${path}; rerun real tests`);
  }
  const proof=JSON.parse(await readFile('web/proof.json','utf8'));
  if(new Set(proof.attempts.map(x=>x.transaction_id)).size!==5)throw Error('Expected five different engine transaction IDs');
  if(proof.mainnet_deployed!==false)throw Error('Unverified mainnet claim');
});
console.log(`${checks.filter(Boolean).length} of ${checks.length} passed`);
console.log('Mainnet reads and recorded local engine proof verified. Mainnet settlement is not yet claimed.');
process.exitCode = checks.every(Boolean) ? 0 : 1;
