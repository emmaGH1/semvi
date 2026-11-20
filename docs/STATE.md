# State — 2026-11-20

## Decision
Entered; user selected the duplicate-payment prevention idea, then explicitly approved the shorter name Semvi. User wants minimal involvement and main-prize quality alongside early-launch bonus. No outside tester; deployment wallet has received 500 TARI; mainnet publication, withdrawal and payout/retry are now verified.

## Verified
- Mainnet /info and /epoch-manager/stats HTTP 200; raw evidence saved.
- Downloaded official v0.54.0 binaries and matched published SHA256 f787275998e721509a2bdbd7de1b14f94b0620d76417d44acc0052cfed8876bc.
- Wallet daemon listening only on localhost:5100 with authentication and local cookie; authenticated wallet.get_info returned mainnet/0.54.0. No funds/spending/publication.
- Rust and wasm32-unknown-unknown installed; GitHub authenticated as emmaGH1. Public MIT repository published at https://github.com/emmaGH1/semvi; origin remote configured.
- All 30 November forum posts fetched including pagination; inventory saved in docs/sponsor/thread-520.json.
- Opus critique rejects cancellable timelock and rental escrow as weak overlap; recommends on-chain business idempotency. Search finds Tari Agent Pay with hub-side idempotency, so enforce and prove difference.

## Next action
User approved public MIT GitHub/free Pages publication AND posting the prepared small fee-funding request to the Tari community. Source is public; site https://emmagh1.github.io/semvi/ deployed successfully (GitHub Actions run 44695458426), verified HTTP 200 and five actual recorded engine proof attempts. Forum authentication succeeded through secure credential prompts. The single approved Community funding topic was submitted and returned action=enqueued, success=true, pending_count=1. It awaits moderation and is NOT confirmed publicly visible. Do not submit another copy. Session is stored outside repo; one-use credential files were removed.

Previously authorized: claim one publicly offered free starter gift if available and spend up to 5 TARI of received funds on deployment/test fees, with per-transaction estimates. No fiat purchases or contest/social announcement submission authorized. Semvi rename and verification are complete. Local account semvi-deploy has unchanged keys/address. Funding remains unresolved; fresh read-only check around 07:27 UTC found all three MoonMail gifts claimed. The 2,000-XTM Sapient support post was for named October entrants, not an available new grant.

After funding: estimate publication; publish only with approval; create vault and verify a dust deposit/withdrawal through walletd using the imported payer key before a larger deposit. Then run a real payment and fresh sequential duplicate, archive receipts, update the UI from engine-only to explicitly separated real mainnet proof, and prepare final submission for user approval.

## Build results
- Nine real engine tests pass, including distinct relayers/transactions, field tampering, expiry, component/network scope, downstream rollback, insufficient funds, full registry and withdrawal.
- Six JS intent-file safety tests pass. Native signer/request builder compiled; CLI smoke rejects forged display metadata and produces fresh unsigned transactions.
- Actual WASM compiled. Source-linked engine-manifest.json prevents stale proof being reported by check-live. Four check-live claims pass; none claims mainnet settlement.
- Browser proof, local signed-file inspection and CLI guide ready. Real mainnet read button works. Desktop/mobile screenshots at exactly 1440/390px capture all three panels; no overflow or page errors.
- Independent Opus audit confirmed sequential duplicate refusal comes from the contract, not network locking. Addressed signer-label, dynamic amount rendering, table semantics/headings, source-guide link, offline sample and capture findings. Disclosed no revocation, growing fees and coarse epochs.
- Payer key imported into authenticated walletd; public key/KeyId recorded in evidence. Real mainnet wallet-driven withdrawal remains unproven and is a dust-only acceptance gate.
- Public source and site deployed; evidence/2026-11-20/publication.json records successful deployment and site checks. No fiat expense, forum/social post, contest submission or mainnet spending.

## Friction log
- 00:38 UTC: official /llms.txt advertises both /.well-known/skills/openai-codex/SKILL.md and /claude-code/SKILL.md; both return HTTP 404. Saved llms.txt and checked official versioned code instead.
- 00:40 UTC: docs and crates latest are ahead of mainnet release. Pin versions to checked 0.54.0 release rather than unverified latest.
- Wallet cookie path appends mainnet to base path; use actual created path. Never print cookie.

