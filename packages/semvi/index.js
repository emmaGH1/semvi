import {execFile} from 'node:child_process';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {promisify} from 'node:util';
import {resolveBinDir} from './lib/helpers.js';
import {createIndexer, jobId} from './lib/ootle.js';

export {createIndexer, INDEXER, jobId, MAX_JOBS} from './lib/ootle.js';

const run = promisify(execFile);
const COMPONENT = /^component_[0-9a-f]{64}$/;
const HASH = /^[0-9a-f]{64}$/;
const TARI = 'resource_' + '01'.repeat(32);
const MAX_U64 = (1n << 64n) - 1n;
const RPC_TIMEOUT = 60_000;
const FINAL = new Set(['Accepted', 'OnlyFeeAccepted', 'Rejected', 'InvalidTransaction']);

function uint(value, label, min = 0n) {
  const valid = typeof value === 'bigint' ||
    (typeof value === 'number' && Number.isSafeInteger(value)) ||
    (typeof value === 'string' && /^\d+$/.test(value));
  if (!valid || BigInt(value) < min || BigInt(value) > MAX_U64) {
    throw TypeError(`${label} must be a ${min ? 'positive' : 'non-negative'} u64 integer`);
  }
  return BigInt(value);
}

function timer(value, label) {
  if (!Number.isInteger(value) || value < 1 || value > 2_147_483_647) {
    throw TypeError(`${label} must be a positive millisecond integer within the Node timer range`);
  }
}

function classify({tx, walletStatus, finalize, receipt, dryRun, fee}) {
  const {Reject, AcceptFeeRejectRest} = finalize?.result ?? {};
  const rejection = AcceptFeeRejectRest?.[1] ?? Reject;
  const failure = rejection?.ExecutionFailure;
  const templateError = failure?.code === 'TemplateError' &&
    failure.message?.match(/Template error: (\w+)$/)?.[1];
  const reason = templateError || failure?.message ||
    (typeof rejection === 'string' ? rejection : Object.keys(rejection ?? {})[0]) || null;
  const status = walletStatus === 'Accepted' ? 'paid' :
    walletStatus === 'OnlyFeeAccepted' && templateError === 'OperationConsumed' ? 'already_paid' : 'failed';
  return {status, tx, reason, fee: fee ?? null, walletStatus, dryRun, receipt};
}

export class SemviRelayError extends Error {
  constructor(message, {tx, cause} = {}) {
    super(message, {cause});
    this.name = 'SemviRelayError';
    this.code = 'SEMVI_RELAY_UNKNOWN';
    if (tx) this.tx = tx;
  }
}

export class Semvi {
  #walletd;
  #cookieFile;
  #vault;
  #network;
  #indexer;
  #binDir;

  constructor({
    walletd = 'http://127.0.0.1:5100/json_rpc', cookieFile, vault,
    network = 'mainnet', indexer, binDir,
  } = {}) {
    if (typeof vault !== 'string' || !COMPONENT.test(vault)) throw TypeError('vault must be a component address');
    if (!['mainnet', 'esmeralda', 'localnet'].includes(network)) throw TypeError('Unknown Semvi network');
    if (!indexer && network !== 'mainnet') throw TypeError('Set indexer for this network');
    this.#walletd = walletd;
    this.#cookieFile = cookieFile;
    this.#vault = vault;
    this.#network = network;
    this.#indexer = createIndexer(indexer);
    this.#binDir = resolveBinDir(binDir);
  }

