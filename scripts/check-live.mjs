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
  const b = await readFile('target/wasm32-unknown-unknown/release/semvi.wasm');
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
await check('Mainnet publication, payment and retry receipts match public indexer', async()=>{
  for(const label of ['publish','payment','retry','separate-relayer']){
    const local=JSON.parse(await readFile(`evidence/2026-11-20/mainnet-${label}-indexer-receipt.json`,'utf8'));
    const archived=JSON.parse(await readFile(`evidence/2026-11-20/mainnet-${label}-receipt.json`,'utf8'));
    const tx=archived.result.transaction_id;
    const r=await fetch(`https://indexer-a.ootle.tari.com/transaction-receipts/${tx}`,{signal:AbortSignal.timeout(15000)});
    if(!r.ok)throw Error(`${label}: HTTP ${r.status}`);
    const live=await r.json();
    if(!live.receipt||live.receipt!==local.receipt)throw Error(`${label}: receipt mismatch`);
    const retry=label==='retry'||label==='separate-relayer';
    if(retry&&(archived.result.status!=='OnlyFeeAccepted'||!JSON.stringify(archived).includes('OperationConsumed')))throw Error('Missing consumed-job refusal');
    if(!retry&&archived.result.status!=='Accepted')throw Error(`${label}: not accepted`);
  }
  const a=JSON.parse(await readFile('evidence/2026-11-20/mainnet-payment-spec.json','utf8'));
  const b=JSON.parse(await readFile('evidence/2026-11-20/mainnet-separate-relayer-spec.json','utf8'));
  if(a.fee_account===b.fee_account||JSON.stringify(a.seal_signer)===JSON.stringify(b.seal_signer))throw Error('Separate relayer must use a different fee account and signer');
  const before=JSON.parse(await readFile('evidence/2026-11-20/mainnet-recipient-before-retry.json','utf8'));
  const after=JSON.parse(await readFile('evidence/2026-11-20/mainnet-recipient-after-retry.json','utf8'));
  if(before.result.balances[0].balance!=='100'||after.result.balances[0].balance!=='100')throw Error('Recipient balance mismatch');
});
console.log(`${checks.filter(Boolean).length} of ${checks.length} passed`);
console.log('Mainnet reads and finalized receipts re-fetched; recorded local engine proof checked separately.');
process.exitCode = checks.every(Boolean) ? 0 : 1;
