//! Build walletd submission requests with the official transaction builder.
//! Never connects to a wallet and never submits or spends.
use serde_json::Value;
use std::{
    env, fs,
    str::FromStr,
    time::{SystemTime, UNIX_EPOCH},
};
use tari_template_lib::prelude::*;
use tari_template_test_tooling::transaction::{
    Epoch, Network, Transaction, args, args::InstructionArg, builder::named_args::NamedArg,
};

fn text<'a>(v: &'a Value, k: &str) -> Result<&'a str, String> {
    v[k].as_str().ok_or_else(|| format!("Missing string {k}"))
}
fn number(v: &Value, k: &str) -> Result<u64, Box<dyn std::error::Error>> {
    if let Some(n) = v[k].as_u64() {
        return Ok(n);
    }
    Ok(text(v, k)?.parse()?)
}
fn component(v: &Value, k: &str) -> Result<ComponentAddress, Box<dyn std::error::Error>> {
    Ok(ComponentAddress::from_str(text(v, k)?)?)
}
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let p = env::args()
        .nth(1)
        .ok_or("Usage: prepare REQUEST_SPEC.json")?;
    let spec: Value = serde_json::from_str(&fs::read_to_string(p)?)?;
    let network = match text(&spec, "network")? {
        "mainnet" => Network::MainNet,
        "esmeralda" => Network::Esmeralda,
        "localnet" => Network::LocalNet,
        _ => return Err("Unknown network".into()),
    };
    let max_fee = number(&spec, "max_fee")?;
    if max_fee == 0 {
        return Err("max_fee must be positive".into());
    }
    let nonce = u64::try_from(SystemTime::now().duration_since(UNIX_EPOCH)?.as_nanos())?;
    let mut tx = Transaction::builder(
        network,
        Epoch(
            number(&spec, "current_epoch")?
                .checked_add(3)
                .ok_or("Epoch overflow")?,
        ),
    )
    .with_nonce(nonce)
    .pay_fee_from_component(component(&spec, "fee_account")?, max_fee);
    match text(&spec, "action")? {
        "create" => {
            let payer = RistrettoPublicKeyBytes::from_str(text(&spec, "payer")?)?;
            let template = TemplateAddress::from_str(text(&spec, "template")?)?;
            tx = tx.call_function(template, "new", args![payer]);
        }
        "fund" => {
            tx = tx
                .call_method(
                    component(&spec, "fee_account")?,
                    "withdraw",
                    args![TARI_TOKEN, Amount::from(number(&spec, "amount_micro")?)],
                )
                .put_last_instruction_output_on_workspace("funds")
                .call_method(component(&spec, "rail")?, "fund", args![Workspace("funds")]);
        }
        "execute" => {
            let intent: Value =
                serde_json::from_str(&fs::read_to_string(text(&spec, "intent_file")?)?)?;
            if intent["network"] != spec["network"] || intent["schema"] != "semvi.intent.v1" {
                return Err("Intent network/schema mismatch".into());
            }
            let encoded: Vec<InstructionArg> = serde_json::from_value(intent["args"].clone())?;
            if encoded.len() != 5 {
                return Err("Expected five execute arguments".into());
            }
            let job = Hash32::from_hex(text(&intent, "job")?).map_err(|_| "Invalid job hash")?;
            let recipient = component(&intent, "recipient")?;
            let amount = number(&intent, "amount_micro")?;
            let expiry = number(&intent, "expiry_epoch")?;
            let expected = args![job, recipient, amount, expiry];
            for (i, arg) in expected.iter().enumerate() {
                match &encoded[i] {
                    InstructionArg::Literal(bytes) if Some(bytes.as_ref()) == arg.as_literal() => {}
                    _ => {
                        return Err(
                            "Intent display fields do not match encoded payment arguments".into(),
                        );
                    }
                }
            }
            if text(&intent, "message")?
                != String::from_utf8(semvi::intent_message(&job, &recipient, amount, expiry))?
            {
                return Err("Intent message does not match payment fields".into());
            }
            let mut named = Vec::new();
            for arg in encoded {
                match arg {
                    InstructionArg::Literal(b) => named.push(NamedArg::Literal(b.to_vec())),
                    _ => return Err("Intent contains non-literal argument".into()),
                }
            }
            tx = tx.call_method(component(&intent, "vault")?, "execute", named);
        }
        "withdraw" => {
            tx = tx
                .call_method(
                    component(&spec, "rail")?,
                    "withdraw",
                    args![number(&spec, "amount_micro")?],
                )
                .put_last_instruction_output_on_workspace("refund")
                .call_method(
                    component(&spec, "recipient")?,
                    "deposit",
                    args![Workspace("refund")],
                );
        }
        _ => return Err("action must be create, fund, execute or withdraw".into()),
    }
    println!(
        "{}",
        serde_json::to_string_pretty(&serde_json::json!({
            "transaction":tx.build_unsigned(), "seal_signer":spec["seal_signer"],
            "other_signers":spec.get("other_signers").cloned().unwrap_or(serde_json::json!([])),
            "signatures":[], "detect_inputs":true, "detect_inputs_use_unversioned":true, "lock_ids":[],
        }))?
    );
    Ok(())
}
