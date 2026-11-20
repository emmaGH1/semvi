import {readFile, writeFile} from 'node:fs/promises';
import {Semvi, jobId} from 'semvi';

const [intentFile, reference, mode] = process.argv.slice(2);
if (!intentFile || !reference || (mode && mode !== '--submit')) {
  throw Error('Usage: node payout-bot.mjs INTENT_FILE REFERENCE [--submit]');
}

const {
  TARI_WALLETD_URL, TARI_WALLET_COOKIE_FILE, SEMVI_VAULT, SEMVI_BIN_DIR,
  SEMVI_RECIPIENT, SEMVI_PAYER_KEY, SEMVI_RELAYER, SEMVI_AMOUNT = '100',
} = process.env;
const semvi = new Semvi({
  walletd: TARI_WALLETD_URL, cookieFile: TARI_WALLET_COOKIE_FILE,
  vault: SEMVI_VAULT, network: 'mainnet', binDir: SEMVI_BIN_DIR,
});

let job;
try {
  job = JSON.parse(await readFile(intentFile, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  job = await semvi.sign({reference, recipient: SEMVI_RECIPIENT, amount: SEMVI_AMOUNT, payerKeyFile: SEMVI_PAYER_KEY});
  await writeFile(intentFile, JSON.stringify(job, null, 2) + '\n', {flag: 'wx', mode: 0o600});
}

if (job.job !== await jobId(reference)) throw Error('The saved intent belongs to a different reference');
try {
  if ((await semvi.status(job)).paid) {
    console.log('The indexer reports this job as paid.');
  } else {
    const {status, tx, fee, reason, dryRun} = await semvi.relay(job, {
      account: SEMVI_RELAYER, maxFee: 10_000, dryRun: mode !== '--submit',
    });
    console.log({status, tx, fee, reason, dryRun});
    if (status === 'failed') process.exitCode = 1;
  }
} catch (error) {
  if (error.code !== 'SEMVI_RELAY_UNKNOWN') throw error;
  const {paid} = await semvi.status(job);
  console.log({tx: error.tx, paid, message: error.message});
  if (!paid) process.exitCode = 2;
}
