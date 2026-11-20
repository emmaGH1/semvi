# State — 2026-11-20

## Decision
Entered; user selected the duplicate-payment prevention idea, then explicitly approved the shorter name Semvi. User wants minimal involvement and main-prize quality alongside early-launch bonus. No outside tester; deployment wallet exists but remains unfunded.

## Verified
- Mainnet /info and /epoch-manager/stats HTTP 200; raw evidence saved.
- Downloaded official v0.54.0 binaries and matched published SHA256 f787275998e721509a2bdbd7de1b14f94b0620d76417d44acc0052cfed8876bc.
- Wallet daemon listening only on localhost:5100 with authentication and local cookie; authenticated wallet.get_info returned mainnet/0.54.0. No funds/spending/publication.
- Rust and wasm32-unknown-unknown installed; GitHub authenticated as emmaGH1. Public MIT repository published at https://github.com/emmaGH1/semvi; origin remote configured.
- All 30 November forum posts fetched including pagination; inventory saved in docs/sponsor/thread-520.json.
- Opus critique rejects cancellable timelock and rental escrow as weak overlap; recommends on-chain business idempotency. Search finds Tari Agent Pay with hub-side idempotency, so enforce and prove difference.

## Next action
User approved public MIT GitHub/free Pages publication AND posting the prepared small fee-funding request to the Tari community. Source is public; site https://emmagh1.github.io/semvi/ deployed successfully (GitHub Actions run 44695458426), verified HTTP 200 and five actual recorded engine proof attempts. Funding request is NOT posted: available forum browser is signed out. Secure login prompt is pending; first request timed out. Do not ask for credentials in chat or imply the post was made.

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
Forum login access through the secure secret prompt is needed to post the already approved fee-funding request. Public source/site and this request are authorized; do not ask again. Up to 5 TARI in received funds is authorized for deployment/test fees; no fiat purchases. Contest/social announcement approval remains reserved for final review.

## Later
Recruit real tester after usable MVP; SDK integration for a real webhook client. No adoption claims until observed.
