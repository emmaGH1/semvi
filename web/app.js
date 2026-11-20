import {inspectIntent} from './intent.js';

const shortHash=value=>`${value.slice(0,8)}…${value.slice(-8)}`;
const receiptUrl=tx=>`https://indexer-a.ootle.tari.com/transaction-receipts/${tx}`;
function selectPanel(){
  const requested=location.hash.slice(1);const name=['proof','inspect','run'].includes(requested)?requested:'proof';
  for(const b of document.querySelectorAll('[data-panel]')){const active=b.dataset.panel===name;b.classList.toggle('selected',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
  for(const panel of document.querySelectorAll('.panel'))panel.hidden=panel.id!==`panel-${name}`;
}
for(const button of document.querySelectorAll('[data-panel]'))button.addEventListener('click',()=>{location.hash=button.dataset.panel;});
window.addEventListener('hashchange',selectPanel);selectPanel();
let mainnet;
try{
  const r=await fetch('mainnet-proof.json');if(!r.ok)throw Error(`HTTP ${r.status}`);mainnet=await r.json();
  document.querySelector('#settled-amount').textContent=`${mainnet.amount_micro} µT`;
  document.querySelector('#mainnet-date').textContent=`Published ${mainnet.published_at.replace('T',' · ').replace('Z',' UTC')} · Tari mainnet`;
  document.querySelector('#balance-before').textContent=`${mainnet.recipient_after_payment_micro} µT`;
  document.querySelector('#balance-after').textContent=`${mainnet.recipient_after_retry_micro} µT`;
  for(const attempt of mainnet.attempts){
    const row=document.createElement('li');row.className=`settlement-attempt ${attempt.outcome==='Paid'?'settled':'declined'}`;
    const step=document.createElement('span');step.className='attempt-number';step.textContent=String(attempt.attempt).padStart(2,'0');
    const body=document.createElement('div');body.className='attempt-body';
    const title=document.createElement('strong');title.textContent=attempt.outcome==='Paid'?'Payment settled':'Retry refused';
    const text=document.createElement('p');text.textContent=attempt.detail;
    const link=document.createElement('a');link.href=receiptUrl(attempt.transaction_id);link.target='_blank';link.rel='noreferrer';link.textContent=shortHash(attempt.transaction_id);link.title=attempt.transaction_id;link.setAttribute('aria-label',`Open public receipt for attempt ${attempt.attempt}`);link.className='transaction-link';
    body.append(title,text,link);const amount=document.createElement('span');amount.className='attempt-amount';amount.textContent=attempt.outcome==='Paid'?`${mainnet.amount_micro} µT`:'0 µT';
    row.append(step,body,amount);document.querySelector('#mainnet-attempts').append(row);
  }
  const fields={Template:mainnet.template,'Payer vault':mainnet.vault,Recipient:mainnet.recipient,'Business job':mainnet.job,'Total deployment/test fees':`${(mainnet.fees_micro/1e6).toFixed(6)} TARI`,'Payer withdrawal':'1,000 µT deposited and withdrawn on mainnet'};
  for(const [label,value] of Object.entries(fields)){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;row.append(dt,dd);document.querySelector('#mainnet-details').append(row);}
  document.querySelector('#proof-loading').hidden=true;document.querySelector('#proof-content').hidden=false;
}catch(e){document.querySelector('#proof-loading').textContent=`Mainnet record could not load: ${e.message}. Reload or open the proof guide above.`;}
try{
  const r=await fetch('proof.json');if(!r.ok)throw Error(`HTTP ${r.status}`);const proof=await r.json();
  const note=document.createElement('p');note.textContent='Recorded Tari 0.54.0 localnet engine test. These are separate from the mainnet transactions above.';document.querySelector('#engine-proof').append(note);
  for(const item of proof.attempts){const row=document.createElement('p');row.className='engine-attempt';const code=document.createElement('code');code.textContent=shortHash(item.transaction_id);code.title=item.transaction_id;row.append(code,document.createTextNode(` · ${item.outcome==='Paid'?'Paid 100 µT':'Refused: OperationConsumed'}`));document.querySelector('#engine-proof').append(row);}
}catch(e){document.querySelector('#engine-proof').textContent=`Engine archive unavailable: ${e.message}. Download the transcript below.`;}
document.querySelector('#verify-receipts').addEventListener('click',async event=>{
  const b=event.currentTarget,s=document.querySelector('#receipt-status');b.disabled=true;s.className='';s.textContent='Fetching finalized receipts from Tari’s public indexer…';
  try{
    if(!mainnet)throw Error('Reload this page to load the archived mainnet record');
    for(const attempt of mainnet.attempts){const r=await fetch(receiptUrl(attempt.transaction_id),{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(`Attempt ${attempt.attempt}: indexer returned HTTP ${r.status}`);const live=await r.json();const bytes=Uint8Array.from(atob(live.receipt),c=>c.charCodeAt(0));const digest=await crypto.subtle.digest('SHA-256',bytes);const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');if(hash!==attempt.receipt_sha256)throw Error(`Attempt ${attempt.attempt}: receipt differs from the archive`);}
    s.textContent=`${mainnet.attempts.length} public receipts match the archived mainnet run · checked ${new Date().toLocaleTimeString()}.`;s.className='verified';
  }catch(e){s.textContent=`Could not verify: ${e.message}. Retry, or open each receipt link directly.`;s.className='error';}finally{b.disabled=false;}
});

document.querySelector('#intent-file').addEventListener('change',async event=>{
  const status=document.querySelector('#inspect-status');const result=document.querySelector('#intent-result');result.hidden=true;status.className='';
  const file=event.target.files[0];if(!file){status.textContent='No intent loaded.';return;}
  try{
    if(file.size>65536)throw Error('The file exceeds 64 KB. Choose the small JSON output from intent sign.');
    const intent=inspectIntent(JSON.parse(await file.text()));
    const labels={network:'Network',job:'Job ID',vault:'Payer vault',recipient:'Recipient',amount_micro:'Amount (µT)',expiry_epoch:'Expiry epoch',payer:'Claimed signer (not verified)'};
    const dl=document.querySelector('#intent-details');dl.replaceChildren();
    for(const [key,value] of Object.entries(intent)){const row=document.createElement('div');const dt=document.createElement('dt');dt.textContent=labels[key];const dd=document.createElement('dd');dd.textContent=value;row.append(dt,dd);dl.append(row);}
    status.textContent='The visible fields match the encoded payment arguments. Signature validity has not been checked.';result.hidden=false;
  }catch(e){status.className='error';status.textContent=e.message;}
});

document.querySelector('#network-check').addEventListener('click',async event=>{
  const b=event.target,s=document.querySelector('#network-status');b.disabled=true;s.textContent='Checking Tari’s public indexer…';
  try{const r=await fetch('https://indexer-a.ootle.tari.com/info',{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(`HTTP ${r.status}`);const j=await r.json();if(j.network!=='mainnet')throw Error(`Expected mainnet, got ${j.network}`);s.textContent=`Mainnet · epoch ${j.current_epoch.toLocaleString()} · checked ${new Date().toLocaleTimeString()}`;}
  catch(e){s.textContent=`Check failed: ${e.message}. You can retry.`;}finally{b.disabled=false;}
});
for(const b of document.querySelectorAll('[data-copy]'))b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);b.textContent='Copied';}catch{b.textContent='Select the command above to copy';}});