## Pending human inputs
Funding request awaits moderation, not login access or posting permission. Up to 5 TARI in received funds is authorized for deployment/test fees; no fiat purchases. User asked about self-funding alternatives; official burn guide says XTM→TARI is 1:1 less claim fees but takes about a day on mainnet, threatening the conservative bonus cutoff. A direct purchase of already-on-Ootle TARI would avoid a new burn; no vendor, quote, fiat budget or purchase is approved. Contest/social announcement approval remains reserved for final review.

## Later
Recruit real tester after usable MVP; SDK integration for a real webhook client. No adoption claims until observed.

## Latest funding check
2026-11-20T08:09:53.902907+00:00: User supplied Telegram screenshot: 0xHRA reports sending 500 TARI. Receipt is not yet confirmed: balances and stealth outputs remain empty after completed scans. Backed up encrypted wallet privately, upgraded official checksum-verified walletd to 0.55.0 to match indexer, and rescanned successfully. No funds spent. Need donor transaction ID/explorer link to trace receipt. Approved fee cap remains 5 TARI, regardless of donated amount.

## Funding received
2026-11-20T08:15:46.336977+00:00: Mainnet wallet independently reports 500000000 microTARI (500 TARI). User provided donor explorer link recorded in funding evidence; explorer fetch unavailable and wallet transaction lookup is not a public indexer lookup, so transaction attribution is not independently decoded. Funding blocker is cleared. No fees spent; authorization remains up to 5 TARI for deployment/test fees, estimating each transaction. Proceed with authorized deployment and dust withdrawal acceptance gate.

## Mainnet run completed
2026-11-20T08:21:18.265592+00:00: Published template 84f1d72f8b9e38d104e639de9fcce8d6f71098daa825c56ea0b2772d35f60580. Created vault component_ca0301bc6756c5979099d681f5184872f1f18ec521388c660e2477bbdd82635a. Dust deposit and withdrawal succeeded. Paid 100 microTARI to separate demo recipient; fresh V2 retry from a different seal signer finalized OnlyFeeAccepted with OperationConsumed. Recipient balance remained 100. Total actual fees 1.260400 TARI, under authorized 5 TARI. Walletd 0.55 signs V2 only; prepare now emits the official V2 envelope with unchanged unsigned body. No new contract changes or extra deployment. No contest/social submission performed. Next: complete mainnet proof presentation/demo and reviewable submission pack; obtain L1 payout address and final submission approval.

## Opus review and improvements — 2026-11-20T08:34:28.955698+00:00
User explicitly requested Claude Opus competitive/design review; Opus completed a read-only pass. Top three findings addressed: (1) Mainnet-first website with three linked attempts, balance comparison and live public receipt hash comparison; localnet remains separate. (2) New fresh retry paid by a separate demo fee account/signing key finalized OnlyFeeAccepted/OperationConsumed, recipient unchanged at 100; both accounts remain in our wallet and no independent-operator claim is made. (3) README, PRODUCT and SUBMISSION refreshed with real publication timestamp 08:16:21 UTC (review incorrectly suggested 08:21; corrected against indexer). Actual total fees 1.267380 TARI. Browser checks at 390/768/1440 verify all three receipts live, navigation/back, no overflow/page errors.

Remaining competitive gap: real crash/restart worker integration and a real outside builder trying it. These stay inside chosen journey; no new project started. User asks about multiple entries: no explicit published cap found; Zein has distinct November submissions #7 and #13. This is precedent only; do not assume two bonuses per person. Conservative bonus cutoff Nov21 00:00UTC; main cutoff Dec1 00:00UTC.

User has no L1 prize wallet and asks which announcement platform is best. Recommended YouTube demo for final entry, Bluesky only as a faster option if already used. Created empty encrypted L1 wallet with official verified Minotari console wallet 6.2.0; public receiving address in l1-prize-address.json. Seed/password/data remain private outside repository. Temporary localhost RPC stopped. Secure backup handoff and announcement account still needed before final submission approval. No new social/contest posts.
