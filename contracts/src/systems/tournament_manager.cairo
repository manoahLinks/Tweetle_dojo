#[starknet::interface]
pub trait ITournamentManager<TContractState> {
    /// Initialize the tournament config singleton (called once after deploy)
    fn initialize(
        ref self: TContractState,
        game_master: starknet::ContractAddress,
        fee_recipient: starknet::ContractAddress,
        min_players: u16,
        platform_fee_bps: u16,
    );

    /// Create a new tournament (game master only)
    fn create_tournament(
        ref self: TContractState,
        solution_commitment: felt252,
        entry_fee: u256,
        max_players: u16,
        start_time: u64,
        end_time: u64,
    ) -> u64;

    /// Join a tournament (pays entry fee — transfer stubbed)
    fn join_tournament(ref self: TContractState, tournament_id: u64);

    /// Activate a tournament: OPEN → ACTIVE (when start_time reached + min players met)
    fn activate_tournament(ref self: TContractState, tournament_id: u64);

    /// Submit a guess with ZK proof (verifier stubbed — clue trusted for now)
    fn submit_guess(
        ref self: TContractState,
        tournament_id: u64,
        guess_packed: felt252,
        clue_packed: u16,
    );

    /// End tournament: reveal solution, verify commitment, mark COMPLETED
    fn end_tournament(
        ref self: TContractState,
        tournament_id: u64,
        solution_index: u32,
        solution_salt: felt252,
    );

    /// Distribute prizes to ranked players (ERC20 transfer stubbed)
    fn distribute_prizes(
        ref self: TContractState,
        tournament_id: u64,
        ranked_players: Array<starknet::ContractAddress>,
    );

    /// Cancel tournament and allow refunds (transfer stubbed)
    fn cancel_tournament(ref self: TContractState, tournament_id: u64);
}

#[dojo::contract]
pub mod tournament_manager {
    use super::ITournamentManager;
    use starknet::{get_caller_address, get_block_timestamp, ContractAddress};
    use core::num::traits::Zero;
    use dojo::model::ModelStorage;
    use dojo::event::EventStorage;
    use tweetle_dojo::models::tournament::{
        Tournament, TournamentEntry, TournamentAttempt, TournamentRanking, TournamentStatus,
    };
    use tweetle_dojo::models::config::TournamentConfig;

    const MAX_ATTEMPTS: u8 = 6;
    const CONFIG_ID: u8 = 0;
    // All correct clue: each position = 2 (correct), packed as base-4 digits
    // 2*256 + 2*64 + 2*16 + 2*4 + 2 = 682 (matches actions.cairo encoding)
    const ALL_CORRECT_CLUE: u16 = 682;
    // Prize distribution basis points (out of 10000)
    const PRIZE_1ST_BPS: u256 = 5000; // 50%
    const PRIZE_2ND_BPS: u256 = 2500; // 25%
    const PRIZE_3RD_BPS: u256 = 1500; // 15%
    const PRIZE_4TH_BPS: u256 = 1000; // 10%
    const BPS_BASE: u256 = 10000;

