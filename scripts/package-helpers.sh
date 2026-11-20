#!/usr/bin/env bash
set -euo pipefail

if [[ $# != 4 || ! $1 =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo 'Usage: package-helpers.sh VERSION PLATFORM BINARY_DIR OUTPUT_DIR' >&2
  exit 1
fi
version=$1 platform=$2 bin_dir=$3 out=$4
if [[ "$platform" != "$(node -p 'process.platform + "-" + process.arch')" ]]; then
  echo "Cannot smoke-test $platform helpers on this runner" >&2
  exit 1
fi

scratch=$(mktemp -d "${TMPDIR:-/tmp}/semvi-smoke.XXXXXXXX")
trap 'rm -rf "$scratch"' EXIT
vault=component_$(printf '%064d' 1)
recipient=component_$(printf '%064d' 2)
job=$(printf '%064d' 3)
"$bin_dir/intent" keygen "$scratch/payer.key" > "$scratch/payer.pub"
"$bin_dir/intent" sign "$scratch/payer.key" localnet "$vault" "$job" "$recipient" 100 5 > "$scratch/intent.json"

node - "$scratch" "$vault" "$job" "$recipient" <<'NODE'
const assert = require('node:assert/strict');
const {readFileSync, writeFileSync} = require('node:fs');
const {join} = require('node:path');

const [dir, vault, job, recipient] = process.argv.slice(2);
const intentFile = join(dir, 'intent.json');
const intent = JSON.parse(readFileSync(intentFile));
assert.deepEqual(
  [intent.schema, intent.network, intent.vault, intent.job, intent.recipient, intent.amount_micro, intent.expiry_epoch],
  ['semvi.intent.v1', 'localnet', vault, job, recipient, '100', '5'],
);
assert.match(intent.payer, /^[0-9a-f]{64}$/);
assert.equal(intent.payer, readFileSync(join(dir, 'payer.pub'), 'utf8').trim());
assert.equal(intent.args.length, 5);
writeFileSync(join(dir, 'spec.json'), JSON.stringify({
  action: 'execute',
  network: 'localnet',
  current_epoch: 1,
  fee_account: recipient,
  max_fee: 10000,
  seal_signer: {Derived: {index: 0, key_branch: 'account'}},
  intent_file: intentFile,
}));
NODE

"$bin_dir/prepare" "$scratch/spec.json" > "$scratch/request.json"
node - "$scratch" "$vault" <<'NODE'
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');

const [dir, vault] = process.argv.slice(2);
const request = JSON.parse(readFileSync(join(dir, 'request.json')));
const intent = JSON.parse(readFileSync(join(dir, 'intent.json')));
const {call, method, args} = request.transaction.V2.instructions[0].CallMethod;
assert.equal(call.Address, vault);
assert.equal(method, 'execute');
assert.deepEqual(args, intent.args);
assert.equal(request.transaction.V2.fee_instructions[0].CallMethod.method, 'pay_fee');
NODE
echo "Offline keygen, sign and V2 prepare passed for $platform"

mkdir -p "$out"
archive="semvi-helpers-$version-$platform.tar.gz"
COPYFILE_DISABLE=1 tar --format=ustar -czf "$out/$archive" -C "$bin_dir" intent prepare
(cd "$out" && shasum -a 256 "$archive" > SHA256SUMS)
echo "Packaged $out/$archive and SHA256SUMS"
