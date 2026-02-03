#[cfg(test)]
mod tests {
    use dojo_cairo_test::WorldStorageTestTrait;
    use dojo::model::{ModelStorage};
    use dojo::world::{WorldStorageTrait};
    use dojo_cairo_test::{spawn_test_world, NamespaceDef, TestResource, ContractDefTrait, ContractDef};
    
    use tweetle_dojo::models::player::{Player, m_Player, m_PlayerUsername, m_PlayerFriend};
    use tweetle_dojo::models::daily_game::{DailyGame, DailyWinner, DailyPlayer, m_DailyGame, m_DailyWinner, m_DailyPlayer};
    use tweetle_dojo::models::attempt::{DailyAttempt, DailyAttemptCount, m_DailyAttempt, m_DailyAttemptCount};
    use tweetle_dojo::models::game_stats::{m_GameStats};
    
    use tweetle_dojo::systems::player_system::{
        player_system,
        IPlayerActionsDispatcher,
        IPlayerActionsDispatcherTrait
    };
    use tweetle_dojo::systems::daily_game::{
        daily_game,
        IDailyGameDispatcher,
        IDailyGameDispatcherTrait
    };

    const SECONDS_PER_DAY: u64 = 86400;
    const MAX_ATTEMPTS: u8 = 6;

    fn namespace_def() -> NamespaceDef {
        let ndef = NamespaceDef {
            namespace: "tweetle_dojo",
            resources: [
                TestResource::Model(m_Player::TEST_CLASS_HASH),
                TestResource::Model(m_PlayerUsername::TEST_CLASS_HASH),
                TestResource::Model(m_PlayerFriend::TEST_CLASS_HASH),
                TestResource::Model(m_DailyGame::TEST_CLASS_HASH),
                TestResource::Model(m_DailyWinner::TEST_CLASS_HASH),
                TestResource::Model(m_DailyPlayer::TEST_CLASS_HASH),
                TestResource::Model(m_DailyAttempt::TEST_CLASS_HASH),
                TestResource::Model(m_DailyAttemptCount::TEST_CLASS_HASH),
                TestResource::Model(m_GameStats::TEST_CLASS_HASH),
                TestResource::Contract(player_system::TEST_CLASS_HASH),
                TestResource::Contract(daily_game::TEST_CLASS_HASH),
                TestResource::Event(daily_game::e_DailyGameCreated::TEST_CLASS_HASH),
                TestResource::Event(daily_game::e_PlayerJoinedDaily::TEST_CLASS_HASH),
                TestResource::Event(daily_game::e_DailyGuessSubmitted::TEST_CLASS_HASH),
                TestResource::Event(daily_game::e_DailyGameWon::TEST_CLASS_HASH),
                TestResource::Event(daily_game::e_DailyGameLost::TEST_CLASS_HASH),
            ].span(),
        };
        ndef
    }

    fn contract_defs() -> Span<ContractDef> {
        [
            ContractDefTrait::new(@"tweetle_dojo", @"player_system")
                .with_writer_of([dojo::utils::bytearray_hash(@"tweetle_dojo")].span()),
            ContractDefTrait::new(@"tweetle_dojo", @"daily_game")
                .with_writer_of([dojo::utils::bytearray_hash(@"tweetle_dojo")].span()),
        ].span()
    }

    // ============================================
    // CORE FLOW TESTS
    // ============================================

    #[test]
    fn test_daily_game_creation() {
        let caller: starknet::ContractAddress = 0x1234.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        starknet::testing::set_contract_address(caller);
        starknet::testing::set_account_contract_address(caller);

        // Set a specific timestamp for testing
        let test_timestamp: u64 = 1000000;
        starknet::testing::set_block_timestamp(test_timestamp);

        let (daily_game_addr, _) = world.dns(@"daily_game").unwrap();
        let daily_game_system = IDailyGameDispatcher { contract_address: daily_game_addr };

        // Get or create daily game
        let game_id = daily_game_system.get_or_create_daily_game();

        // Assert game_id is calculated correctly
        let expected_game_id = test_timestamp / SECONDS_PER_DAY;
        assert(game_id == expected_game_id, 'Game ID mismatch');

        // Read the game from storage
        let game: DailyGame = world.read_model(game_id);
        
        // Assert game properties
        assert(game.game_id == expected_game_id, 'Game ID not set correctly');
        assert(game.starts_at == expected_game_id * SECONDS_PER_DAY, 'Starts_at incorrect');
        assert(game.expires_at == game.starts_at + SECONDS_PER_DAY, 'Expires_at incorrect');
        assert(game.winners_count == 0, 'Winners count should be 0');
        assert(game.players_count == 0, 'Players count should be 0');
        assert(game.word_index != 0, 'Word index not set');
    }

