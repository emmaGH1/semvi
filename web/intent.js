// Display metadata is untrusted; match it to the actual CBOR payment arguments.
function cborUint(value) {
  const n = BigInt(value);
  if (n < 0n || n > 18446744073709551615n) throw Error('Number is outside u64 range.');
  if (n < 24n) return n.toString(16).padStart(2,'0');
  for (const [limit, prefix, length] of [[255n,'18',2],[65535n,'19',4],[4294967295n,'1a',8],[18446744073709551615n,'1b',16]]) {
    if (n <= limit) return prefix + n.toString(16).padStart(length,'0');
  }
}
export function inspectIntent(j) {
  if (j.schema !== 'oncerail.intent.v1') throw Error('This is not a OnceRail v1 intent. Use the intent sign command.');
  if (!['mainnet','esmeralda','localnet'].includes(j.network)) throw Error('Unknown intent network.');
  if (!/^[a-f0-9]{64}$/.test(j.job) || !/^[a-f0-9]{64}$/.test(j.payer)) throw Error('Job ID and payer must be 32-byte hexadecimal values.');
  if (!/^component_[a-f0-9]{64}$/.test(j.vault) || !/^component_[a-f0-9]{64}$/.test(j.recipient)) throw Error('Vault and recipient must be valid component address strings.');
  for (const key of ['amount_micro','expiry_epoch']) {
    if (typeof j[key] !== 'string' || !/^(0|[1-9][0-9]*)$/.test(j[key])) throw Error(`${key} must be a canonical unsigned decimal string.`);
  }
  if (BigInt(j.amount_micro) === 0n) throw Error('A zero payment is not allowed.');
  const expected = ['5820'+j.job,'d8805820'+j.recipient.slice(10),cborUint(j.amount_micro),cborUint(j.expiry_epoch)];
  if (!Array.isArray(j.args) || j.args.length !== 5) throw Error('Expected five encoded contract arguments.');
  expected.forEach((hex,i) => {if(j.args[i]?.Literal !== hex) throw Error('The visible fields differ from the encoded payment arguments. Do not relay this file.');});
  if (!/^(?:[a-f0-9]{2})+$/.test(j.args[4]?.Literal ?? '')) throw Error('Missing encoded signature.');
  const message = `oncerail:v1|${j.job}|${j.recipient}|${j.amount_micro}|${j.expiry_epoch}`;
  if(j.message !== message) throw Error('The signed-message description differs from the payment fields.');
  return {network:j.network,job:j.job,vault:j.vault,recipient:j.recipient,amount_micro:j.amount_micro,expiry_epoch:j.expiry_epoch,payer:j.payer};
}