  async #rpc(method, params = {}, timeoutMs = RPC_TIMEOUT) {
    if (!this.#cookieFile) throw Error('Set cookieFile to use walletd');
    const cookie = (await readFile(this.#cookieFile, 'utf8')).trim();
    if (!cookie) throw Error('The walletd cookie file is empty');
    // Preserve the Rust helper's u64 nonce, which JSON.parse would round.
    const encoded = typeof params === 'string' ? params : JSON.stringify(params);
    const response = await fetch(this.#walletd, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${cookie}`},
      body: `{"jsonrpc":"2.0","id":1,"method":${JSON.stringify(method)},"params":${encoded}}`,
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw Error(`walletd ${method}: HTTP ${response.status}`);
    const body = await response.json();
    if (body.error) throw Error(`walletd ${method}: ${body.error.message}`);
    if (body.result == null) throw Error(`walletd ${method}: missing result`);
    return body.result;
  }

  async #runHelper(name, args) {
    try {
      return (await run(join(this.#binDir, name), args, {timeout: 30_000})).stdout;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw Error(`Missing Semvi ${name} helper in ${this.#binDir}. Run npx semvi-helpers install or cargo build --locked --examples. Check binDir or SEMVI_BIN_DIR if set.`);
      }
      const detail = name === 'prepare' && error.stderr?.trim();
      throw Error(`Semvi ${name} helper failed${detail ? `: ${detail}` : ''}`);
    }
  }

  async indexerInfo() {
    const info = await this.#indexer.network();
    if (info.network !== this.#network) {
      throw Error(`Indexer network ${info.network} does not match Semvi network ${this.#network}`);
    }
    uint(info.epoch, 'Indexer epoch');
    return {url: this.#indexer.url, ...info};
  }

  walletInfo() {
    return this.#rpc('wallet.get_info');
  }

  async #tariBalance(account) {
    const {balances} = await this.#rpc('accounts.get_balances', {account, refresh: true});
    return balances.find(entry => entry.resource_address === TARI);
  }

  async account(name) {
    if (typeof name !== 'string' || !name.length) throw TypeError('account must be a walletd account name');
    const account = {Name: name};
    const [response, tari] = await Promise.all([
      this.#rpc('accounts.get', {name_or_address: account}),
      this.#tariBalance(account),
    ]);
    const {component_address: address, owner_key_id: keyId} = response.account;
    if (!COMPONENT.test(address)) throw Error(`Invalid component address for walletd account ${name}`);
    return {name, address, keyId, balance: uint(tari?.balance ?? '0', 'Account balance').toString()};
  }

  async accountVaultBalance(address) {
    if (typeof address !== 'string' || !COMPONENT.test(address)) throw TypeError('address must be a component address');
    const tari = await this.#tariBalance({ComponentAddress: address});
    if (!tari?.vault_address) return null;
    await this.indexerInfo();
    return this.#indexer.vaultBalance(tari.vault_address);
  }

  async sign({reference, recipient, amount, expiresInEpochs = 4, payerKeyFile}) {
    if (typeof reference !== 'string' || !reference.length) throw TypeError('reference must be a non-empty string');
    if (typeof recipient !== 'string' || !COMPONENT.test(recipient)) throw TypeError('recipient must be a component address');
    if (typeof payerKeyFile !== 'string' || !payerKeyFile.length) throw TypeError('payerKeyFile must be a path');
    const micro = uint(amount, 'amount', 1n);
    const lifetime = uint(expiresInEpochs, 'expiresInEpochs', 1n);
    const [job, {epoch}] = await Promise.all([jobId(reference), this.indexerInfo()]);
    const expiry = uint(BigInt(epoch) + lifetime, 'expiry epoch');
    return JSON.parse(await this.#runHelper('intent', [
      'sign', resolve(payerKeyFile), this.#network, this.#vault, job, recipient, String(micro), String(expiry),
    ]));
  }

  #checkScope(job) {
    if (job?.schema !== 'semvi.intent.v1' || job.network !== this.#network || job.vault !== this.#vault) {
      throw Error('Intent schema, network or vault does not match this Semvi client');
    }
    if (typeof job.job !== 'string' || !HASH.test(job.job)) throw TypeError('Invalid intent job ID');
  }

  async #prepare(intent, {epoch, address, keyId, maxFee, onSpec}) {
    const dir = await mkdtemp(join(tmpdir(), 'semvi-relay-'));
    try {
      const intent_file = join(dir, 'intent.json');
      const specFile = join(dir, 'request.json');
      const spec = {
        action: 'execute', network: this.#network, current_epoch: String(epoch), fee_account: address,
        max_fee: String(maxFee), seal_signer: keyId,
      };
      await writeFile(intent_file, intent, {mode: 0o600});
      await writeFile(specFile, JSON.stringify({...spec, intent_file}), {mode: 0o600});
      if (onSpec) await onSpec(spec);
      return await this.#runHelper('prepare', [specFile]);
    } finally {
      await rm(dir, {recursive: true, force: true});
    }
  }

