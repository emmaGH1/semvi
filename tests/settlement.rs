use oncerail::{SIGNATURE_DOMAIN, intent_message};
use tari_ootle_common_types::{TemplateSignatureBinding, sign_template_message_schnorr};
use tari_template_lib::prelude::*;
use tari_template_lib::types::crypto::NoSignatureDomain;
use tari_template_test_tooling::{
    TemplateTest,
    byte_type::ToByteType,
    crypto::{PublicKey as _, RistrettoPublicKey, RistrettoSecretKey},
    engine_types::virtual_substate::{VirtualSubstate, VirtualSubstateId},
    support::assert_error::assert_reject_reason,
    transaction::{Network, args},
};

struct Fixture {
    engine: TemplateTest,
    rail: ComponentAddress,
    recipient: ComponentAddress,
    payer_account: ComponentAddress,
    payer_proof: NonFungibleAddress,
    payer_secret: RistrettoSecretKey,
    relay_a: RistrettoSecretKey,
    relay_b: RistrettoSecretKey,
}

impl Fixture {
    fn new() -> Self {
        let mut engine = TemplateTest::new(env!("CARGO_MANIFEST_DIR"), ["."]);
        let (payer_account, payer_proof, payer_secret) = engine.create_funded_account();
        let (recipient, _, relay_a) = engine.create_empty_account();
        let (_, _, relay_b) = engine.create_empty_account();
        let payer = RistrettoPublicKey::from_secret_key(&payer_secret).to_byte_type();
        let rail: ComponentAddress = engine.call_function("OnceRail", "new", args![payer], vec![]);
        let tx = engine
            .transaction()
            .call_method(
                payer_account,
                "withdraw",
                args![TARI_TOKEN, Amount::from(1000u64)],
            )
            .put_last_instruction_output_on_workspace("funds")
            .call_method(rail, "fund", args![Workspace("funds")])
            .build_and_seal(&payer_secret);
        engine.execute_expect_success(tx, vec![payer_proof.clone()]);
        Self {
            engine,
            rail,
            recipient,
            payer_account,
            payer_proof,
            payer_secret,
            relay_a,
            relay_b,
        }
    }

    fn sign(
        &self,
        job: Hash32,
        recipient: ComponentAddress,
        amount: u64,
        expiry: u64,
    ) -> Signature<NoSignatureDomain> {
        sign_template_message_schnorr(
            &self.payer_secret,
            &TemplateSignatureBinding::component(Network::LocalNet, self.rail),
            SIGNATURE_DOMAIN,
            &intent_message(&job, &recipient, amount, expiry),
        )
        .into()
    }

    fn vault_balance(&mut self) -> Amount {
        self.engine
            .call_method(self.rail, "balance", args![], vec![])
    }

    fn recipient_balance(&mut self) -> Amount {
        self.engine
            .call_method(self.recipient, "balance", args![TARI_TOKEN], vec![])
    }

    fn paid(&mut self, job: Hash32) -> bool {
        self.engine
            .call_method(self.rail, "was_paid", args![job], vec![])
    }
}

#[test]
fn different_transactions_and_relayers_pay_one_business_job_once() {
    let mut f = Fixture::new();
    let job = Hash32::from_array([7; 32]);
    let sig = f.sign(job, f.recipient, 100, 100);
    let first = f
        .engine
        .transaction()
        .call_method(
            f.rail,
            "execute",
            args![job, f.recipient, 100u64, 100u64, sig],
        )
        .build_and_seal(&f.relay_a);
    let first_id = first.calculate_id();
    f.engine.execute_expect_success(first, vec![]);
    assert_eq!(f.recipient_balance(), Amount::from(100u64));
    assert_eq!(f.vault_balance(), Amount::from(900u64));
    for retry in 1..=4 {
        let sig = f.sign(job, f.recipient, 100, 100);
        let tx = f
            .engine
            .transaction()
            .call_method(
                f.rail,
                "execute",
                args![job, f.recipient, 100u64, 100u64, sig],
            )
            .build_and_seal(&f.relay_b);
        let retry_id = tx.calculate_id();
        assert_ne!(first_id, retry_id);
        let reason = f.engine.execute_expect_failure(tx, vec![]);
        assert_reject_reason(reason, "OperationConsumed");
        assert_eq!(f.recipient_balance(), Amount::from(100u64));
        assert_eq!(f.vault_balance(), Amount::from(900u64));
        println!(
            "PROOF retry={retry} first={first_id} retry_tx={retry_id} rejection=OperationConsumed recipient=100 vault=900"
        );
    }
    assert!(f.paid(job));
}

