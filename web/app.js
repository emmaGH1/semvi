import * as ootle from './lib/ootle.js';

const $ = s => document.querySelector(s);
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) k === 'class' ? n.className = v : k.startsWith('on') ? n.addEventListener(k.slice(2), v) : n.setAttribute(k, v);
  for (const k of kids.flat()) if (k != null) n.append(k);
  return n;
};
const short = (h, a = 6, b = 4) => h.length > a + b + 1 ? `${h.slice(0, a)}…${h.slice(-b)}` : h;
const shortComponent = c => `component_${short(c.replace('component_', ''), 4, 4)}`;
const micro = v => `${Number(v).toLocaleString('en')} µT`;
const link = (href, text, cls = 'mono') => el('a', {href, target: '_blank', rel: 'noreferrer', class: cls}, text);

let record, vaultState;

// ── Network pill ─────────────────────────────────────────
async function refreshNetwork() {
  try {
    const n = await ootle.network();
    $('#net').className = 'net ok';
    $('#net-text').textContent = `Tari ${n.network} · epoch ${n.epoch.toLocaleString('en')}`;
  } catch (e) {
    $('#net').className = 'net bad';
    $('#net-text').textContent = 'Tari indexer unreachable';
  }
}

// ── Job card (live vault) ────────────────────────────────
const knownJobs = new Map(); // job id → {reference, tx}
function holesInto(holes, jobs, fresh = null) {
  holes.replaceChildren();
  for (let i = 0; i < 256; i++) {
    const job = jobs[i];
    const h = el('span', {class: 'hole' + (job ? ' punched' : '') + (job && job === fresh ? ' fresh' : '')});
    if (job) { h.title = `Paid job ${job}`; h.tabIndex = 0; }
    holes.append(h);
  }
  return holes;
}
function drawHoles(jobs, fresh = null) {
  const holes = holesInto($('#holes'), jobs, fresh);
  holes.setAttribute('aria-label', `${jobs.length} of 256 job slots used in this vault, read live from Tari mainnet`);
}
async function refreshVault(fresh) {
  try {
    vaultState = await ootle.vault(record.vault);
    $('#jobs-used').textContent = vaultState.jobs.length;
    $('#vault-balance').textContent = micro(vaultState.balance);
    $('#vault-link').textContent = shortComponent(record.vault);
    $('#vault-link').href = `${ootle.INDEXER}/substates/${record.vault}`;
    drawHoles(vaultState.jobs, fresh);
    ootle.template(vaultState.template).then(t => {
      $('#vault-template').replaceChildren(link(`${ootle.INDEXER}/templates/catalogue/${t.template_address}`, `${t.template_name} · ${short(t.template_address, 4, 4)}`, ''));
    }).catch(() => { $('#vault-template').textContent = short(vaultState.template); });
    return vaultState;
  } catch (e) {
    $('#punch-note').textContent = `Couldn’t read the vault from Tari’s indexer: ${e.message}. Reload to try again.`;
    drawHoles([]);
  }
}

// ── Lookup ───────────────────────────────────────────────
$('#lookup').addEventListener('submit', async ev => {
  ev.preventDefault();
  const q = $('#lookup-input').value.trim();
  const out = $('#lookup-result');
  const btn = ev.submitter;
  btn.classList.add('busy'); btn.disabled = true;
  out.className = 'lookup-result'; out.replaceChildren();
  try {
    const job = /^[0-9a-f]{64}$/i.test(q) ? q.toLowerCase() : await ootle.jobId(q);
    const v = await refreshVault();
    if (!v) throw Error('The vault could not be read');
    const paid = v.jobs.includes(job);
    const known = knownJobs.get(job);
    out.classList.add(paid ? 'paid' : 'unpaid');
    out.append(
      el('span', {class: 'verdict'}, paid ? 'Paid' : 'Not paid'),
      el('div', {},
        el('p', {}, paid ? 'This job ID is punched in the vault. Any new transaction for it will be refused with OperationConsumed.' : 'This vault has never paid this job ID. A valid signed job for it can still pay once.'),
        el('p', {}, 'Job ID ', el('span', {class: 'mono'}, job)),
        known?.tx ? el('p', {}, 'Paid by ', link(ootle.explorerTx(known.tx), short(known.tx, 8, 8)), ' on Veil, an independent Ootle explorer') : null));
  } catch (e) {
    out.className = 'lookup-result error'; out.textContent = `Couldn’t check: ${e.message}.`;
  } finally { btn.classList.remove('busy'); btn.disabled = false; }
});