  async submit(job, {account, maxFee, dryRun = false, onSpec}) {
    if (typeof dryRun !== 'boolean') throw TypeError('dryRun must be a boolean');
    if (onSpec !== undefined && typeof onSpec !== 'function') throw TypeError('onSpec must be a function');
    this.#checkScope(job);
    const intent = JSON.stringify(job);
    this.#checkScope(JSON.parse(intent));

    const ceiling = uint(maxFee, 'maxFee', 1n);
    const info = await this.walletInfo();
    if (info.network !== this.#network) {
      throw Error(`Walletd network ${info.network} does not match Semvi network ${this.#network}`);
    }
    const [relayer, {epoch}] = await Promise.all([this.account(account), this.indexerInfo()]);
    if (relayer.keyId == null) throw Error(`Walletd account ${account} has no owner key`);
    if (BigInt(relayer.balance) < ceiling) {
      throw Error(`${account} holds ${relayer.balance} µT; it needs at least ${ceiling} µT to cover the fee ceiling`);
    }
    const params = await this.#prepare(intent, {...relayer, epoch, maxFee: ceiling, onSpec});

    if (dryRun) {
      const receipt = await this.#rpc('transactions.submit_dry_run', params);
      const finalize = receipt.result?.finalize;
      const kind = finalize?.result;
      if (!kind || typeof receipt.transaction_id !== 'string' || !HASH.test(receipt.transaction_id)) {
        throw Error('walletd returned an incomplete dry-run result');
      }
      const walletStatus = kind.Accept ? 'Accepted' : kind.AcceptFeeRejectRest ? 'OnlyFeeAccepted' : 'Rejected';
      return {
        ...classify({tx: receipt.transaction_id, walletStatus, finalize, receipt, dryRun,
          fee: receipt.required_fees ?? finalize?.fee_receipt?.total_fees_paid}),
        feeAccount: relayer.address,
      };
    }

    try {
      const {transaction_id: tx} = await this.#rpc('transactions.submit', params);
      if (typeof tx !== 'string' || !HASH.test(tx)) throw Error('walletd returned no valid transaction ID');
      return {tx, feeAccount: relayer.address};
    } catch (cause) {
      throw new SemviRelayError('Could not confirm submission. Check the job on the indexer before retrying.', {cause});
    }
  }

  async waitForResult(tx, {timeoutMs = 180_000, pollIntervalMs = 2_000} = {}) {
    if (typeof tx !== 'string' || !HASH.test(tx)) throw TypeError('Invalid transaction ID');
    timer(timeoutMs, 'timeoutMs');
    timer(pollIntervalMs, 'pollIntervalMs');
    const deadline = performance.now() + timeoutMs;
    let cause;
    while (performance.now() < deadline) {
      try {
        const receipt = await this.#rpc('transactions.get_result', {transaction_id: tx},
          Math.min(RPC_TIMEOUT, Math.max(1, Math.ceil(deadline - performance.now()))));
        if (receipt.transaction_id === tx && FINAL.has(receipt.status)) {
          const finalize = receipt.result;
          return classify({tx, walletStatus: receipt.status, finalize, receipt, dryRun: false,
            fee: finalize?.fee_receipt?.total_fees_paid});
        }
      } catch (error) {
        cause = error;
      }
      const remaining = deadline - performance.now();
      if (remaining > 0) await delay(Math.min(pollIntervalMs, remaining));
    }
    throw new SemviRelayError(`No final result for ${tx} within ${timeoutMs} ms`, {tx, cause});
  }

  async relay(job, {account, maxFee, dryRun = false, timeoutMs, pollIntervalMs}) {
    if (timeoutMs !== undefined) timer(timeoutMs, 'timeoutMs');
    if (pollIntervalMs !== undefined) timer(pollIntervalMs, 'pollIntervalMs');
    const submitted = await this.submit(job, {account, maxFee, dryRun});
    if (dryRun) return submitted;
    return {...await this.waitForResult(submitted.tx, {timeoutMs, pollIntervalMs}), feeAccount: submitted.feeAccount};
  }

  async vaultState() {
    await this.indexerInfo();
    return this.#indexer.vault(this.#vault);
  }

  async status(job) {
    if (typeof job !== 'string') this.#checkScope(job);
    const id = typeof job === 'string' ? job : job.job;
    if (!HASH.test(id)) throw TypeError('Invalid intent job ID');
    const {jobs, balance, jobsUsed, capacity} = await this.vaultState();
    return {job: id, paid: jobs.includes(id), balance, jobsUsed, capacity};
  }

  async receipt(tx) {
    if (typeof tx !== 'string' || !HASH.test(tx)) throw TypeError('Invalid transaction ID');
    await this.indexerInfo();
    return this.#indexer.receipt(tx);
  }
}
