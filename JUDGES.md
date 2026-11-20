# Semvi — proof status

At-most-once payouts per vault and business job ID, across different valid transactions. This is not a claim of guaranteed delivery, zero fees on retries, private payouts, or user adoption.

| Claim | Code | Evidence/check | Status |
|---|---|---|---|
| Connect to Tari mainnet | scripts/check-live.mjs | evidence/2026-11-20/info.json and epoch-manager-stats.json; node scripts/check-live.mjs | Verified read-only |
| Build a real Ootle template | src/lib.rs | cargo build --target wasm32-unknown-unknown --release | Compiled |
| Different signed transactions pay the same job once | tests/settlement.rs | cargo test different_transactions_and_relayers -- --nocapture | Verified in real engine |
| Signed fields, expiry, component/network scope enforced | tests/settlement.rs | cargo test | Verified in real engine |
| Failed deposit/insufficient funds roll job registry back | tests/settlement.rs | cargo test | Verified in real engine |
| Payer can withdraw, stranger cannot; full registry preserves old IDs and withdrawal | tests/settlement.rs | cargo test | Verified in real engine |
| Signed-file metadata matches encoded payment arguments | examples/prepare.rs; web/intent.js | evidence/2026-11-20/cli-smoke.json; npm test | Verified offline and browser |
| Mainnet publication, withdrawal, payout and distinct-relayer retry | examples/prepare.rs; scripts/wallet.py | evidence/2026-11-20/mainnet-proof.json; archived receipts; node scripts/check-live.mjs re-fetches public receipts | Verified on mainnet |

## Design boundary
Registry holds up to 256 jobs per vault permanently, with no pruning. Capacity exhaustion blocks new jobs but never owner withdrawal. A fresh vault creates a new namespace: callers must retain their vault/job mapping. New job IDs are new payment authorizations. Expiry stops stale unpaid intents; it does not delete paid IDs.

Anyone can relay an authorized intent; a relayer cannot change its recipient, amount, expiry or job ID. Network transaction fees are separate from the signed payment amount and are borne by the submitting wallet. There is no relayer fee in this MVP.

Refusal reason shown is for sequential retries. Concurrent submissions may be rejected earlier by the network's input locking. Intents cannot be individually revoked before expiry; a drained vault can pay an outstanding intent after refill. Fees grow with the permanent job-list size. A 1,000-microTARI dust deposit and wallet-driven withdrawal succeeded before the payment proof; see mainnet-withdraw-dust-receipt.json.
