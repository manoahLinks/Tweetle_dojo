/// Mock ZK verifier for local development.
/// Returns the calldata directly as "public inputs" without any cryptographic verification.
/// DO NOT deploy to production — use the real Garaga verifier instead.
use tweetle_dojo::systems::tournament_manager::IUltraKeccakZKHonkVerifier;

#[dojo::contract]
pub mod mock_verifier {
    use super::IUltraKeccakZKHonkVerifier;

    #[abi(embed_v0)]
    impl MockVerifierImpl of IUltraKeccakZKHonkVerifier<ContractState> {
        fn verify_ultra_keccak_zk_honk_proof(
            self: @ContractState, full_proof_with_hints: Span<felt252>,
        ) -> Result<Span<u256>, felt252> {
            // Convert each felt252 to u256 and return as "public inputs"
            let mut result: Array<u256> = array![];
            let mut i: u32 = 0;
            while i < full_proof_with_hints.len() {
                let val: u256 = (*full_proof_with_hints.at(i)).into();
                result.append(val);
                i += 1;
            };
            Result::Ok(result.span())
        }
    }
}
