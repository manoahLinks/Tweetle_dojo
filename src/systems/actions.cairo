#[starknet::interface]
pub trait IActions<TContractState> {
    fn start_game(ref self: TContractState);
    fn submit_guess(ref self: TContractState, game_id: u64, guess: felt252);
}

#[dojo::contract]
mod actions {
    use super::IActions;
    use starknet::{get_caller_address, get_block_timestamp};
    use tweetle_dojo::models::{
        game::{ClassicGame, ClassicGameAttemptCount},
        attempt::ClassicAttempt,
        player::Player,
    };
    use tweetle_dojo::systems::word::word;
    use dojo::model::ModelStorage;

    #[abi(embed_v0)]
    impl ActionsImpl of IActions<ContractState> {
        fn start_game(ref self: ContractState) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut player: Player = world.read_model(caller);
            assert(player.is_registered, 'Player not registered');
            
            player.classic_game_count += 1;
            let game_id = player.classic_game_count;

            let word_count = word::ImplWordSelector::get_word_count(@self);
            let timestamp = get_block_timestamp();
            let word_index: felt252 = (timestamp % word_count.into()).into();

            let game = ClassicGame {
                player: caller,
                game_id,
                active_players: 1,
                starts_at: timestamp,
                expires_at: timestamp + 86400,
                word_index,
                has_ended: false,
            };

            let attempt_count = ClassicGameAttemptCount {
                player: caller,
                game_id,
                count: 0,
            };

            world.write_model(@player);
            world.write_model(@game);
            world.write_model(@attempt_count);
        }

        fn submit_guess(ref self: ContractState, game_id: u64, guess: felt252) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: ClassicGame = world.read_model((caller, game_id));
            assert(!game.has_ended, 'Game already ended');

            let mut attempt_info: ClassicGameAttemptCount = world.read_model((caller, game_id));
            assert(attempt_info.count < 6, 'Max attempts reached');

            assert(word::ImplWordSelector::is_valid_word(@self, guess), 'Invalid word');

            let target_word = word::ImplWordSelector::get_word(@self, game.word_index);
            let hint_packed = compare_words(target_word, guess);
            
            attempt_info.count += 1;
            let attempt = ClassicAttempt {
                player: caller,
                game_id,
                attempt_number: attempt_info.count,
                word: guess,
                hint_packed,
            };

            if hint_packed == 682 { // 0x2AA = 682
                game.has_ended = true;
                let mut player: Player = world.read_model(caller);
                player.points += (7 - attempt_info.count).into() * 10;
                world.write_model(@player);
            } else if attempt_info.count == 6 {
                game.has_ended = true;
            }

            world.write_model(@game);
            world.write_model(@attempt_info);
            world.write_model(@attempt);
        }
    }

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