# Semvi — prepared submission, not posted

## November MVP entry draft

**Semvi: retry a payment without paying it twice**

When a payout worker loses a response, it can't tell whether the payment went through. If it retries with a fresh transaction, the supplier gets paid twice: transaction replay protection doesn't stop a *new* transaction for the same job. Semvi is a vault contract on Tari Ootle that pays each signed business job at most once. The job ID is recorded on chain in the same atomic step as the payment, so no retry, relayer or lost database can pay it again.

**Demo video (live on mainnet):** https://youtu.be/wkOu1xMxNpE
**Try it:** https://emmagh1.github.io/semvi/
**Code (MIT):** https://github.com/emmaGH1/semvi

**What's on mainnet**
- Template published 20 Nov 2026, 08:16:21 UTC: https://explorer.tari.mw/tx/da02930aa405cc0af69816f776216e74249e35cf1c226219662514d65ce18032
- Run 1: one job paid 100 µT; two fresh retries (one from a separate fee account) refused with `OperationConsumed`; recipient stayed at 100 µT.
- Run 2, recorded in the video: the console sent a job and withheld the response from the worker, then retried with a fresh transaction from a second relayer. Payment: https://explorer.tari.mw/tx/568fae79b3f70690c1434ce9487dd7c12c6a2cb40c547d4a86995d9cd0c785ab · refused retry: https://explorer.tari.mw/tx/33e8091ed429eafbbfc8ce41e33a25e869f3f3f347254f60ae697bf084d83778
- A deposit and payer withdrawal also succeeded.

**What you can use**
- The site reads the vault live from Tari's public indexer: a 256-slot "job card" of paid job IDs, its balance, and a lookup that tells you whether any business reference was paid.
- An operator console drives your own `tari_ootle_walletd` to sign, send, drop the response, retry and check, with a rehearsal (dry-run) mode.
- A CLI signs jobs and builds wallet requests with Tari's transaction builder. Nine Tari engine tests cover duplicates, tampering, expiry, network/component binding, rollback, capacity and withdrawal.

**Limits:** at most once per vault and job, not guaranteed delivery. 256 permanent job IDs per vault. Amounts, recipients and job IDs are public. A refused retry still pays a small network fee. Signed jobs can't be revoked before expiry. All mainnet runs use accounts in our own demo wallet; no outside users or security audit are claimed.

Built with AI assistance. Community member 0xHRA donated 500 TARI for mainnet fees; 1.27 TARI used so far. Narration uses an AI clone of my voice.

**Payout address (Minotari L1):** 125zkKWHBMVvZWzNTLig4USfD7UJmcMQCqiazwtuoh59JxwfgjA1kzr2xJYt47HoeQqUYdUhk7Dxbk2mGJcijG7gHHF

## First-to-Launch bonus draft

**Semvi is published and running on Ootle mainnet**

November entry: **[insert forum post URL]**

- Template `84f1d72f8b9e38d104e639de9fcce8d6f71098daa825c56ea0b2772d35f60580`, published **2026-11-20 08:16:21 UTC**, epoch 39067: https://explorer.tari.mw/tx/da02930aa405cc0af69816f776216e74249e35cf1c226219662514d65ce18032
- Live vault, read from the public indexer: https://emmagh1.github.io/semvi/
- Live demo on mainnet: https://youtu.be/wkOu1xMxNpE
- Payment, then refused retry from another relayer: https://explorer.tari.mw/tx/568fae79b3f70690c1434ce9487dd7c12c6a2cb40c547d4a86995d9cd0c785ab · https://explorer.tari.mw/tx/33e8091ed429eafbbfc8ce41e33a25e869f3f3f347254f60ae697bf084d83778
- All receipts: https://github.com/emmaGH1/semvi/tree/main/evidence/2026-11-20
- Payout address (Minotari L1): 125zkKWHBMVvZWzNTLig4USfD7UJmcMQCqiazwtuoh59JxwfgjA1kzr2xJYt47HoeQqUYdUhk7Dxbk2mGJcijG7gHHF

Please consider Semvi for First to Launch. Eligibility and ranking are the organizers' call.

## Public announcement

Posted: https://youtu.be/wkOu1xMxNpE (YouTube, @thefacelessmanwonders, public, verified via oEmbed 2026-11-20).

## Before either contest post

- Complete secure handoff of the newly created L1 wallet backup; receiving address is inserted above.
- Prepare/approve/publish the public announcement on YouTube, Bluesky, Reddit or Medium; insert URL.
- Confirm entrant eligibility and approve both exact forum drafts.
- Post the November entry once; insert its URL into the bonus draft, then post the bonus claim once.
- If Discourse queues either post, record moderation status and do not duplicate it.

The earlier fee-funding topic is historical and awaits moderation; it is not a contest entry. Funding is now received. Do not repost the funding request.
