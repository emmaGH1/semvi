# OnceRail

**Retry a payment job without paying it twice.** An immutable Tari Ootle vault consumes a business job ID atomically with its payment. A fresh transaction or another relayer cannot pay that job again.

Built for automation builders recovering from timeouts, lost responses and restarted workers. Transaction replay protection rejects the same transaction; OnceRail also rejects a different valid transaction for the same business job.

## Current proof

Nine tests pass in the real Tari 0.54.0 engine. One job paid 100 microTARI; four fresh retry transactions were refused with `OperationConsumed`. The recipient stayed at 100 and the vault at 900. [Raw transcript](evidence/2026-11-20/engine-tests.txt) · [Judge proof map](JUDGES.md).

**Mainnet publication and settlement are pending fee funding and authorization.** The browser proof is a recorded localnet engine run, clearly labelled. No external user adoption or security audit is claimed.

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

The offline `prepare` helper uses Tari's transaction builder and checks that displayed intent fields match encoded arguments. `scripts/wallet.py` only dry-runs unless explicit submission and network flags are supplied.

The buildless `web/` interface displays recorded proof, reads mainnet status and inspects signed job files locally. It holds no keys and cannot submit payments.

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory web
```

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

The dedicated payer key has been imported into the local 0.54.0 wallet (public-key evidence saved), but a real wallet-driven mainnet withdrawal is still unproven. The first funded run must test a dust deposit and withdrawal before placing any larger balance in the vault.

## Originality

Existing entries cover budgets, per-call metering and post-payment reconciliation. A prior Tari Agent Pay gateway advertises hub-side idempotency. OnceRail enforces its narrower business-job registry **on chain**, across newly signed transactions from two relayers, so resetting a gateway database cannot erase a paid-job record. No competitor source was incorporated into the product.

MIT licensed. Public Sans is used under its [SIL Open Font License](web/fonts/OFL.txt).
