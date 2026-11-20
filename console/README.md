# Semvi operator console

A local page that drives a real payout and retry through **your** Tari Ootle wallet daemon, so you can watch the contract refuse a duplicate.

```sh
cargo build --examples              # builds the intent signer and transaction preparer
export TARI_WALLET_COOKIE_FILE=/path/to/walletd/mainnet/.cookie
export SEMVI_PAYER_KEY=/secure/payer.key          # from `intent keygen`; never commit it
export SEMVI_VAULT=component_…                    # your Semvi vault
export SEMVI_RECIPIENT=component_…                # account that receives payouts
export SEMVI_RELAYERS=relayer-a,relayer-b         # walletd account names that pay fees
node console/server.mjs                           # http://127.0.0.1:4317/#console
```

Safety switches:

- Nothing is submitted unless `SEMVI_APPROVED_NETWORK` equals the daemon's network (for example `mainnet`).
- `SEMVI_REHEARSE=1` dry-runs every relay through walletd instead of submitting.
- Payouts are capped at 1–1000 µT per job; `SEMVI_MAX_FEE` (default 10000 µT) caps each transaction's fee.
- The server listens on 127.0.0.1, refuses cross-origin API calls, and never sends the key or cookie to the browser.
- Each session writes intents, specs and receipts to `SEMVI_RUN_DIR` (default `.semvi-runs/`, git-ignored).

Step 2's "Drop the response" box makes the page hide the first transaction's result from the worker, the way a timed-out HTTP call would. The server still records it. Step 3 waits until that first send has settled before retrying, so the refusal you see comes from the contract (`OperationConsumed`), not from network input locking.
