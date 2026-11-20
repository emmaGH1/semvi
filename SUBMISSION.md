# Semvi — prepared submission, not posted

## November MVP entry draft

**Semvi — retry a payment job without paying it twice.**

When an automation worker loses a payment response, its next transaction can pay again. Semvi puts the business job registry inside a Tari Ootle vault: consuming the signed job ID and paying its recipient are one atomic action. A fresh transaction cannot erase that record.

**Real mainnet proof:** published 20 November 2026 at **08:16:21 UTC**. One job paid 100 microTARI. Two freshly signed sequential retries were refused with `OperationConsumed`, including one paid by a separate relayer account. The recipient stayed at 100 microTARI. Both accounts are managed by our demo wallet; no independent user is claimed. A real deposit and payer withdrawal also succeeded.

- App/proof: https://emmagh1.github.io/semvi/#proof
- Code: https://github.com/emmaGH1/semvi — MIT
- Mainnet evidence: https://github.com/emmaGH1/semvi/blob/main/evidence/2026-11-20/mainnet-proof.json
- Publish transaction: https://explorer.tari.mw/tx/da02930aa405cc0af69816f776216e74249e35cf1c226219662514d65ce18032
- Announcement: **PENDING public URL and final approval**
- Minotari L1/XTM prize address: 125zkKWHBMVvZWzNTLig4USfD7UJmcMQCqiazwtuoh59JxwfgjA1kzr2xJYt47HoeQqUYdUhk7Dxbk2mGJcijG7gHHF — private backup handoff pending

The mainnet-first proof page can fetch public indexer receipts and compare them with the archived run. It also inspects signed intent files locally. The CLI signs intents, prepares V2 wallet requests and dry-runs before submission. Nine real Tari engine tests and six signed-file safety tests cover duplicates, tampering, expiry, network/component binding, rollback, capacity and withdrawal.

This is contract-enforced business idempotency, rather than gateway-side deduplication. It is at-most-once per vault/job, not guaranteed delivery. Each vault holds 256 permanent job IDs. Amounts, recipients and job IDs are public; refused retries cost fees. There is no early intent revocation. No external adoption or independent security audit is claimed.

Built with AI assistance under the entrant’s direction. Community member **0xHRA donated 500 TARI** for deployment/testing; fees used so far: **1.267380 TARI**. Donation does not imply endorsement.

## First-to-Launch bonus draft

**Semvi is published and exercised on Ootle mainnet.**

Original November entry: **PENDING forum post URL**

- Mainnet tool and proof: https://emmagh1.github.io/semvi/#proof
- MIT code: https://github.com/emmaGH1/semvi
- Template: `template_84f1d72f8b9e38d104e639de9fcce8d6f71098daa825c56ea0b2772d35f60580`
- Publication finalized: **2026-11-20 08:16:21 UTC**, epoch **39067**
- Publish: https://explorer.tari.mw/tx/da02930aa405cc0af69816f776216e74249e35cf1c226219662514d65ce18032
- Payment: https://explorer.tari.mw/tx/ef8926b8fd724286fad5071d7507e0b792a4988ce2735fb2c09d06a57e966990
- Separate-fee-account retry: https://explorer.tari.mw/tx/f3544067030be4708bd3ff8011eb2aa7a5007e5eec7a35b3ebcfddde818870cf
- Full deployment/withdrawal/balance receipts: https://github.com/emmaGH1/semvi/tree/main/evidence/2026-11-20
- L1 prize address: 125zkKWHBMVvZWzNTLig4USfD7UJmcMQCqiazwtuoh59JxwfgjA1kzr2xJYt47HoeQqUYdUhk7Dxbk2mGJcijG7gHHF

The mainnet page leads with the actual payout and refusals; the localnet engine run is separately labelled. A new transaction paid by a different relayer account was refused by Semvi’s `OperationConsumed` check, with recipient balance unchanged at 100 microTARI. Both demo accounts are managed by our wallet. Payer withdrawal was tested with dust before the payout.

Please consider Semvi for First to Launch. Eligibility, deadline interpretation and first-20 ranking remain the organizers’ decision.

## Public announcement draft — not posted

I built Semvi for the Tari November MVP contest: an on-chain payment vault that lets automation workers retry a business job without paying twice.

Real Ootle mainnet proof: one payout, fresh transactions refused, recipient paid once. One retry uses a separate fee account. The proof page fetches public receipts; source is MIT.

Demo/proof: https://emmagh1.github.io/semvi/
Code: https://github.com/emmaGH1/semvi

Experimental, public payment details, network fees on retries. At-most-once per vault/job; no guaranteed delivery. Built with AI assistance. Mainnet fees supported by a community donation from 0xHRA.

## Before either contest post

- Complete secure handoff of the newly created L1 wallet backup; receiving address is inserted above.
- Prepare/approve/publish the public announcement on YouTube, Bluesky, Reddit or Medium; insert URL.
- Confirm entrant eligibility and approve both exact forum drafts.
- Post the November entry once; insert its URL into the bonus draft, then post the bonus claim once.
- If Discourse queues either post, record moderation status and do not duplicate it.

The earlier fee-funding topic is historical and awaits moderation; it is not a contest entry. Funding is now received. Do not repost the funding request.