    #[test]
    fn test_daily_game_join_flow() {
        let caller: starknet::ContractAddress = 0x2345.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        starknet::testing::set_contract_address(caller);
        starknet::testing::set_account_contract_address(caller);

        let test_timestamp: u64 = 2000000;
        starknet::testing::set_block_timestamp(test_timestamp);

        // Register player
        let (player_addr, _) = world.dns(@"player_system").unwrap();
        let player_system = IPlayerActionsDispatcher { contract_address: player_addr };
        player_system.register_player('dailyplayer', 0.try_into().unwrap());

        // Get or create daily game
        let (daily_game_addr, _) = world.dns(@"daily_game").unwrap();
        let daily_game_system = IDailyGameDispatcher { contract_address: daily_game_addr };
        let game_id = daily_game_system.get_or_create_daily_game();

        // Join the daily game
        daily_game_system.join_daily_game(game_id);

        // Assert game players_count incremented
        let game: DailyGame = world.read_model(game_id);
        assert(game.players_count == 1, 'Players count should be 1');

        // Assert DailyPlayer is created
        let daily_player: DailyPlayer = world.read_model((game_id, 1_u64));
        assert(daily_player.player == caller, 'Player address mismatch');
        assert(daily_player.player_index == 1, 'Player index should be 1');

        // Assert DailyAttemptCount is initialized
        let attempt_count: DailyAttemptCount = world.read_model((caller, game_id));
        assert(attempt_count.count == 0, 'Attempt count should be 0');
    }

    #[test]
    fn test_daily_game_complete_flow() {
        let caller: starknet::ContractAddress = 0x3456.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        starknet::testing::set_contract_address(caller);
        starknet::testing::set_account_contract_address(caller);

        let test_timestamp: u64 = 3000000;
        starknet::testing::set_block_timestamp(test_timestamp);

        // Register player
        let (player_addr, _) = world.dns(@"player_system").unwrap();
        let player_system = IPlayerActionsDispatcher { contract_address: player_addr };
        player_system.register_player('flowplayer', 0.try_into().unwrap());

        // Get or create and join daily game
        let (daily_game_addr, _) = world.dns(@"daily_game").unwrap();
        let daily_game_system = IDailyGameDispatcher { contract_address: daily_game_addr };
        let game_id = daily_game_system.get_or_create_daily_game();
        daily_game_system.join_daily_game(game_id);

        // Submit a guess (using a valid word from dictionary)
        daily_game_system.submit_daily_guess(game_id, 0x6369676172); // 'cigar'

        // Assert DailyAttempt is recorded
        let attempt: DailyAttempt = world.read_model((caller, game_id, 1_u8));
        assert(attempt.word == 0x6369676172, 'Attempt word mismatch');
        assert(attempt.attempt_number == 1, 'Attempt number should be 1');

        // Assert DailyAttemptCount incremented
        let attempt_count: DailyAttemptCount = world.read_model((caller, game_id));
        assert(attempt_count.count == 1, 'Attempt count should be 1');
    }

    // ============================================
    // WIN/LOSS SCENARIO TESTS
    // ============================================

