# Semvi: Tari November MVP sprint

## North star

User chose Semvi, 2026-11-20: for automation builders who risk duplicate payouts after timeouts, one funded Tari contract executes each signed business job at most once. Journey: fund → sign job → relay → lose response/retry with a different transaction → observe one payout and explicit consumed-job refusal. Done means real engine proof, mainnet publication and run, usable tool, and reviewable submission evidence. No outside user is confirmed.

Cut list: new token, agent chat, custodial gateway, social integrations, dashboards unrelated to this journey, marketing metrics, fictional users, hidden fallback simulation. No budget-policy clone.

## Verified constants (2026-11-20; do not guess)
- Mainnet indexer https://indexer-a.ootle.tari.com; GET /info confirms network mainnet, version 0.54.0.
- Official release v0.54.0, template library 0.41.0, engine test tooling 0.54.0.
- Local authenticated wallet daemon 0.54.0 connects to mainnet; wallet.get_info authenticated successfully. Not funded, no deployment yet.
- Official docs index saved at docs/sponsor/ootle-llms.txt. Both advertised Codex and Claude skill URLs return HTTP 404; use checked official source and docs.
- Conservative bonus cutoff 2026-11-21 00:00 UTC (01:00 WAT); source deadline is ambiguous. Main contest cutoff Dec 1 00:00 UTC.

## Rules and judging
Public OSI code, MVP URL, description, Tari payout address, approved-platform social announcement, forum entry. Bonus requires mainnet publication, timestamp proof, ready submission and bonus post. Council judges theme/usefulness/quality without published numerical weights. November permits substantial reuse with innovation. AI is allowed.

## Don't clone
Existing entries: invoice links, tip splitters, agent allowances, pay-per-call channels, privacy inspectors, fee reconciliation, crowdfunds, ROSCAs, escrow bounties, freelance milestones, timelocks, inheritance, voting, Bluesky payments, file shops. A prior Tari Agent Pay project includes hub-side idempotency; our difference must be contract-enforced business job IDs across fresh transactions and relayers, surviving loss of client/gateway state.

## Invariants
- Claim at-most-once per vault and job ID, not universal exactly-once delivery or guaranteed delivery.
- Sign recipient, amount, expiry and job ID; bind signature to network, component and application domain.
- No ID pruning that lets a consumed job execute again. Bound storage and disclose capacity.
- Move funds and consume job atomically. Refused main intent may still cost network fees.
- Public vault payouts expose amounts/recipients; no invented privacy guarantees.
- Secrets and wallet data live outside repo in /data/workspace/tari-private, never committed or printed.
- No spending, public publishing, contact, posts or submission without explicit user authorization. Prepare concrete outputs first.
- No plan changes without human decision. Update docs/STATE.md with evidence and blockers.

## Implementation ownership
Primary agent owns contract, tool, proof and source. No parallel implementation lanes before 25% green. One Opus idea critique completed; research is read-only. Frontend, when reached, must follow impeccable and sites skills.