// ── Mainnet record ───────────────────────────────────────
function ticket(a, amount) {
  const paid = a.outcome === 'Paid';
  return el('li', {class: `ticket ${paid ? 'paid' : 'refused'}`},
    el('span', {class: 'stampmark'}, paid ? 'Paid' : 'Refused'),
    el('span', {class: 't-n'}, `Transaction ${a.attempt}`),
    el('p', {class: 't-what'}, a.title ?? (paid ? 'First send' : 'Fresh retry')),
    el('p', {class: 't-who'}, a.who ?? a.detail),
    paid ? null : el('span', {class: 't-reason'}, a.outcome),
    el('div', {class: 't-foot'}, link(ootle.explorerTx(a.transaction_id), short(a.transaction_id, 8, 6)), el('span', {class: 't-amt'}, paid ? `+${amount} µT` : '0 µT')));
}
function drawLedger() {
  $('#ledger-vault').textContent = shortComponent(record.vault);
  const runs = record.runs ?? [{title: 'First run', when: record.published_at, job: record.job, amount_micro: record.amount_micro, attempts: record.attempts}];
  const box = $('#runs'); box.replaceChildren();
  for (const r of runs) {
    knownJobs.set(r.job, {reference: r.reference, tx: r.attempts.find(a => a.outcome === 'Paid')?.transaction_id});
    box.append(el('div', {class: 'run'},
      el('div', {class: 'run-head'}, el('h3', {}, r.title), el('p', {}, `${r.when} · job ${short(r.job, 8, 6)}${r.reference ? ` · “${r.reference}”` : ''}`)),
      el('ol', {class: 'tickets'}, r.attempts.map(a => ticket(a, r.amount_micro)))));
  }
}
$('#verify').addEventListener('click', async ev => {
  const b = ev.currentTarget, s = $('#verify-status');
  b.classList.add('busy'); b.disabled = true; s.className = ''; s.textContent = 'Fetching receipts from indexer-a.ootle.tari.com…';
  try {
    const all = (record.runs ?? [{attempts: record.attempts}]).flatMap(r => r.attempts);
    for (const a of all) {
      const {sha256} = await ootle.receipt(a.transaction_id);
      if (a.receipt_sha256 && sha256 !== a.receipt_sha256) throw Error(`transaction ${short(a.transaction_id)} differs from the archive`);
    }
    s.className = 'ok'; s.textContent = `All ${all.length} receipts are finalized on Tari mainnet and match the archive · ${new Date().toLocaleTimeString()}`;
  } catch (e) { s.className = 'bad'; s.textContent = `Check failed: ${e.message}`; }
  finally { b.classList.remove('busy'); b.disabled = false; }
});

// ── Operator console (only when served by console/server.mjs) ──
const feed = (who, text, cls = '') => {
  $('#feed').prepend(el('li', {class: cls}, el('span', {class: 'who'}, who), el('time', {}, new Date().toLocaleTimeString('en-GB')), ' ', text));
};
async function api(path, body) {
  const r = await fetch(`/api/${path}`, body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {});
  const j = await r.json();
  if (!r.ok || j.error) throw Error(j.error ?? `HTTP ${r.status}`);
  return j;
}
const kv = rows => el('div', {}, Object.entries(rows).map(([k, v]) => el('div', {class: 'kv'}, el('span', {}, k), el('span', {}, v))));
const dl = rows => el('dl', {}, Object.entries(rows).flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)]));
const enable = (id, on = true) => { $(id).setAttribute('aria-disabled', String(!on)); };

