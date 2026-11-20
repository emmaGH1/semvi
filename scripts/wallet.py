#!/usr/bin/env python3
"""Authenticated loopback wallet client. Read/dry-run by default; explicit submit flag required."""
import argparse, base64, json, os, pathlib, sys, urllib.request, urllib.error

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('command', choices=['status', 'publish', 'transaction', 'receipt'])
p.add_argument('--file', help='WASM for publication or wallet request JSON for a transaction')
p.add_argument('--tx', help='Transaction ID for receipt')
p.add_argument('--max-fee', type=int, help='Publication fee ceiling in microTARI')
p.add_argument('--fee-account', default='oncerail-deploy')
p.add_argument('--cookie-file', default=os.environ.get('TARI_WALLET_COOKIE_FILE'))
p.add_argument('--submit', action='store_true', help='ACTUALLY SPEND/SUBMIT; requires explicit human authorization')
p.add_argument('--out', help='Save public response evidence')
a = p.parse_args()
if not a.cookie_file:
    p.error('Set TARI_WALLET_COOKIE_FILE to your daemon local .cookie path')
cookie = pathlib.Path(a.cookie_file).read_text().strip()

if a.command == 'status':
    method, params = 'wallet.get_info', {}
elif a.command == 'receipt':
    if not a.tx: p.error('--tx required')
    method, params = 'transactions.get_result', {'transaction_id': a.tx}
elif a.command == 'publish':
    if not a.file or not a.max_fee or a.max_fee <= 0: p.error('--file and positive --max-fee required')
    method, params = 'transactions.publish_template', {
        'binary': base64.b64encode(pathlib.Path(a.file).read_bytes()).decode(),
        'fee_account': a.fee_account, 'max_fee': a.max_fee,
        'detect_inputs': True, 'dry_run': not a.submit,
    }
else:
    if not a.file: p.error('--file required')
    method = 'transactions.submit' if a.submit else 'transactions.submit_dry_run'
    params = json.loads(pathlib.Path(a.file).read_text())

def rpc(method, params):
    req = urllib.request.Request('http://127.0.0.1:5100/json_rpc',
        data=json.dumps({'jsonrpc':'2.0','id':1,'method':method,'params':params}).encode(),
        headers={'Content-Type':'application/json','Authorization':'Bearer '+cookie})
    with urllib.request.urlopen(req, timeout=60) as r: return json.load(r)

try:
    info = rpc('wallet.get_info', {})
    if 'error' in info: raise RuntimeError(info['error']['message'])
    if a.submit:
        # Explicit network selection avoids accidentally spending on a daemon switched to mainnet.
        if os.environ.get('ONCERAIL_APPROVED_NETWORK') != info['result']['network']:
            p.error('For --submit set ONCERAIL_APPROVED_NETWORK to the daemon network after human approval')
    result = rpc(method, params)
    if a.out: pathlib.Path(a.out).write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result, indent=2))
    if 'error' in result: sys.exit(1)
except (OSError, ValueError, RuntimeError, urllib.error.URLError) as e:
    print(str(e), file=sys.stderr)
    sys.exit(1)