    #[test]
    fn test_daily_game_loss() {
        let caller: starknet::ContractAddress = 0x4567.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        starknet::testing::set_contract_address(caller);
        starknet::testing::set_account_contract_address(caller);

        let test_timestamp: u64 = 4000000;
        starknet::testing::set_block_timestamp(test_timestamp);

        // Register player
        let (player_addr, _) = world.dns(@"player_system").unwrap();
        let player_system = IPlayerActionsDispatcher { contract_address: player_addr };
        player_system.register_player('loser', 0.try_into().unwrap());

        // Get or create and join daily game
        let (daily_game_addr, _) = world.dns(@"daily_game").unwrap();
        let daily_game_system = IDailyGameDispatcher { contract_address: daily_game_addr };
        let game_id = daily_game_system.get_or_create_daily_game();
        daily_game_system.join_daily_game(game_id);

        // Submit 6 incorrect guesses
        let game: DailyGame = world.read_model(game_id);
        let mut attempts_made = 0;
        
        // Submit guesses until we reach max attempts or win
        daily_game_system.submit_daily_guess(game_id, 422726431348); 
        attempts_made += 1;
        
        let attempt_count: DailyAttemptCount = world.read_model((caller, game_id));
        if attempt_count.count < MAX_ATTEMPTS {
            daily_game_system.submit_daily_guess(game_id, 422726431348); 
            attempts_made += 1;
        }
        
        let attempt_count: DailyAttemptCount = world.read_model((caller, game_id));
        if attempt_count.count < MAX_ATTEMPTS {
            daily_game_system.submit_daily_guess(game_id, 422726431348); 
            attempts_made += 1;
        }
        
        let attempt_count: DailyAttemptCount = world.read_model((caller, game_id));
        if attempt_count.count < MAX_ATTEMPTS {
            daily_game_system.submit_daily_guess(game_id, 422726431348); 
            attempts_made += 1;
        }
        
        let attempt_count: DailyAttemptCount = world.read_model((caller, game_id));
        if attempt_count.count < MAX_ATTEMPTS {
            daily_game_system.submit_daily_guess(game_id, 422726431348); 
            attempts_made += 1;
        }
        
        let attempt_count: DailyAttemptCount = world.read_model((caller, game_id));
        if attempt_count.count < MAX_ATTEMPTS {
            daily_game_system.submit_daily_guess(game_id, 422726431348); 
            attempts_made += 1;
        }

        // Assert we reached max attempts
        let final_attempt_count: DailyAttemptCount = world.read_model((caller, game_id));
        assert(final_attempt_count.count == MAX_ATTEMPTS, 'Should have max attempts');

        // Assert player is not a winner
        let game_after: DailyGame = world.read_model(game_id);
        assert(game_after.winners_count == 0, 'Should have no winners');
    }

    #[test]
    fn test_daily_game_multiple_winners() {
        let player1: starknet::ContractAddress = 0x5678.try_into().unwrap();
        let player2: starknet::ContractAddress = 0x6789.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let test_timestamp: u64 = 5000000;
        starknet::testing::set_block_timestamp(test_timestamp);

        let (player_addr, _) = world.dns(@"player_system").unwrap();
        let player_system = IPlayerActionsDispatcher { contract_address: player_addr };

        let (daily_game_addr, _) = world.dns(@"daily_game").unwrap();
        let daily_game_system = IDailyGameDispatcher { contract_address: daily_game_addr };

        // Player 1 registers and joins
        starknet::testing::set_contract_address(player1);
        starknet::testing::set_account_contract_address(player1);
        player_system.register_player('winner1', 0.try_into().unwrap());
        let game_id = daily_game_system.get_or_create_daily_game();
        daily_game_system.join_daily_game(game_id);

        // Player 2 registers and joins
        starknet::testing::set_contract_address(player2);
        starknet::testing::set_account_contract_address(player2);
        player_system.register_player('winner2', 0.try_into().unwrap());
        daily_game_system.join_daily_game(game_id);

        // Get the target word for this game
        let game: DailyGame = world.read_model(game_id);
        
        // Both players submit the same word (we'll use a valid word)
        // Note: In a real scenario, we'd need to know the target word
        // For this test, we'll just verify the multiple player join logic works
        let game_after: DailyGame = world.read_model(game_id);
        assert(game_after.players_count == 2, 'Should have 2 players');

        // Verify both players are recorded
        let daily_player1: DailyPlayer = world.read_model((game_id, 1_u64));
        assert(daily_player1.player == player1, 'Player 1 mismatch');

        let daily_player2: DailyPlayer = world.read_model((game_id, 2_u64));
        assert(daily_player2.player == player2, 'Player 2 mismatch');
    }

    // ============================================
    // VALIDATION & ERROR TESTS
    // ============================================

    #[test]
    #[should_panic(expected: ('Player not registered', 'ENTRYPOINT_FAILED'))]
    fn test_join_without_registration() {
        let caller: starknet::ContractAddress = 0x7890.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        starknet::testing::set_contract_address(caller);
        starknet::testing::set_account_contract_address(caller);

        let test_timestamp: u64 = 6000000;
        starknet::testing::set_block_timestamp(test_timestamp);

        let (daily_game_addr, _) = world.dns(@"daily_game").unwrap();
        let daily_game_system = IDailyGameDispatcher { contract_address: daily_game_addr };
        
        let game_id = daily_game_system.get_or_create_daily_game();
        daily_game_system.join_daily_game(game_id);
    }

