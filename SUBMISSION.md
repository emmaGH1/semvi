# Draft — not submitted

OnceRail — retry a payment job without paying it twice.

An automation worker can lose its response after a successful payment. Retrying with a new transaction can pay twice. OnceRail puts the business job registry inside a Tari Ootle vault: a job is consumed atomically with its payout, so another relayer or a restarted gateway cannot erase that record.

Proof: nine real engine tests; five different transaction hashes for one job, one 100-microTARI payout and four OperationConsumed refusals. Tests also cover signed fields, expiry, network/component binding, rollback, capacity and withdrawal. Offline CLI signs intents and prepares wallet requests; browser tool displays actual proof and checks encoded payment details locally.

- Public code: PENDING AUTHORIZED PUBLICATION
- MVP link: PENDING AUTHORIZED PUBLICATION
- Approved-platform social announcement: PENDING USER REVIEW
- Tari L1 payout address: PENDING — this differs from the Ootle L2 deployment address

Limits: at-most-once per vault/job, 256 permanent IDs, public payment details, network fees on refusals possible. No guaranteed delivery, adoption or independent audit claim. Built with AI assistance under the entrant's direction. MIT licensed.

## Bonus post
PENDING MAINNET PUBLICATION AND REAL RUN. Never present engine hashes as mainnet proof. Include original entry, real template/component, publish transaction, timestamp, ready tool and archived receipt. Organizers determine eligibility and ranking.

## Proposed fee-funding request — not posted
I'm building OnceRail for the November Tari MVP contest: a contract-enforced job registry preventing duplicate payouts when an agent retries after a timeout. The core is tested in the real Ootle engine. I have no mainnet TARI yet for publication and the demo run. Would anyone contribute a small amount of Ootle TARI for deployment fees? I will record what is used and return unused funds when the donor provides a return address.

Ootle MAINNET address:
otl_1zpv4ag4gfpxuh9tma4vfjxd2erw47rfkxan2aj8f4jxh8h4k79t557ch08wauex4hhqkftmgt2qng4h676623yph06cfgucmktjqy7gtjpfde

This is L2 Ootle. Do not send L1 Minotari XTM directly here.
