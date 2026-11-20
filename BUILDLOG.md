# Semvi build log — 2026-11-20

Originally developed under the working name OnceRail. The user approved Semvi as the final name before any public release or mainnet deployment. Contract identifiers, intent schema and signature domain were renamed together; evidence was regenerated from new real runs rather than editing old transaction output.

07:24–07:28 UTC: Semvi rename completed. All nine real engine tests and six JS tests pass; native signer/preparer and WASM rebuilt. Regenerated CLI smoke, engine manifest, actual proof transactions and all six desktop/mobile captures. Local deployment account name updated without changing keys/address. No funds, public publication or contact performed.

07:30 UTC: after explicit user approval, created public emmaGH1/semvi repository, pushed source and enabled free GitHub Pages. Workflow 44695458426 succeeded, including file-safety checks; deployed site and proof JSON verified. Funding post authorized but not posted because forum browser is signed out; secure credential prompt requested. No contest entry submitted or money spent.

Forum authentication later succeeded via secure prompts. Submitted the approved funding topic once; Discourse queued it for moderation (success=true, action=enqueued). No publicly visible topic URL exists yet. One-use credential files removed; session stays outside source control. No contest submission or spending.

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

## Mainnet proof — 20 Nov 2026
Community donation of 500 native TARI received. Official walletd upgraded to checksum-verified 0.55.0 after private encrypted backup. Template published; actual fee 1.239932 TARI. Walletd 0.55 rejected V1 signing without spending; verified official V2 uses the identical unsigned body and updated prepare accordingly. Vault created, 1,000-microTARI deposit and payer withdrawal succeeded, separate recipient account created. A 100-microTARI payout finalized; a fresh V2 transaction from a different seal signer finalized OnlyFeeAccepted with OperationConsumed. Recipient remained at 100 microTARI. Public indexer receipts re-fetched and compared; five live/evidence checks and six file checks pass. Total actual fees: 1.260400 TARI.
