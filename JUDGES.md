# Semvi: guide for judges

Semvi pays each signed business job **at most once per vault**, even when a worker retries with a brand-new transaction or a different relayer. It does not promise guaranteed delivery, free retries, private payouts or outside users.

Pick the depth you have time for. None of the steps below need a wallet or money.

## 1. Two minutes, in the browser

1. Watch the [two-minute demo](https://youtu.be/wkOu1xMxNpE). It is a live mainnet run: one payment, a lost response, a retry refused on chain.
2. Open the [live page](https://emmaGH1.github.io/semvi/). The **Job card** is read from Tari's public indexer as the page loads: jobs used out of 256, vault balance, template.
3. In **Was this job paid?**, enter `invoice-2026-1120-0042`, the job from the demo. The page hashes it the way the contract does and finds it in the vault: **paid**.
4. Enter any other reference, for example `judge-test-1`. Result: **not paid**. Nothing is stored by us; the answer comes from the vault on chain.
5. Under **On mainnet, one job, many transactions**, click **Re-check receipts on the indexer**. The page fetches every finalized receipt again and compares it with the archived hash. Each ticket also links to the transaction on Veil, an independent Ootle explorer.

## 2. Ten minutes, on your machine, no money

Needs Rust (with `wasm32-unknown-unknown`) and Node 20+.

```sh
git clone https://github.com/emmaGH1/semvi && cd semvi
rustup target add wasm32-unknown-unknown
cargo test --test settlement -- --nocapture   # 9 tests in the real Tari engine
npm test                                      # signed-file and Node package tests
node scripts/check-live.mjs                   # re-reads mainnet and checks 5 claims
```

The engine tests compile the actual WASM contract and run it in Tari's engine. The key one, `different_transactions_and_relayers`, sends five different valid transactions for one job: one pays, four are refused with `OperationConsumed`.

## 3. Try the flow yourself (optional)

To see sign, send, lose the response, retry and check in one screen, run the operator console in rehearsal mode. Every send is a dry run, so nothing is submitted. You need `tari_ootle_walletd` 0.55 and your own vault (the [CLI guide](web/GUIDE.txt) covers creating one; creating one costs a small TARI network fee). See [console/README.md](console/README.md).

For bots, the Node package wraps the same flow as `sign()`, `relay()` and `status()`. Follow the quickstart to install prebuilt helpers on Linux or macOS once the release is available. The example bot is dry-run by default. [Node quickstart](packages/semvi/README.md) · [Example bot](packages/semvi/examples/payout-bot.mjs)

## Where each claim is proven

| Claim | Code | How to check | Status |
|---|---|---|---|
| Connects to Tari mainnet | scripts/check-live.mjs | `node scripts/check-live.mjs` | Verified read-only |
| Real Ootle template | src/lib.rs | `cargo build --target wasm32-unknown-unknown --release` | Compiled |
| Different signed transactions pay one job once | tests/settlement.rs | `cargo test different_transactions_and_relayers -- --nocapture` | Real engine |
| Signed fields, expiry, network and component scope enforced | tests/settlement.rs | `cargo test` | Real engine |
| Failed deposit or empty vault leaves the job unpaid | tests/settlement.rs | `cargo test` | Real engine |
| Payer can withdraw, stranger cannot; a full vault keeps old IDs | tests/settlement.rs | `cargo test` | Real engine |
| Signed-file fields match the encoded payment | examples/prepare.rs, web/intent.js | `npm test` | Offline and browser |
| Node package signs, relays, classifies outcomes | packages/semvi | `npm test` | Mocked walletd + real helpers |
| Mainnet publication, payout and refused retries (two runs) | examples/prepare.rs, console/server.mjs | [mainnet-proof.json](evidence/2026-11-20/mainnet-proof.json), [live run](evidence/2026-11-20/live-run), `check-live` | Verified on mainnet |

## Limits

- 256 job IDs per vault, kept forever. A full vault refuses new jobs; the payer can still withdraw.
- A refused retry still pays its network fee (about 0.002 TARI).
- Amounts, recipients and job IDs are public.
- Signed jobs can't be revoked before expiry; refilling a drained vault can make an unexpired job payable.
- The refusals shown are sequential retries. Concurrent submissions may be stopped earlier by the network's input locking.
- Both mainnet runs used accounts in one demo wallet. No outside users or audit are claimed.
