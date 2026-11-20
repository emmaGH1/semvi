# Semvi for Node.js

Sign a Tari Ootle payout, relay it through walletd, and check its business job ID on chain. The package is ESM for Node 20+ with zero npm dependencies. It uses the repository's Rust `intent` and `prepare` binaries for signing and transaction construction.

## Five-minute quickstart

Have a funded Semvi vault, its payer key, a recipient account component, and a funded relayer account in Tari Ootle walletd 0.55. The [CLI guide](../../web/GUIDE.txt) covers creating and funding a vault. With Node 20+ on Linux or macOS (x64 or arm64), install the package and its prebuilt helpers from your bot's directory.

```sh
npm install /path/to/semvi/packages/semvi
npx semvi-helpers install
```

The installer uses the GitHub release for the helper version embedded in the package. It checks the compressed archive against the package's platform-specific SHA-256 before extracting it. The cache is `~/.cache/semvi/helpers/<version>/<platform>`, or the directory you set in `SEMVI_HELPERS_DIR`. Use a dedicated directory under a writable parent so the installer can place both binaries together. Use a fresh directory or move the old one aside when changing versions. npm install itself runs no helper download.

**Verified downloads.** Helpers v0.1.0 are pinned: the installer checks each archive against the SHA-256 embedded in this package before extracting it, so a changed release file is refused. Keep the installed helpers in a directory writable only by users you trust. [Release and pinning procedure](../../RELEASING.md)

### Build from source instead

On Unix, use Rust if your platform has no compatible release or you prefer local builds. Run these commands from the Semvi checkout, then install the Node package in your bot's directory as above.

```sh
cargo build --locked --examples
export SEMVI_BIN_DIR="$PWD/target/debug/examples"
```

### Sign and dry-run a payout

```js
import {Semvi} from 'semvi';
import {writeFile} from 'node:fs/promises';

const semvi = new Semvi({
  walletd: 'http://127.0.0.1:5100/json_rpc',
  cookieFile: process.env.TARI_WALLET_COOKIE_FILE,
  vault: process.env.SEMVI_VAULT,
  network: 'mainnet',
});

const job = await semvi.sign({
  reference: 'invoice-42',
  recipient: process.env.SEMVI_RECIPIENT,
  amount: 100,
  expiresInEpochs: 4,
  payerKeyFile: process.env.SEMVI_PAYER_KEY,
});

// Save before relaying so a restarted worker can reuse this exact signed intent.
await writeFile('invoice-42.intent.json', JSON.stringify(job), {mode: 0o600, flag: 'wx'});
console.log(await semvi.relay(job, {account: 'relayer-a', maxFee: 10_000, dryRun: true}));
console.log(await semvi.status(job));
```

The dry run estimates the fee with `transactions.submit_dry_run`. To pay, reload that same JSON, use an authorized fee account, and call `relay` with `dryRun: false`. After a timeout, look up the transaction if you have its ID and check `status(job)`. If the outcome is still unresolved and you choose to retry, call `relay(job, {account: 'relayer-b', maxFee: 10_000})` with the same saved job. `paid: false` only means the indexer currently has no consumed entry for that job. The first attempt may still be in flight.

The [example bot](examples/payout-bot.mjs) reads or creates a saved intent and reports ambiguous outcomes. It uses `TARI_WALLET_COOKIE_FILE`, `SEMVI_BIN_DIR`, `SEMVI_VAULT`, `SEMVI_PAYER_KEY`, `SEMVI_RECIPIENT` and `SEMVI_RELAYER`. Run it from the checkout with `node packages/semvi/examples/payout-bot.mjs /secure/invoice-42.json invoice-42`. It defaults to dry run and accepts `--submit` for spending.

## API

