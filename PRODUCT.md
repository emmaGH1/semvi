# Product
<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Delegated implementation choices under the user's minimal-involvement sprint request: Rust/Ootle contract and CLI; a buildless HTML/CSS/JavaScript proof and intent-inspection interface. Public hosting is pending authorization.

## Users
Automation and agent-payment builders retrying jobs after uncertain network outcomes. Judges inspect the same proof path. No external tester is confirmed.

## Product Purpose
Prevent the same signed business job from paying twice across fresh valid transactions or relayers, within one immutable Tari vault. Show what actually happened and make the tool reproducible.

## Positioning
Business job IDs are consumed on chain; resetting a client or gateway database cannot erase the vault's paid-job registry. Transaction hashes may differ while the business job remains the same.

## Capabilities and Constraints
Domain/network/component-bound intents; atomic payment and job registry; permanent 256-job cap per vault; payer-only withdrawal. Public amounts and recipients. Operator still monitors delivery. No guaranteed delivery or cost-free retries. No mainnet settlement yet.

## Evidence on Hand
Nine real Tari engine tests pass; raw transcript in evidence/2026-11-20/engine-tests.txt. Authenticated mainnet wallet and public API connected. Mainnet publication awaits funding. Never present recorded engine output as a fresh mainnet transaction.