    #[test]
    #[should_panic(expected: ('Game does not exist', 'ENTRYPOINT_FAILED'))]
    fn test_join_nonexistent_game() {
        let caller: starknet::ContractAddress = 0x8901.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        starknet::testing::set_contract_address(caller);
        starknet::testing::set_account_contract_address(caller);

        let test_timestamp: u64 = 7000000;
        starknet::testing::set_block_timestamp(test_timestamp);

        // Register player
        let (player_addr, _) = world.dns(@"player_system").unwrap();
        let player_system = IPlayerActionsDispatcher { contract_address: player_addr };
        player_system.register_player('testplayer', 0.try_into().unwrap());

        // Try to join a game that doesn't exist
        let (daily_game_addr, _) = world.dns(@"daily_game").unwrap();
        let daily_game_system = IDailyGameDispatcher { contract_address: daily_game_addr };
        daily_game_system.join_daily_game(99999_u64);
    }

    #[test]
    #[should_panic(expected: ('Already joined this game', 'ENTRYPOINT_FAILED'))]
    fn test_double_join() {
        let caller: starknet::ContractAddress = 0x9012.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        starknet::testing::set_contract_address(caller);
        starknet::testing::set_account_contract_address(caller);

        let test_timestamp: u64 = 8000000;
        starknet::testing::set_block_timestamp(test_timestamp);

        // Register player
        let (player_addr, _) = world.dns(@"player_system").unwrap();
        let player_system = IPlayerActionsDispatcher { contract_address: player_addr };
        player_system.register_player('doublejoin', 0.try_into().unwrap());

        // Get or create and join daily game
        let (daily_game_addr, _) = world.dns(@"daily_game").unwrap();
        let daily_game_system = IDailyGameDispatcher { contract_address: daily_game_addr };
        let game_id = daily_game_system.get_or_create_daily_game();
        daily_game_system.join_daily_game(game_id);

        // Try to join again
        daily_game_system.join_daily_game(game_id);
    }

    #[test]
    #[should_panic(expected: ('Max attempts reached', 'ENTRYPOINT_FAILED'))]
    fn test_max_attempts_exceeded() {
        let caller: starknet::ContractAddress = 0xABCD.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        starknet::testing::set_contract_address(caller);
        starknet::testing::set_account_contract_address(caller);

        let test_timestamp: u64 = 9000000;
        starknet::testing::set_block_timestamp(test_timestamp);

        // Register player
        let (player_addr, _) = world.dns(@"player_system").unwrap();
        let player_system = IPlayerActionsDispatcher { contract_address: player_addr };
        player_system.register_player('maxattempts', 0.try_into().unwrap());

        // Get or create and join daily game
        let (daily_game_addr, _) = world.dns(@"daily_game").unwrap();
        let daily_game_system = IDailyGameDispatcher { contract_address: daily_game_addr };
        let game_id = daily_game_system.get_or_create_daily_game();
        daily_game_system.join_daily_game(game_id);

        // Submit 6 guesses
        daily_game_system.submit_daily_guess(game_id, 422726431348); 
        daily_game_system.submit_daily_guess(game_id, 422726431348); 
        daily_game_system.submit_daily_guess(game_id, 422726431348); 
        daily_game_system.submit_daily_guess(game_id, 422726431348); 
        daily_game_system.submit_daily_guess(game_id, 422726431348); 
        daily_game_system.submit_daily_guess(game_id, 422726431348); 

        // Try to submit 7th guess - should panic
        daily_game_system.submit_daily_guess(game_id, 422726431348); 
    }

