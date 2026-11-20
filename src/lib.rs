//! OnceRail: at-most-once settlement per immutable payer vault and business job ID.
use std::collections::BTreeSet;
use tari_template_lib::prelude::*;

custom_signature_domain!(OnceRailDomain, b"oncerail.payout.v1");
pub const SIGNATURE_DOMAIN: &[u8] = b"oncerail.payout.v1";
pub const MAX_JOBS: usize = 256;

/// Canonical payload. Component and network binding are added by Ootle's verifier.
pub fn intent_message(
    job: &Hash32,
    recipient: &ComponentAddress,
    amount: u64,
    expiry: u64,
) -> Vec<u8> {
    format!("oncerail:v1|{job}|{recipient}|{amount}|{expiry}").into_bytes()
}

#[template]
mod oncerail {
    use super::*;

    pub struct OnceRail {
        payer: RistrettoPublicKeyBytes,
        funds: Vault,
        consumed: BTreeSet<Hash32>,
    }

    impl OnceRail {
        pub fn new(payer: RistrettoPublicKeyBytes) -> Component<Self> {
            Component::new(Self {
                payer,
                funds: Vault::new_empty(TARI_TOKEN),
                consumed: BTreeSet::new(),
            })
            // No owner bypass, rule changes or upgrades. Payer checks are explicit.
            .with_owner_rule(OwnerRule::None)
            .with_access_rules(AccessRules::allow_all())
            .create()
        }

        pub fn fund(&mut self, payment: Bucket) {
            assert_eq!(payment.resource_address(), TARI_TOKEN, "WrongResource");
            assert!(payment.amount().is_positive(), "EmptyFunding");
            self.funds.deposit(payment);
        }

        pub fn execute(
            &mut self,
            job: Hash32,
            recipient: ComponentAddress,
            amount: u64,
            expiry: u64,
            signature: Signature<OnceRailDomain>,
        ) {
            assert!(!self.consumed.contains(&job), "OperationConsumed");
            assert!(self.consumed.len() < MAX_JOBS, "VaultCapacityReached");
            assert!(amount > 0, "ZeroAmount");
            assert!(Consensus::current_epoch() <= expiry, "IntentExpired");
            assert!(
                signature.verify_for_component(
                    &PublicKey::from(self.payer),
                    &intent_message(&job, &recipient, amount, expiry),
                ),
                "InvalidIntentSignature"
            );
            // Registry update and downstream deposit share one atomic main intent.
            // A downstream failure rolls both back. IDs are NEVER pruned/recycled.
            self.consumed.insert(job);
            let payment = self.funds.withdraw(amount);
            ComponentManager::get(recipient).invoke("deposit", args![payment]);
        }

        pub fn withdraw(&mut self, amount: u64) -> Bucket {
            CallerContext::assert_badge_in_scope(&NonFungibleAddress::from_public_key(self.payer));
            assert!(amount > 0, "ZeroAmount");
            self.funds.withdraw(amount)
        }

        pub fn balance(&self) -> Amount {
            self.funds.balance()
        }

        pub fn was_paid(&self, job: Hash32) -> bool {
            self.consumed.contains(&job)
        }

        pub fn jobs_used(&self) -> u32 {
            self.consumed.len() as u32
        }

        pub fn payer(&self) -> RistrettoPublicKeyBytes {
            self.payer
        }
    }
}
