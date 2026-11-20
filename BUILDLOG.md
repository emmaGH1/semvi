# Semvi build log — 2026-11-20

Originally developed under the working name OnceRail. The user approved Semvi as the final name before any public release or mainnet deployment. Contract identifiers, intent schema and signature domain were renamed together; evidence was regenerated from new real runs rather than editing old transaction output.

07:24–07:28 UTC: Semvi rename completed. All nine real engine tests and six JS tests pass; native signer/preparer and WASM rebuilt. Regenerated CLI smoke, engine manifest, actual proof transactions and all six desktop/mobile captures. Local deployment account name updated without changing keys/address. No funds, public publication or contact performed.

- User entered and selected Semvi after competitor inventory and one Opus critique. Cancellable timelock and rental deposit ideas were rejected for overlap and unresolved disputes.
- Connected to official mainnet, installed checksum-verified 0.54.0 wallet daemon, authenticated locally and created an empty deployment account. No money spent or network publication submitted.
- Advertised official skill URLs returned 404; saved llms.txt and checked tagged source instead of guessing endpoints.
- Built the actual WASM template. Replaced macro-unsupported raw arrays with SDK Hash32; checked actual SDK methods to fix API differences.
- Initial six engine tests passed: distinct retry hashes hit OperationConsumed and exact recipient balance stayed at 100 microTARI.
- Expanded to nine passing engine tests, including other-network signatures, insufficient-funds rollback and registry capacity/withdrawal safety.
- Built offline signer and official-builder request tool. Smoke tests proved fresh unsigned requests differ and tampered visible metadata is rejected.
- Built read-only proof and local intent inspector. Desktop/mobile browser checks passed proof loading, upload, tamper rejection, navigation, live network check and horizontal overflow.
- Mainnet publication dry-run failed because the empty fee-account component does not exist on chain. No reliable fee estimate is claimed; funding and publication authorization remain pending.
- Independent safety/UI audit confirmed the sequential duplicate check is contract-enforced. Fixed unverified-signer labelling, data-driven amounts, mobile table labels and table accessibility; added source guide and recaptured all panels at exact desktop/phone widths. Documented unrevocable signed intents, growing fees, coarse epochs and network-locking distinctions.
- Imported the dedicated payer key into authenticated walletd. A live dust withdrawal still must pass before a larger funded deposit.
- Checked the advertised MoonMail starter gifts read-only: all three 1-TARI gifts were already claimed. No claim attempted. Prepared an unposted community funding request as the next funding option.
