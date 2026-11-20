# Tari integration observations — 2026-11-20

Using mainnet wallet/indexer 0.54.0, template library 0.41.0.

- Official llms.txt advertises Codex and Claude skill URLs that both return 404. The index and tagged source work; no upstream issue has been posted.
- Registry latest versions were ahead of the checked mainnet release. Pinning the engine/release avoids unverified API drift; Cargo.lock records all resolved transitives.
- The template macro rejects direct array ABI arguments. Hash32 supplies a bounded 32-byte job ID through a supported type.
- TemplateSignatureBinding::component signs the actual network/component scope; the engine's domain-separated verifier enforces it. No hand-rolled signature scheme.
- Builder NamedArg is not a wire-serialized argument. The tool converts literal CBOR to InstructionArg JSON and compares the visible fields to those exact bytes.
- Local cookie auth supports automation without disabling authentication. The cookie path appends the selected network to the base path.
- A newly created local account is not yet an on-chain component. The unfunded publication dry-run returned missing-substate, so it cannot be advertised as a fee estimate.
- Read-only mainnet connectivity, local engine proof and mainnet settlement are distinct verification levels throughout the interface.