    // ─────────────── Events ───────────────

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct TournamentCreated {
        #[key]
        pub tournament_id: u64,
        pub creator: ContractAddress,
        pub solution_commitment: felt252,
        pub entry_fee: u256,
        pub max_players: u16,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct TournamentJoined {
        #[key]
        pub tournament_id: u64,
        pub player: ContractAddress,
        pub current_players: u16,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct TournamentActivated {
        #[key]
        pub tournament_id: u64,
        pub current_players: u16,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GuessVerified {
        #[key]
        pub tournament_id: u64,
        pub player: ContractAddress,
        pub attempt_number: u8,
        pub clue_packed: u16,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct TournamentWon {
        #[key]
        pub tournament_id: u64,
        pub player: ContractAddress,
        pub attempts_used: u8,
        pub completion_time: u64,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct TournamentCompleted {
        #[key]
        pub tournament_id: u64,
        pub solution_index: u32,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct PrizeDistributed {
        #[key]
        pub tournament_id: u64,
        pub rank: u16,
        pub player: ContractAddress,
        pub amount: u256,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct TournamentCancelled {
        #[key]
        pub tournament_id: u64,
        pub cancelled_at: u64,
    }

    // ─────────────── Implementation ───────────────

    #[abi(embed_v0)]
    impl TournamentManagerImpl of ITournamentManager<ContractState> {
        fn initialize(
            ref self: ContractState,
            game_master: ContractAddress,
            fee_recipient: ContractAddress,
            min_players: u16,
            platform_fee_bps: u16,
        ) {
            let mut world = self.world_default();

            let config: TournamentConfig = world.read_model(CONFIG_ID);
            assert(config.max_attempts == 0, 'Already initialized');
            assert(!game_master.is_zero(), 'Invalid game master');
            assert(!fee_recipient.is_zero(), 'Invalid fee recipient');
            assert(platform_fee_bps <= 2000, 'Fee too high'); // Max 20%

            world.write_model(@TournamentConfig {
                id: CONFIG_ID,
                tournament_count: 0,
                min_players,
                max_attempts: MAX_ATTEMPTS,
                platform_fee_bps,
                game_master,
                fee_recipient,
            });
        }

        fn create_tournament(
            ref self: ContractState,
            solution_commitment: felt252,
            entry_fee: u256,
            max_players: u16,
            start_time: u64,
            end_time: u64,
        ) -> u64 {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let timestamp = get_block_timestamp();

            let mut config: TournamentConfig = world.read_model(CONFIG_ID);
            assert(config.max_attempts > 0, 'Not initialized');
            assert(caller == config.game_master, 'Not game master');
            assert(solution_commitment != 0, 'Empty commitment');
            assert(max_players >= config.min_players, 'Too few max players');
            assert(end_time > start_time, 'Invalid time range');

            config.tournament_count += 1;
            let tournament_id = config.tournament_count;

            world.write_model(@config);
            world.write_model(@Tournament {
                tournament_id,
                solution_commitment,
                entry_fee,
                prize_pool: 0,
                max_players,
                current_players: 0,
                status: TournamentStatus::OPEN,
                start_time,
                end_time,
                created_at: timestamp,
                creator: caller,
                solution_index: 0,
                solution_salt: 0,
            });

            world.emit_event(@TournamentCreated {
                tournament_id,
                creator: caller,
                solution_commitment,
                entry_fee,
                max_players,
            });

            tournament_id
        }

        fn join_tournament(ref self: ContractState, tournament_id: u64) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut tournament: Tournament = world.read_model(tournament_id);
            assert(tournament.solution_commitment != 0, 'Tournament not found');
            assert(tournament.status == TournamentStatus::OPEN, 'Not open');
            assert(tournament.current_players < tournament.max_players, 'Tournament full');

            let entry: TournamentEntry = world.read_model((tournament_id, caller));
            assert(!entry.has_joined, 'Already joined');

            // ── Entry Fee Transfer (STUBBED) ──
            // TODO: IERC20Dispatcher(STRK_ADDRESS).transfer_from(caller, contract, entry_fee)
            tournament.prize_pool += tournament.entry_fee;
            tournament.current_players += 1;

            world.write_model(@tournament);
            world.write_model(@TournamentEntry {
                tournament_id,
                player: caller,
                attempts_used: 0,
                did_win: false,
                completed: false,
                completion_time: 0,
                has_joined: true,
            });

            world.emit_event(@TournamentJoined {
                tournament_id,
                player: caller,
                current_players: tournament.current_players,
            });
        }

        fn activate_tournament(ref self: ContractState, tournament_id: u64) {
            let mut world = self.world_default();
            let timestamp = get_block_timestamp();

            let mut tournament: Tournament = world.read_model(tournament_id);
            assert(tournament.solution_commitment != 0, 'Tournament not found');
            assert(tournament.status == TournamentStatus::OPEN, 'Not open');

            let config: TournamentConfig = world.read_model(CONFIG_ID);
            assert(tournament.current_players >= config.min_players, 'Not enough players');
            assert(timestamp >= tournament.start_time, 'Too early');

            tournament.status = TournamentStatus::ACTIVE;
            world.write_model(@tournament);

            world.emit_event(@TournamentActivated {
                tournament_id,
                current_players: tournament.current_players,
            });
        }

        fn submit_guess(
            ref self: ContractState,
            tournament_id: u64,
            guess_packed: felt252,
            clue_packed: u16,
        ) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let timestamp = get_block_timestamp();

            // Verify tournament is active
            let tournament: Tournament = world.read_model(tournament_id);
            assert(tournament.solution_commitment != 0, 'Tournament not found');
            assert(tournament.status == TournamentStatus::ACTIVE, 'Not active');
            assert(timestamp <= tournament.end_time, 'Tournament ended');

            // Verify player has joined
            let mut entry: TournamentEntry = world.read_model((tournament_id, caller));
            assert(entry.has_joined, 'Not joined');
            assert(!entry.completed, 'Already completed');
            assert(entry.attempts_used < MAX_ATTEMPTS, 'Max attempts reached');

            // ── ZK Verification (STUBBED) ──
            // TODO: Replace with Garaga verifier call
            // let proof_result = IGaragaVerifier::verify(proof, public_inputs);
            // assert(proof_result, 'Invalid proof');
            // Extract clue_packed from verified public inputs
            // Verify commitment in public inputs matches tournament.solution_commitment

            entry.attempts_used += 1;

            // Store the attempt
            world.write_model(@TournamentAttempt {
                tournament_id,
                player: caller,
                attempt_number: entry.attempts_used,
                guess_packed,
                clue_packed,
            });

            world.emit_event(@GuessVerified {
                tournament_id,
                player: caller,
                attempt_number: entry.attempts_used,
                clue_packed,
            });

            // Check win condition
            if clue_packed == ALL_CORRECT_CLUE {
                entry.did_win = true;
                entry.completed = true;
                entry.completion_time = timestamp;

                world.emit_event(@TournamentWon {
                    tournament_id,
                    player: caller,
                    attempts_used: entry.attempts_used,
                    completion_time: timestamp,
                });
            } else if entry.attempts_used == MAX_ATTEMPTS {
                entry.completed = true;
                entry.completion_time = timestamp;
            }

            world.write_model(@entry);
        }

        fn end_tournament(
            ref self: ContractState,
            tournament_id: u64,
            solution_index: u32,
            solution_salt: felt252,
        ) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let config: TournamentConfig = world.read_model(CONFIG_ID);
            assert(caller == config.game_master, 'Not game master');

            let mut tournament: Tournament = world.read_model(tournament_id);
            assert(tournament.solution_commitment != 0, 'Tournament not found');
            assert(tournament.status == TournamentStatus::ACTIVE, 'Not active');

            // ── Commitment Verification (STUBBED) ──
            // TODO: Verify poseidon(solution_index, solution_salt) == tournament.solution_commitment
            // let computed = core::poseidon::poseidon_hash_span(
            //     array![solution_index.into(), solution_salt].span()
            // );
            // assert(computed == tournament.solution_commitment, 'Commitment mismatch');

            tournament.status = TournamentStatus::COMPLETED;
            tournament.solution_index = solution_index;
            tournament.solution_salt = solution_salt;

            world.write_model(@tournament);

            world.emit_event(@TournamentCompleted {
                tournament_id,
                solution_index,
            });
        }

        fn distribute_prizes(
            ref self: ContractState,
            tournament_id: u64,
            ranked_players: Array<starknet::ContractAddress>,
        ) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let config: TournamentConfig = world.read_model(CONFIG_ID);
            assert(caller == config.game_master, 'Not game master');

            let tournament: Tournament = world.read_model(tournament_id);
            assert(tournament.status == TournamentStatus::COMPLETED, 'Not completed');

            let num_ranked = ranked_players.len();
            assert(num_ranked > 0 && num_ranked <= 4, 'Invalid ranking count');

            // Calculate platform fee
            let platform_fee = (tournament.prize_pool * config.platform_fee_bps.into())
                / BPS_BASE;
            let distributable = tournament.prize_pool - platform_fee;

            // Prize split BPS based on number of ranked players
            let prize_bps: Array<u256> = array![
                PRIZE_1ST_BPS, PRIZE_2ND_BPS, PRIZE_3RD_BPS, PRIZE_4TH_BPS,
            ];

            // Calculate total BPS for the ranked players we have
            let mut total_bps: u256 = 0;
            let mut i: u32 = 0;
            while i < num_ranked {
                total_bps += *prize_bps.at(i);
                i += 1;
            };

            // Distribute prizes
            i = 0;
            while i < num_ranked {
                let player = *ranked_players.at(i);
                // Normalize: if only 2 players, redistribute unused BPS proportionally
                let amount = (distributable * *prize_bps.at(i)) / total_bps;
                let rank: u16 = (i + 1).try_into().unwrap();

                world.write_model(@TournamentRanking {
                    tournament_id,
                    rank,
                    player,
                    prize_amount: amount,
                });

                // ── ERC20 Transfer (STUBBED) ──
                // TODO: IERC20Dispatcher(STRK_ADDRESS).transfer(player, amount)

                world.emit_event(@PrizeDistributed {
                    tournament_id,
                    rank,
                    player,
                    amount,
                });

                i += 1;
            };

            // ── Platform Fee Transfer (STUBBED) ──
            // TODO: IERC20Dispatcher(STRK_ADDRESS).transfer(config.fee_recipient, platform_fee)
        }

        fn cancel_tournament(ref self: ContractState, tournament_id: u64) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let timestamp = get_block_timestamp();

            let config: TournamentConfig = world.read_model(CONFIG_ID);
            assert(caller == config.game_master, 'Not game master');

            let mut tournament: Tournament = world.read_model(tournament_id);
            assert(tournament.solution_commitment != 0, 'Tournament not found');
            assert(
                tournament.status == TournamentStatus::OPEN
                    || tournament.status == TournamentStatus::ACTIVE,
                'Cannot cancel',
            );

            tournament.status = TournamentStatus::CANCELLED;
            world.write_model(@tournament);

            // ── Refunds (STUBBED) ──
            // TODO: Iterate over players and refund entry fees
            // Each player would call a separate claim_refund function

            world.emit_event(@TournamentCancelled { tournament_id, cancelled_at: timestamp });
        }
    }

    // ─────────────── Internal ───────────────

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"tweetle_dojo")
        }
    }
}