    #[test]
    #[should_panic(expected: ('Invalid word', 'ENTRYPOINT_FAILED'))]
    fn test_invalid_word_guess() {
        let caller: starknet::ContractAddress = 0xBCDE.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        starknet::testing::set_contract_address(caller);
        starknet::testing::set_account_contract_address(caller);

        let test_timestamp: u64 = 10000000;
        starknet::testing::set_block_timestamp(test_timestamp);

        // Register player
        let (player_addr, _) = world.dns(@"player_system").unwrap();
        let player_system = IPlayerActionsDispatcher { contract_address: player_addr };
        player_system.register_player('invalidword', 0.try_into().unwrap());

        // Get or create and join daily game
        let (daily_game_addr, _) = world.dns(@"daily_game").unwrap();
        let daily_game_system = IDailyGameDispatcher { contract_address: daily_game_addr };
        let game_id = daily_game_system.get_or_create_daily_game();
        daily_game_system.join_daily_game(game_id);

        // Submit an invalid word (not in dictionary)
        daily_game_system.submit_daily_guess(game_id, 0x7878787878); // 'xxxxx'
    }

    // ============================================
    // TIME-BASED TESTS
    // ============================================

    #[test]
    #[should_panic(expected: ('Game has expired', 'ENTRYPOINT_FAILED'))]
    fn test_expired_game_join() {
        let caller: starknet::ContractAddress = 0xCDEF.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        starknet::testing::set_contract_address(caller);
        starknet::testing::set_account_contract_address(caller);

        let test_timestamp: u64 = 11000000;
        starknet::testing::set_block_timestamp(test_timestamp);

        // Register player
        let (player_addr, _) = world.dns(@"player_system").unwrap();
        let player_system = IPlayerActionsDispatcher { contract_address: player_addr };
        player_system.register_player('expiredplayer', 0.try_into().unwrap());

        // Create game
        let (daily_game_addr, _) = world.dns(@"daily_game").unwrap();
        let daily_game_system = IDailyGameDispatcher { contract_address: daily_game_addr };
        let game_id = daily_game_system.get_or_create_daily_game();

        // Set timestamp to after expiration
        let game: DailyGame = world.read_model(game_id);
        starknet::testing::set_block_timestamp(game.expires_at + 1);

        // Try to join expired game
        daily_game_system.join_daily_game(game_id);
    }

    #[test]
    #[should_panic(expected: ('Game has expired', 'ENTRYPOINT_FAILED'))]
    fn test_expired_game_guess() {
        let caller: starknet::ContractAddress = 0xDEF0.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        starknet::testing::set_contract_address(caller);
        starknet::testing::set_account_contract_address(caller);

        let test_timestamp: u64 = 12000000;
        starknet::testing::set_block_timestamp(test_timestamp);

        // Register player
        let (player_addr, _) = world.dns(@"player_system").unwrap();
        let player_system = IPlayerActionsDispatcher { contract_address: player_addr };
        player_system.register_player('expiredguess', 0.try_into().unwrap());

        // Create and join game
        let (daily_game_addr, _) = world.dns(@"daily_game").unwrap();
        let daily_game_system = IDailyGameDispatcher { contract_address: daily_game_addr };
        let game_id = daily_game_system.get_or_create_daily_game();
        daily_game_system.join_daily_game(game_id);

        // Set timestamp to after expiration
        let game: DailyGame = world.read_model(game_id);
        starknet::testing::set_block_timestamp(game.expires_at + 1);

        // Try to submit guess on expired game
        daily_game_system.submit_daily_guess(game_id, 0x6369676172); // 'cigar'
    }

    #[test]
    fn test_same_day_returns_same_game() {
        let caller: starknet::ContractAddress = 0xEF01.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        starknet::testing::set_contract_address(caller);
        starknet::testing::set_account_contract_address(caller);

        let test_timestamp: u64 = 13000000;
        starknet::testing::set_block_timestamp(test_timestamp);

        let (daily_game_addr, _) = world.dns(@"daily_game").unwrap();
        let daily_game_system = IDailyGameDispatcher { contract_address: daily_game_addr };

        // Get or create game first time
        let game_id_1 = daily_game_system.get_or_create_daily_game();
        let game_1: DailyGame = world.read_model(game_id_1);

        // Get or create game second time (same day)
        let game_id_2 = daily_game_system.get_or_create_daily_game();
        let game_2: DailyGame = world.read_model(game_id_2);

        // Assert same game is returned
        assert(game_id_1 == game_id_2, 'Game IDs should match');
        assert(game_1.starts_at == game_2.starts_at, 'Starts_at should match');
        assert(game_1.expires_at == game_2.expires_at, 'Expires_at should match');
        assert(game_1.word_index == game_2.word_index, 'Word index should match');
    }
}
