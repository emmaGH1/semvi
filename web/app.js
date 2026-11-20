import {inspectIntent} from './intent.js';

for(const button of document.querySelectorAll('[data-panel]')) {
  button.addEventListener('click',()=>{
    for(const b of document.querySelectorAll('[data-panel]')) {b.classList.toggle('selected', b===button); b.removeAttribute('aria-current');}
    button.setAttribute('aria-current','page');
    for(const panel of document.querySelectorAll('.panel')) panel.hidden=panel.id!==`panel-${button.dataset.panel}`;
  });
}
try {
  const r=await fetch('proof.json');if(!r.ok)throw Error(`HTTP ${r.status}`);const proof=await r.json();
  document.querySelector('#job-id').textContent=proof.job;
  for(const item of proof.attempts){
    const row=document.createElement('div');row.className='attempt-row';row.setAttribute('role','row');
    const values=[String(item.attempt),item.transaction_id,item.outcome==='Paid'?'Paid':'Already paid',item.amount_micro==='0'?'—':`${item.amount_micro} µT`];
    values.forEach((v,i)=>{const el=document.createElement(i===1?'code':'span');el.textContent=v;el.setAttribute('role','cell');if(i===2)el.className=item.outcome==='Paid'?'paid':'refused';if(i===3)el.className='amount';row.append(el);});
    const details=document.createElement('details');details.setAttribute('role','cell');const summary=document.createElement('summary');summary.textContent='Inspect attempt';details.append(summary);
    const description=document.createElement('p');description.textContent=item.detail+(item.outcome==='Paid'?'':' Contract refusal: OperationConsumed.');const hash=document.createElement('code');hash.textContent=item.transaction_id;details.append(description,hash);row.append(details);document.querySelector('#attempt-rows').append(row);
  }
  document.querySelector('#proof-loading').hidden=true;document.querySelector('#proof-content').hidden=false;
}catch(e){document.querySelector('#proof-loading').textContent=`Evidence could not load: ${e.message}. Reload the page or download the raw transcript from the project.`;}

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
