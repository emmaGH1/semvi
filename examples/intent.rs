//! Offline intent signer. Secret material is read from a file and never printed.
use semvi::{SIGNATURE_DOMAIN, intent_message};
use std::{env, fs, io::Read, path::Path, str::FromStr};
use tari_crypto::{
    keys::{PublicKey as _, SecretKey},
    ristretto::{RistrettoPublicKey, RistrettoSecretKey},
    tari_utilities::ByteArray,
};
use tari_ootle_common_types::{TemplateSignatureBinding, sign_template_message_schnorr};
use tari_template_lib::{prelude::*, types::crypto::NoSignatureDomain};
use tari_template_test_tooling::{
    byte_type::ToByteType,
    transaction::{Network, args},
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let a: Vec<String> = env::args().collect();
    if a.len() == 3 && a[1] == "keygen" {
        let path = Path::new(&a[2]);
        if path.exists() {
            return Err("Refusing to overwrite an existing key".into());
        }
        let mut entropy = [0u8; 64];
        fs::File::open("/dev/urandom")?.read_exact(&mut entropy)?;
        let key = RistrettoSecretKey::from_uniform_bytes(&entropy).map_err(|e| e.to_string())?;
        use std::io::Write;
        use std::os::unix::fs::OpenOptionsExt;
        let mut f = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(path)?;
        f.write_all(hex::encode(key.as_bytes()).as_bytes())?;
        println!(
            "{}",
            RistrettoPublicKey::from_secret_key(&key).to_byte_type()
        );
        return Ok(());
    }
    if a.len() != 9 || a[1] != "sign" {
        return Err("Usage: intent keygen KEYFILE | intent sign KEYFILE NETWORK VAULT JOB_HASH RECIPIENT AMOUNT_MICRO EXPIRY_EPOCH".into());
    }
    let key_bytes = hex::decode(fs::read_to_string(&a[2])?.trim())?;
    let key = RistrettoSecretKey::from_canonical_bytes(&key_bytes).map_err(|e| e.to_string())?;
    let network = match a[3].as_str() {
        "mainnet" => Network::MainNet,
        "localnet" => Network::LocalNet,
        "esmeralda" => Network::Esmeralda,
        _ => return Err("Network must be mainnet, localnet or esmeralda".into()),
    };
    let vault = ComponentAddress::from_str(&a[4])?;
    let job = Hash32::from_hex(&a[5]).map_err(|_| "Job must be a 32-byte hex hash")?;
    let recipient = ComponentAddress::from_str(&a[6])?;
    let amount: u64 = a[7].parse()?;
    let expiry: u64 = a[8].parse()?;
    if amount == 0 {
        return Err("Amount must be positive".into());
    }
    let message = intent_message(&job, &recipient, amount, expiry);
    let signature: Signature<NoSignatureDomain> = sign_template_message_schnorr(
        &key,
        &TemplateSignatureBinding::component(network, vault),
        SIGNATURE_DOMAIN,
        &message,
    )
    .into();
    let encoded_args: Vec<_> = args![job, recipient, amount, expiry, signature]
        .iter().map(|arg| serde_json::json!({"Literal": hex::encode(arg.as_literal().expect("literal arguments"))})).collect();
    println!(
        "{}",
        serde_json::to_string_pretty(&serde_json::json!({
            "schema": "semvi.intent.v1", "network": a[3], "vault": vault,
            "job": job, "recipient": recipient, "amount_micro": amount.to_string(),
            "expiry_epoch": expiry.to_string(), "payer": RistrettoPublicKey::from_secret_key(&key).to_byte_type(),
            "message": String::from_utf8(message)?,
            "args": encoded_args,
        }))?
    );
    Ok(())
}