| API | Behavior |
| --- | --- |
| `new Semvi({vault, network, walletd, cookieFile, indexer, binDir})` | Defaults to mainnet, its public indexer and loopback walletd. Helper lookup checks `binDir`, `SEMVI_BIN_DIR`, the installed cache for this package's helper version, then `target/debug/examples` relative to the working directory. Set `indexer` explicitly for `localnet` or `esmeralda`. The cookie is needed only for wallet calls. |
| `await jobId(reference)` | Lowercase SHA-256 hex of the UTF-8 bytes of `semvi.job.v1\0` followed by the reference. Reference spelling and Unicode bytes must stay stable across workers and retries. |
| `sign({reference, recipient, amount, expiresInEpochs, payerKeyFile})` | Gets the current epoch from the indexer and invokes Rust `intent sign`. Returns portable `semvi.intent.v1` JSON. Expiry defaults to four epochs. |
| `relay(job, {account, maxFee, dryRun, timeoutMs, pollIntervalMs})` | Checks the network and selected fee account's balance, builds a fresh V2 transaction with Rust `prepare`, then submits and polls. Defaults to live submission and polls every 2 seconds for up to 3 minutes after submission. |
| `submit(job, {account, maxFee, dryRun, onSpec})` / `waitForResult(tx, {timeoutMs, pollIntervalMs})` | Split the live flow if you need the transaction ID immediately. Live `submit` returns `{tx, feeAccount}`. Dry-run `submit` returns the simulation result directly. Keep the live ID to resume polling after a restart. An optional `onSpec(spec)` callback receives the request fields before preparation. |
| `status(job)` | Accepts intent JSON or a 64-digit job ID. Returns `{job, paid, balance, jobsUsed, capacity}` from the vault. The public registry stores consumed IDs, so this lookup cannot recover the payout transaction ID. |
| `vaultState()` / `receipt(tx)` | Read consumed IDs, capacity, and revealed balance, or fetch a public receipt and its SHA-256 as `{raw, sha256}`. These methods trust the configured indexer. |
| `indexerInfo()` / `walletInfo()` / `account(name)` / `accountVaultBalance(address)` | Inspect chain and wallet metadata, a named fee account's address, owner key ID and balance, or the public revealed TARI balance of an account vault known to the wallet. |
| `createIndexer(url)` | Browser-compatible, read-only client also available from `semvi/indexer`, with `network()`, `vault(component)`, `vaultBalance(vaultId)`, `receipt(tx)` and `template(address)`. |

Amounts and fee ceilings are integer microTARI. Pass a safe JavaScript integer, a decimal string, or a `bigint`. Convert public vault balances from `bigint` to decimal strings before JSON serialization.

Final relay results include `{status, tx, reason, fee, walletStatus, dryRun, receipt}`. `paid` means the wallet returned `Accepted`. `already_paid` means `OnlyFeeAccepted` with an `OperationConsumed` rejection. Other final refusals, including input locking and expiry, are `failed`. `fee` is the paid fee when available or the estimated required fee for a dry run. With `dryRun: true`, the statuses describe the simulation. When submission or finalization cannot be confirmed, the package throws `SemviRelayError` with code `SEMVI_RELAY_UNKNOWN` and includes `tx` when known. The package never automatically resubmits.

## Guarantees and limits

- A funded vault can pay a signed job **at most once per vault and job ID**. The signature binds the network, vault, job ID, recipient, amount and expiry. Delivery is not guaranteed.
- A refused retry can still cost your relayer fees. The cap is per transaction. A concurrent retry can fail at network input locking before reaching Semvi.
- Each vault holds at most **256** consumed jobs. Entries are permanent. A fresh vault has a separate job namespace.
- Payout details are public, including amounts, recipients and job IDs. A low-entropy business reference can be guessed from its hash. Keep payer keys and wallet cookies private, and protect signed intents because anyone with one can relay it until it expires.

## Test from the checkout

```sh
npm test
SEMVI_TEST_BIN_DIR=target/debug/examples npm test
npm run test:indexer:live
```

The wallet is mocked using recorded response shapes. The second command exercises the actual native helpers with a throwaway key. The final command reads only the public mainnet indexer.
