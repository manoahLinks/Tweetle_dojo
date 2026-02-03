#[starknet::interface]
pub trait IDailyGame<TContractState> {
    fn get_or_create_daily_game(ref self: TContractState) -> u64;
    fn join_daily_game(ref self: TContractState, game_id: u64);
    fn submit_daily_guess(ref self: TContractState, game_id: u64, guess: felt252);
}

#[dojo::contract]
mod daily_game {
    use super::IDailyGame;
    use starknet::{get_caller_address, get_block_timestamp};
    use tweetle_dojo::models::{
        daily_game::{DailyGame, DailyWinner, DailyPlayer},
        attempt::{DailyAttempt, DailyAttemptCount},
        player::Player,
    };
    use tweetle_dojo::systems::word::word;
    use dojo::model::ModelStorage;
    use starknet::ContractAddress;
    use dojo::event::EventStorage;

    // Constants
    const SECONDS_PER_DAY: u64 = 86400;
    const MAX_ATTEMPTS: u8 = 6;

    // Events
    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct DailyGameCreated {
        #[key]
        pub game_id: u64,
        pub starts_at: u64,
        pub expires_at: u64,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct PlayerJoinedDaily {
        #[key]
        pub game_id: u64,
        pub player: ContractAddress,
        pub player_index: u64,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct DailyGuessSubmitted {
        #[key]
        pub game_id: u64,
        pub player: ContractAddress,
        pub attempt_number: u8,
        pub word: felt252,
        pub hint_packed: u16,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct DailyGameWon {
        #[key]
        pub game_id: u64,
        pub player: ContractAddress,
        pub attempts: u8,
        pub points_earned: u64,
        pub winner_index: u64,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct DailyGameLost {
        #[key]
        pub game_id: u64,
        pub player: ContractAddress,
    }

    #[abi(embed_v0)]
    impl DailyGameImpl of IDailyGame<ContractState> {
        /// Gets the current daily game or creates a new one if none exists for today
        fn get_or_create_daily_game(ref self: ContractState) -> u64 {
            let mut world = self.world_default();
            let timestamp = get_block_timestamp();
            
            // Calculate the game_id based on the current day (days since epoch)
            let game_id: u64 = timestamp / SECONDS_PER_DAY;
            
            // Try to read existing game
            let existing_game: DailyGame = world.read_model(game_id);
            
            // If game doesn't exist (starts_at == 0), create it
            if existing_game.starts_at == 0 {
                let word_count = word::ImplWordSelector::get_word_count(@self);
                let word_index: felt252 = (timestamp % word_count.into()).into();
                
                let starts_at = game_id * SECONDS_PER_DAY;
                let expires_at = starts_at + SECONDS_PER_DAY;
                
                let new_game = DailyGame {
                    game_id,
                    word_index,
                    starts_at,
                    expires_at,
                    winners_count: 0,
                    players_count: 0,
                };
                
                world.write_model(@new_game);
                
                world.emit_event(@DailyGameCreated {
                    game_id,
                    starts_at,
                    expires_at,
                });
            }
            
            game_id
        }

        /// Join the daily game
        fn join_daily_game(ref self: ContractState, game_id: u64) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let timestamp = get_block_timestamp();

            // Verify player is registered
            let player: Player = world.read_model(caller);
            assert(player.is_registered, 'Player not registered');

            // Read the game
            let mut game: DailyGame = world.read_model(game_id);
            assert(game.starts_at != 0, 'Game does not exist');
            assert(timestamp < game.expires_at, 'Game has expired');

            // Check if player already joined
            let existing_attempt: DailyAttemptCount = world.read_model((caller, game_id));
            assert(!existing_attempt.has_joined, 'Already joined this game');

            // Increment player count and add player to game
            game.players_count += 1;
            let player_index = game.players_count;

            let daily_player = DailyPlayer {
                game_id,
                player_index,
                player: caller,
            };

            // Initialize attempt count for this player
            let attempt_count = DailyAttemptCount {
                player: caller,
                game_id,
                count: 0,
                has_joined: true,
            };

            world.write_model(@game);
            world.write_model(@daily_player);
            world.write_model(@attempt_count);

            world.emit_event(@PlayerJoinedDaily {
                game_id,
                player: caller,
                player_index,
            });
        }

        /// Submit a guess for the daily game
        fn submit_daily_guess(ref self: ContractState, game_id: u64, guess: felt252) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let timestamp = get_block_timestamp();

            // Read and validate the game
            let mut game: DailyGame = world.read_model(game_id);
            assert(game.starts_at != 0, 'Game does not exist');
            assert(timestamp < game.expires_at, 'Game has expired');

            // Read and validate attempt count
            let mut attempt_info: DailyAttemptCount = world.read_model((caller, game_id));
            assert(attempt_info.has_joined, 'Must join game first');
            assert(attempt_info.count < MAX_ATTEMPTS, 'Max attempts reached');

            // Validate the word
            assert(word::ImplWordSelector::is_valid_word(@self, guess), 'Invalid word');

            // Get target word and compare
            let target_word = word::ImplWordSelector::get_word(@self, game.word_index);
            let hint_packed = compare_words(target_word, guess);

            // Increment attempt count
            attempt_info.count += 1;

            // Create the attempt record
            let attempt = DailyAttempt {
                player: caller,
                game_id,
                attempt_number: attempt_info.count,
                word: guess,
                hint_packed,
            };

            world.emit_event(@DailyGuessSubmitted {
                game_id,
                player: caller,
                attempt_number: attempt_info.count,
                word: guess,
                hint_packed,
            });

            // Check for win (all correct = 0x2AA = 682)
            if hint_packed == 682 {
                // Add to winners
                game.winners_count += 1;
                let winner_index = game.winners_count;

                let winner = DailyWinner {
                    game_id,
                    winner_index,
                    player: caller,
                };

                // Award points to player
                let mut player: Player = world.read_model(caller);
                let points_earned: u64 = (7 - attempt_info.count).into() * 15; // Daily games give more points
                player.points += points_earned;
                
                world.write_model(@player);
                world.write_model(@winner);

                world.emit_event(@DailyGameWon {
                    game_id,
                    player: caller,
                    attempts: attempt_info.count,
                    points_earned,
                    winner_index,
                });

            } else if attempt_info.count == MAX_ATTEMPTS {
                world.emit_event(@DailyGameLost {
                    game_id,
                    player: caller,
                });
            }

            world.write_model(@game);
            world.write_model(@attempt_info);
            world.write_model(@attempt);
        }
    }

    // Word comparison logic (same as classic game)
    fn compare_words(target: felt252, guess: felt252) -> u16 {
        let (t0, t1, t2, t3, t4) = felt_to_bytes5(target);
        let (g0, g1, g2, g3, g4) = felt_to_bytes5(guess);
        
        let mut s0 = 0_u16;
        let mut s1 = 0_u16;
        let mut s2 = 0_u16;
        let mut s3 = 0_u16;
        let mut s4 = 0_u16;
        
        let mut u0 = false;
        let mut u1 = false;
        let mut u2 = false;
        let mut u3 = false;
        let mut u4 = false;

        // Corrects
        if g0 == t0 { s0 = 2; u0 = true; }
        if g1 == t1 { s1 = 2; u1 = true; }
        if g2 == t2 { s2 = 2; u2 = true; }
        if g3 == t3 { s3 = 2; u3 = true; }
        if g4 == t4 { s4 = 2; u4 = true; }

        // Misplaced
        if s0 == 0 {
            if !u0 && g0 == t0 { s0 = 1; u0 = true; }
            else if !u1 && g0 == t1 { s0 = 1; u1 = true; }
            else if !u2 && g0 == t2 { s0 = 1; u2 = true; }
            else if !u3 && g0 == t3 { s0 = 1; u3 = true; }
            else if !u4 && g0 == t4 { s0 = 1; u4 = true; }
        }
        if s1 == 0 {
            if !u0 && g1 == t0 { s1 = 1; u0 = true; }
            else if !u1 && g1 == t1 { s1 = 1; u1 = true; }
            else if !u2 && g1 == t2 { s1 = 1; u2 = true; }
            else if !u3 && g1 == t3 { s1 = 1; u3 = true; }
            else if !u4 && g1 == t4 { s1 = 1; u4 = true; }
        }
        if s2 == 0 {
            if !u0 && g2 == t0 { s2 = 1; u0 = true; }
            else if !u1 && g2 == t1 { s2 = 1; u1 = true; }
            else if !u2 && g2 == t2 { s2 = 1; u2 = true; }
            else if !u3 && g2 == t3 { s2 = 1; u3 = true; }
            else if !u4 && g2 == t4 { s2 = 1; u4 = true; }
        }
        if s3 == 0 {
            if !u0 && g3 == t0 { s3 = 1; u0 = true; }
            else if !u1 && g3 == t1 { s3 = 1; u1 = true; }
            else if !u2 && g3 == t2 { s3 = 1; u2 = true; }
            else if !u3 && g3 == t3 { s3 = 1; u3 = true; }
            else if !u4 && g3 == t4 { s3 = 1; u4 = true; }
        }
        if s4 == 0 {
            if !u0 && g4 == t0 { s4 = 1; u0 = true; }
            else if !u1 && g4 == t1 { s4 = 1; u1 = true; }
            else if !u2 && g4 == t2 { s4 = 1; u2 = true; }
            else if !u3 && g4 == t3 { s4 = 1; u3 = true; }
            else if !u4 && g4 == t4 { s4 = 1; u4 = true; }
        }

        s0 * 256 + s1 * 64 + s2 * 16 + s3 * 4 + s4
    }

    fn felt_to_bytes5(f: felt252) -> (u8, u8, u8, u8, u8) {
        let mut val: u256 = f.into();
        let b4: u8 = (val % 256).try_into().unwrap();
        val /= 256;
        let b3: u8 = (val % 256).try_into().unwrap();
        val /= 256;
        let b2: u8 = (val % 256).try_into().unwrap();
        val /= 256;
        let b1: u8 = (val % 256).try_into().unwrap();
        val /= 256;
        let b0: u8 = (val % 256).try_into().unwrap();
        (b0, b1, b2, b3, b4)
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"tweetle_dojo")
        }
    }
}