#[test]
fn signed_fields_cannot_be_changed() {
    let mut f = Fixture::new();
    let job = Hash32::from_array([8; 32]);
    let cases = [
        (job, f.payer_account, 100, 100),
        (job, f.recipient, 101, 100),
        (Hash32::from_array([9; 32]), f.recipient, 100, 100),
        (job, f.recipient, 100, 101),
    ];
    for (submitted_job, recipient, amount, expiry) in cases {
        let sig = f.sign(job, f.recipient, 100, 100);
        let tx = f
            .engine
            .transaction()
            .call_method(
                f.rail,
                "execute",
                args![submitted_job, recipient, amount, expiry, sig],
            )
            .build_and_seal(&f.relay_a);
        let reason = f.engine.execute_expect_failure(tx, vec![]);
        assert_reject_reason(reason, "InvalidIntentSignature");
        assert_eq!(f.vault_balance(), Amount::from(1000u64));
        assert!(!f.paid(job));
    }
}

#[test]
fn expired_intent_cannot_spend_or_consume_job() {
    let mut f = Fixture::new();
    let job = Hash32::from_array([10; 32]);
    let sig = f.sign(job, f.recipient, 100, 5);
    f.engine.set_virtual_substate(
        VirtualSubstateId::CurrentEpoch,
        VirtualSubstate::CurrentEpoch(6),
    );
    let tx = f
        .engine
        .transaction()
        .call_method(
            f.rail,
            "execute",
            args![job, f.recipient, 100u64, 5u64, sig],
        )
        .build_and_seal(&f.relay_a);
    assert_reject_reason(f.engine.execute_expect_failure(tx, vec![]), "IntentExpired");
    assert_eq!(f.vault_balance(), Amount::from(1000u64));
    assert!(!f.paid(job));
}

#[test]
fn signature_is_bound_to_its_component() {
    let mut f = Fixture::new();
    let job = Hash32::from_array([11; 32]);
    let payer = RistrettoPublicKey::from_secret_key(&f.payer_secret).to_byte_type();
    let other: ComponentAddress = f
        .engine
        .call_function("OnceRail", "new", args![payer], vec![]);
    let sig = f.sign(job, f.recipient, 100, 100);
    let tx = f
        .engine
        .transaction()
        .call_method(
            other,
            "execute",
            args![job, f.recipient, 100u64, 100u64, sig],
        )
        .build_and_seal(&f.relay_a);
    assert_reject_reason(
        f.engine.execute_expect_failure(tx, vec![]),
        "InvalidIntentSignature",
    );
}

#[test]
fn failed_downstream_deposit_does_not_burn_job_id() {
    let mut f = Fixture::new();
    let job = Hash32::from_array([12; 32]);
    // OnceRail itself has no deposit method; the inner transfer fails after insertion.
    let sig = f.sign(job, f.rail, 100, 100);
    let tx = f
        .engine
        .transaction()
        .call_method(f.rail, "execute", args![job, f.rail, 100u64, 100u64, sig])
        .build_and_seal(&f.relay_a);
    f.engine.execute_expect_failure(tx, vec![]);
    assert_eq!(f.vault_balance(), Amount::from(1000u64));
    assert!(!f.paid(job));
    // A corrected, newly signed intent with the unconsumed ID can succeed.
    let sig = f.sign(job, f.recipient, 100, 100);
    let tx = f
        .engine
        .transaction()
        .call_method(
            f.rail,
            "execute",
            args![job, f.recipient, 100u64, 100u64, sig],
        )
        .build_and_seal(&f.relay_b);
    f.engine.execute_expect_success(tx, vec![]);
    assert_eq!(f.recipient_balance(), Amount::from(100u64));
}

#[test]
fn only_payer_can_withdraw_unused_funds() {
    let mut f = Fixture::new();
    let attack = f
        .engine
        .transaction()
        .call_method(f.rail, "withdraw", args![1000u64])
        .put_last_instruction_output_on_workspace("stolen")
        .call_method(f.recipient, "deposit", args![Workspace("stolen")])
        .build_and_seal(&f.relay_a);
    f.engine.execute_expect_failure(attack, vec![]);
    assert_eq!(f.vault_balance(), Amount::from(1000u64));
    let withdrawal = f
        .engine
        .transaction()
        .call_method(f.rail, "withdraw", args![1000u64])
        .put_last_instruction_output_on_workspace("refund")
        .call_method(f.payer_account, "deposit", args![Workspace("refund")])
        .build_and_seal(&f.payer_secret);
    f.engine
        .execute_expect_success(withdrawal, vec![f.payer_proof.clone()]);
    assert_eq!(f.vault_balance(), Amount::zero());
}

