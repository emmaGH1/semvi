# Semvi — chosen by user 2026-11-20

For automation builders who can pay twice after a timeout, Semvi lets them safely relay a signed payment job again, using Tari Ootle to enforce at-most-once settlement per vault/job ID.

## One journey
1. Create a payer-owned vault and fund it with TARI.
2. Sign one intent binding vault/network, job ID, recipient, amount and expiry.
3. Relay the intent and settle a payment.
4. Retry through a fresh transaction from a different relayer.
5. Contract refuses OperationConsumed; recipient is paid once.
6. Verify proof and withdraw unused funds.

## Must have
Real Ootle template; domain/component-bound signature verification; atomic payout/consumed registry; capacity limit without pruning; owner-only withdrawal; CLI/helper and public judge proof page; engine tests; mainnet transaction evidence; open-source source and submission pack.

## Cut
Relayer marketplace/fees, agent platform, complex dashboard, subscriptions, fabricated users, synthetic production activity. No claim of guaranteed delivery; operator still monitors outcome. No database idempotency standing in for on-chain enforcement.

## Riskiest assumption
Signed intents and transfer atomicity work in current real Ootle engine. Hour-one authenticated mainnet wallet and API calls succeeded; next gate is two different transactions, same job, one payout. Funding is unresolved; user has no Tari wallet or funds.

## Clock (start 2026-11-20 00:35 UTC; WAT = UTC+1)
10% 03:55 WAT: scope selected and live URL (URL awaits publishing authorization).
25% 07:26 WAT: contract performs real money step on mainnet.
50% 13:17 WAT: entire journey works at live URL and phone width.
75% 19:09 WAT: freeze, demo, proof and submission complete.
90% 22:39 WAT: submit with explicit authorization.
Deadline conservative Nov 21 01:00 WAT; reserve buffer for deadline ambiguity.

## Ideas evaluated (sponsor/stakes/next-week/real/plain/buildable, each 0–2)
- Semvi: 2/2/1/1/2/2 = 10. Agent-only; recommended by Opus critique. Contract enforcement wedge versus hub-side idempotency.
- SafeSend: 2/2/1/1/2/2 = 10. Dropped: close timelock/claim-link overlap; weak advantage over small test payment.
- Handover rental collateral: 2/2/1/1/2/1 = 9. Dropped: unresolved disputes, close escrow overlap.
- Group-buy all-or-refund: 2/2/1/1/2/2 = 10. Dropped: crowded crowdfunding/ROSCA territory.
- Payment dry-run guard: 1/2/1/2/1/2 = 9. Dropped: Allowance/inspection overlap and weak need for our own contract.

## Build stages
1. Contract and engine tests: two relayers, sequential fresh transactions, exact consumed-job refusal and unchanged duplicate balance; tamper/expiry/scope/rollback/withdrawal checks.
2. Real transaction tool: sign/fund/relay/query, fee estimation and mainnet evidence; ask only for missing funds and explicit spending/publication authorization.
3. Judge path: thin responsive proof interface, real evidence, runnable check-live, demo and submission files. Review final concrete submission before requesting submit approval.
