# Product
<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Delegated implementation choices under the user's minimal-involvement sprint request: Rust/Ootle contract and CLI; a buildless HTML/CSS/JavaScript proof and intent-inspection interface. Public MIT source and GitHub Pages hosting are live.

## Users
Automation and agent-payment builders retrying jobs after uncertain network outcomes. Judges inspect the same proof path. No external tester is confirmed.

## Product Purpose
Prevent the same signed business job from paying twice across fresh valid transactions or relayers, within one immutable Tari vault. Show what actually happened and make the tool reproducible.

## Positioning
Business job IDs are consumed on chain; resetting a client or gateway database cannot erase the vault's paid-job registry. Transaction hashes may differ while the business job remains the same.

## Capabilities and Constraints
Domain/network/component-bound intents; atomic payment and job registry; permanent 256-job cap per vault; payer-only withdrawal. Public amounts and recipients. Operator still monitors delivery. No guaranteed delivery or cost-free retries. Mainnet publication, withdrawal, payment and sequential retry refusal are verified.

## Evidence on Hand
Nine real Tari engine tests pass; raw transcript in evidence/2026-11-20/engine-tests.txt. Mainnet wallet and public API connected. Mainnet paid 100 microTARI once; two fresh retries were refused, one paid by a separate account. Both accounts are operated by our demo wallet. Public receipt comparison is available in the browser. Engine output stays separate from mainnet evidence.