#[test]
fn another_network_signature_cannot_authorize_a_payment() {
    let mut f = Fixture::new();
    let job = Hash32::from_array([13; 32]);
    let sig: Signature<NoSignatureDomain> = sign_template_message_schnorr(
        &f.payer_secret,
        &TemplateSignatureBinding::component(Network::MainNet, f.rail),
        SIGNATURE_DOMAIN,
        &intent_message(&job, &f.recipient, 100, 100),
    )
    .into();
    let tx = f
        .engine
        .transaction()
        .call_method(
            f.rail,
            "execute",
            args![job, f.recipient, 100u64, 100u64, sig],
        )
        .build_and_seal(&f.relay_a);
    assert_reject_reason(
        f.engine.execute_expect_failure(tx, vec![]),
        "InvalidIntentSignature",
    );
    assert_eq!(f.vault_balance(), Amount::from(1000u64));
    assert!(!f.paid(job));
}

#[test]
fn insufficient_funds_do_not_consume_a_job() {
    let mut f = Fixture::new();
    let job = Hash32::from_array([14; 32]);
    let sig = f.sign(job, f.recipient, 1001, 100);
    let tx = f
        .engine
        .transaction()
        .call_method(
            f.rail,
            "execute",
            args![job, f.recipient, 1001u64, 100u64, sig],
        )
        .build_and_seal(&f.relay_a);
    f.engine.execute_expect_failure(tx, vec![]);
    assert_eq!(f.vault_balance(), Amount::from(1000u64));
    assert!(!f.paid(job));
    let sig = f.sign(job, f.recipient, 100, 100);
    let tx = f
        .engine
        .transaction()
        .call_method(
            f.rail,
            "execute",
            args![job, f.recipient, 100u64, 100u64, sig],
        )
        .build_and_seal(&f.relay_b);
    f.engine.execute_expect_success(tx, vec![]);
    assert_eq!(f.recipient_balance(), Amount::from(100u64));
}

#[test]
fn capacity_never_prunes_old_jobs_or_traps_unused_funds() {
    let mut f = Fixture::new();
    for n in 0..oncerail::MAX_JOBS {
        let mut id = [0u8; 32];
        id[..8].copy_from_slice(&(n as u64).to_le_bytes());
        let job = Hash32::from_array(id);
        let sig = f.sign(job, f.recipient, 1, 100);
        let tx = f
            .engine
            .transaction()
            .call_method(
                f.rail,
                "execute",
                args![job, f.recipient, 1u64, 100u64, sig],
            )
            .build_and_seal(&f.relay_a);
        f.engine.execute_expect_success(tx, vec![]);
    }
    let used: u32 = f.engine.call_method(f.rail, "jobs_used", args![], vec![]);
    assert_eq!(used, 256);
    let job = Hash32::from_array([255; 32]);
    let sig = f.sign(job, f.recipient, 1, 100);
    let tx = f
        .engine
        .transaction()
        .call_method(
            f.rail,
            "execute",
            args![job, f.recipient, 1u64, 100u64, sig],
        )
        .build_and_seal(&f.relay_b);
    assert_reject_reason(
        f.engine.execute_expect_failure(tx, vec![]),
        "VaultCapacityReached",
    );
    let old = Hash32::zero();
    let sig = f.sign(old, f.recipient, 1, 100);
    let tx = f
        .engine
        .transaction()
        .call_method(
            f.rail,
            "execute",
            args![old, f.recipient, 1u64, 100u64, sig],
        )
        .build_and_seal(&f.relay_b);
    assert_reject_reason(
        f.engine.execute_expect_failure(tx, vec![]),
        "OperationConsumed",
    );
    let remaining = 1000 - oncerail::MAX_JOBS as u64;
    let tx = f
        .engine
        .transaction()
        .call_method(f.rail, "withdraw", args![remaining])
        .put_last_instruction_output_on_workspace("refund")
        .call_method(f.payer_account, "deposit", args![Workspace("refund")])
        .build_and_seal(&f.payer_secret);
    f.engine
        .execute_expect_success(tx, vec![f.payer_proof.clone()]);
    assert_eq!(f.vault_balance(), Amount::zero());
    assert_eq!(f.recipient_balance(), Amount::from(256u64));
}
