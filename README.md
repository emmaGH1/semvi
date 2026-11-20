# Semvi

**Retry a payment job without paying it twice.** An immutable Tari Ootle vault consumes a business job ID atomically with its payment. A fresh transaction or another relayer cannot pay that job again.

[Open the proof interface](https://emmaGH1.github.io/semvi/) · [Source](https://github.com/emmaGH1/semvi) · [Judge proof map](JUDGES.md)

Built for automation builders recovering from timeouts, lost responses and restarted workers. Transaction replay protection rejects the same transaction; Semvi also rejects a different valid transaction for the same business job.

## Current proof

**Published on Tari mainnet, 20 Nov 2026 at 08:16:21 UTC.** A 100-microTARI payment succeeded. Two fresh sequential transactions were refused with `OperationConsumed`; the last retry used a separate fee account and seal signer. The recipient stayed at 100 microTARI. Both relayer accounts are operated by our demo wallet; this is not an independent-user test. [Mainnet proof and transaction IDs](evidence/2026-11-20/mainnet-proof.json).

**Run 2, recorded live for the demo (10:24 UTC):** the operator console signed job `invoice-2026-1120-0042`, sent it through `semvi-deploy` while withholding the result from the worker, then retried with a fresh transaction from `semvi-relayer-b`. The first send finalized `Accepted`; the retry finalized `OnlyFeeAccepted` with `OperationConsumed`. The recipient went from 100 to 200 microTARI, one payment for one new job. [Receipts and console log](evidence/2026-11-20/live-run).

A real 1,000-microTARI deposit and payer withdrawal also succeeded. Total deployment/test fees: **1.273945 TARI**, funded by a community donation from 0xHRA. The proof page leads with mainnet and can fetch public receipts to compare with the archived run. It relies on the public indexer; it does not independently verify validator consensus proofs.

Separately, nine real Tari 0.54.0 engine tests pass. The five-attempt test pays one job once and refuses four retries. [Raw engine transcript](evidence/2026-11-20/engine-tests.txt) · [Judge proof map](JUDGES.md). No external user adoption or independent security audit is claimed.

## Verify

Prerequisites: Rust with the WASM target; Node 20+. Cargo.lock records resolved dependencies. The template uses library 0.41.0 and engine tooling 0.54.0.

```sh
rustup target add wasm32-unknown-unknown
cargo test --test settlement -- --nocapture
npm test
cargo build --target wasm32-unknown-unknown --release
node scripts/check-live.mjs
```

The tooling compiles and executes the actual WASM contract. Engine tests require no wallet or money. Mainnet read checks are reported separately.

## Use

For payout bots, the [Semvi Node.js package](packages/semvi/README.md) signs, relays and checks jobs through a JavaScript API. Start with the dry-run quickstart or the [example bot](packages/semvi/examples/payout-bot.mjs).

```sh
cargo build --examples
target/debug/examples/intent keygen /secure/payer.key
```

This creates a 0600 key file and prints only its public key. Keep the key outside the repository and back it up securely. Create a vault naming this public key, then fund it after reviewing the source and obtaining a dry-run fee estimate.

Sign a job; replace the uppercase placeholders with your actual values:

```sh
target/debug/examples/intent sign /secure/payer.key \
  mainnet VAULT_COMPONENT JOB_HASH RECIPIENT_COMPONENT AMOUNT_MICRO EXPIRY_EPOCH \
  > intent.json
```

Derive JOB_HASH from a stable business operation ID and persist the `(network, vault, job)` mapping before submission. Generating another ID authorizes another payment. The [CLI guide](web/GUIDE.txt) covers creation, funding, signing, relaying, dry runs, receipts and withdrawal.

The offline `prepare` helper uses Tari's transaction builder and checks that displayed intent fields match encoded arguments. It emits the V2 unsigned envelope required by walletd 0.55; the official V2 schema reuses the V1 body, and walletd supplies the V2 signatures. `scripts/wallet.py` only dry-runs unless explicit submission and network flags are supplied.

The buildless `web/` page reads the live vault straight from Tari's public indexer: its consumed job IDs (the "job card"), balance and template. Anyone can check whether a business reference or job ID was paid. It holds no keys and cannot submit payments.

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory web
```

### Operator console

`console/server.mjs` serves the same page plus a local API that drives your own `tari_ootle_walletd`: sign a job, send it, drop the response, retry with a fresh transaction from another relayer account, then ask the vault what happened. It binds to 127.0.0.1 only and keeps the payer key and wallet cookie in the process. See [console/README.md](console/README.md). `SEMVI_REHEARSE=1` dry-runs every relay.

## Guarantees and limits

- Signed recipient, amount, expiry and job ID; Tari binds the signature to the network, application domain and exact vault component.
- Anyone may relay; funds go to the signed recipient account. Registry insertion and deposit share one atomic main intent. Failed deposits leave the job unconsumed.
- Consumed IDs are permanent. Capacity is **256 jobs per vault**. A full vault refuses new jobs; the payer can still withdraw. New vaults start separate namespaces.
- This is **at-most-once per vault/job**, not guaranteed delivery or end-to-end exactly-once processing. Check the original outcome before changing IDs or vaults.
- Rejected retries can still incur network fees. There is no relayer fee; the submitting wallet sets and pays its network-fee ceiling.
- Amounts, recipient components and job IDs are public. Hash sensitive business references with adequate entropy; no anonymous-payment claim.
- The dedicated payer key controls withdrawal; import it into an authorized wallet to withdraw. There is no administrator who can recover funds if this key is lost.
- Signed intents cannot be individually revoked before expiry. Emptying a vault does not cancel them; refilling before expiry can make them payable again. Epoch deadlines are coarse, not wall-clock seconds.
- Permanent job-list storage grows until the 256-job cap, so execution/storage fees grow with use.
- The recorded OperationConsumed refusals are sequential retries. Concurrent submissions can be rejected earlier by network input locking; that does not establish our refusal reason.

The dedicated payer key was imported into walletd, and a 1,000-microTARI deposit and withdrawal succeeded on mainnet through walletd 0.55. [Withdrawal receipt](evidence/2026-11-20/mainnet-withdraw-dust-receipt.json).

## Originality

Existing entries cover budgets, per-call metering and post-payment reconciliation. A prior Tari Agent Pay gateway advertises hub-side idempotency. Semvi enforces its narrower business-job registry **on chain**, across newly signed transactions from two relayers, so resetting a gateway database cannot erase a paid-job record. No competitor source was incorporated into the product.

MIT licensed. Public Sans is used under its [SIL Open Font License](web/fonts/OFL.txt).