async function initConsole() {
  let st;
  try { st = await api('status'); } catch { return; }
  document.body.classList.add('has-console');
  if (new URLSearchParams(location.search).has('stage')) document.body.classList.add('stage');
  $('#console-offline').hidden = true; $('#console-live').hidden = false;
  $('#console-intro').textContent = 'Running on this machine against your Tari wallet daemon. Every button below makes real calls to Tari mainnet.';
  const [A, B] = [st.relayers[0], st.relayers[1] ?? st.relayers[0]];
  $('#relayer-a').textContent = A.name; $('#relayer-b').textContent = B.name;
  $('#stackbar').append(
    el('span', {class: 'chip'}, el('b', {}, 'walletd'), ` ${st.walletd.version} · ${st.walletd.network}`),
    el('span', {class: 'chip'}, el('b', {}, 'indexer'), ` ${new URL(st.indexer.url).host} · epoch ${st.indexer.epoch}`),
    el('span', {class: 'chip'}, el('b', {}, 'vault'), ` ${shortComponent(st.vault.component)} · ${micro(st.vault.balance)}`),
    ...st.relayers.map(r => el('span', {class: 'chip'}, el('b', {}, r.name), ` ${micro(r.balance)}`)),
    ...(st.approved || st.rehearse ? [] : [el('span', {class: 'chip warn'}, 'Submitting is off: SEMVI_APPROVED_NETWORK not set')]), ...(st.rehearse ? [el('span', {class: 'chip warn'}, 'Rehearsal: dry runs only, nothing is submitted')] : []));
  feed('tari_ootle_walletd', `wallet.get_info → ${st.walletd.network} ${st.walletd.version}`, 'ok');
  feed('indexer-a.ootle.tari.com', `GET /substates/${short(st.vault.component, 14, 4)} → ${st.vault.jobs.length} paid jobs, ${micro(st.vault.balance)}`, 'ok');
  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  $('#ref').value = `invoice-${stamp}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  let job, firstTx, recipientBefore;
  $('#sign-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const b = ev.submitter; b.classList.add('busy'); b.disabled = true;
    try {
      const before = await api('outcome', {job: '0'.repeat(64)});
      recipientBefore = before.recipientBalance;
      const s = await api('sign', {reference: $('#ref').value.trim(), amount: Number($('#amount').value)});
      job = s.job;
      feed('intent sign', `job ${short(job, 10, 6)} · ${s.amount} µT · expires epoch ${s.expiry}`, 'ok');
      $('#sign-out').replaceChildren(el('span', {class: 'big'}, 'Signed'), kv({'Job ID': short(job, 8, 6), Amount: micro(s.amount), Expires: `epoch ${s.expiry}`, Signer: `payer ${short(s.payer, 6, 4)}`}));
      enable('#step-send'); $('#send').disabled = false;
      $('#ref').disabled = true; $('#amount').disabled = true; b.disabled = true;
    } catch (e) { $('#sign-out').textContent = e.message; b.disabled = false; }
    finally { b.classList.remove('busy'); }
  });

  $('#send').addEventListener('click', async ev => {
    const b = ev.currentTarget; b.classList.add('busy'); b.disabled = true;
    const drop = $('#drop').checked;
    const out = $('#send-out'); out.className = 'out pending'; out.replaceChildren(el('span', {class: 'big'}, 'Waiting for a response'));
    try {
      const t = await api('relay', {job, relayer: A.name});
      firstTx = t.tx;
      feed('tari_ootle_walletd', `transactions.submit via ${A.name} → ${short(t.tx, 10, 6)}`, 'ok');
      if (drop) {
        await new Promise(r => setTimeout(r, 2600));
        out.className = 'out lost';
        out.replaceChildren(el('span', {class: 'big'}, 'No response'), el('p', {}, 'The connection dropped before the result came back. The worker doesn’t know if the payment went through.'));
        feed('worker', 'timeout · no result received for this job', 'no');
      } else {
        await waitFor(t.tx, out, A.name);
      }
      enable('#step-retry'); $('#retry').disabled = false;
    } catch (e) { out.className = 'out'; out.textContent = e.message; b.disabled = false; }
    finally { b.classList.remove('busy'); }
  });

  $('#retry').addEventListener('click', async ev => {
    const b = ev.currentTarget; b.classList.add('busy'); b.disabled = true;
    const out = $('#retry-out'); out.className = 'out pending'; out.replaceChildren(el('span', {class: 'big'}, 'Backing off'), el('p', {}, 'The worker waits before retrying. This demo waits until the first send has settled, so the retry tests the contract rather than network input locking.'));
    try {
      for (let i = 0; i < 120; i++) { const f = await api('transaction', {tx: firstTx}); if (f.status && f.status !== 'Pending') break; await new Promise(r => setTimeout(r, 1500)); }
      out.replaceChildren(el('span', {class: 'big'}, 'Submitting a new transaction'));
      const t = await api('relay', {job, relayer: B.name});
      feed('tari_ootle_walletd', `transactions.submit via ${B.name} → ${short(t.tx, 10, 6)} (new hash, same job)`, 'ok');
      await waitFor(t.tx, out, B.name);
      enable('#step-truth'); $('#truth').disabled = false;
    } catch (e) { out.className = 'out'; out.textContent = e.message; b.disabled = false; }
    finally { b.classList.remove('busy'); }
  });

  $('#truth').addEventListener('click', async ev => {
    const b = ev.currentTarget; b.classList.add('busy'); b.disabled = true;
    try {
      const o = await api('outcome', {job});
      feed('indexer-a.ootle.tari.com', `GET /substates/${short(record.vault, 14, 4)} → job ${o.consumed ? 'consumed' : 'not consumed'} · ${o.jobsUsed}/256`, 'ok');
      const first = o.transactions.find(t => t.tx === firstTx);
      const paid = first?.status === 'Accepted';
      $('#truth-out').className = `out ${paid ? 'paid' : ''}`;
      $('#truth-out').replaceChildren(
        el('span', {class: 'big'}, paid ? 'Paid once' : `First transaction: ${first?.status ?? 'unknown'}`),
        el('p', {}, 'The “lost” send ', link(ootle.explorerTx(firstTx), short(firstTx, 6, 4)), ` was ${first?.status ?? 'pending'}. The job is punched on chain.`),
        el('p', {class: 'kv'}, el('span', {}, 'Recipient balance'), el('span', {}, '')),
        el('div', {class: 'balances'}, el('div', {}, el('span', {}, 'Before'), el('strong', {}, micro(recipientBefore))), el('span', {'aria-hidden': 'true'}, '→'), el('div', {}, el('span', {}, 'Now'), el('strong', {}, micro(o.recipientBalance)))));
      const v = await refreshVault(job);
      if (v) $('#truth-out').append(holesInto(el('div', {class: 'minicard', 'aria-label': `${v.jobs.length} of 256 jobs used`}), v.jobs, job));
    } catch (e) { $('#truth-out').textContent = e.message; b.disabled = false; }
    finally { b.classList.remove('busy'); }
  });
}
async function waitFor(tx, out, relayer) {
  for (let i = 0; i < 120; i++) {
    const t = await api('transaction', {tx});
    if (t.status && t.status !== 'Pending') {
      const refused = !t.status.startsWith('Accepted');
      feed('tari_ootle_walletd', `transactions.get_result ${short(tx, 10, 6)} → ${t.status}${t.reason ? ` · ${t.reason}` : ''} · fee ${t.fee} µT`, refused ? 'no' : 'ok');
      out.className = `out ${refused ? 'refused' : 'paid'}`;
      out.replaceChildren(el('span', {class: 'big'}, refused ? `Refused · ${t.reason ?? t.status}` : 'Paid'),
        kv({Transaction: link(ootle.explorerTx(tx), short(tx, 6, 6)), Relayer: relayer, Result: t.status, 'Network fee': micro(t.fee)}));
      return t;
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  throw Error('Not finalized after 3 minutes. Check the explorer before retrying.');
}

// ── Boot ─────────────────────────────────────────────────
refreshNetwork(); setInterval(refreshNetwork, 60000);
try {
  record = await (await fetch('mainnet-proof.json')).json();
  drawLedger();
  await refreshVault();
} catch (e) {
  $('#runs').textContent = `The mainnet record couldn’t load: ${e.message}.`;
}
initConsole();
