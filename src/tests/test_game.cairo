#[cfg(test)]
mod tests {
    use dojo_cairo_test::WorldStorageTestTrait;
    use dojo::model::{ModelStorage};
    use dojo::world::{WorldStorageTrait};
    use dojo_cairo_test::{spawn_test_world, NamespaceDef, TestResource, ContractDefTrait, ContractDef};
    
    use tweetle_dojo::models::player::{Player, m_Player, m_PlayerUsername, m_PlayerFriend};
    use tweetle_dojo::models::game::{ClassicGame, ClassicGameAttemptCount, m_ClassicGame, m_ClassicGameAttemptCount};
    use tweetle_dojo::models::attempt::{ClassicAttempt, m_ClassicAttempt};
    use tweetle_dojo::models::game_stats::{m_GameStats};
    
    use tweetle_dojo::systems::player_system::{
        player_system,
        IPlayerActionsDispatcher,
        IPlayerActionsDispatcherTrait
    };
    use tweetle_dojo::systems::actions::{
        actions,
        IActionsDispatcher,
        IActionsDispatcherTrait
    };

    fn namespace_def() -> NamespaceDef {
        let ndef = NamespaceDef {
            namespace: "tweetle_dojo",
            resources: [
                TestResource::Model(m_Player::TEST_CLASS_HASH),
                TestResource::Model(m_PlayerUsername::TEST_CLASS_HASH),
                TestResource::Model(m_PlayerFriend::TEST_CLASS_HASH),
                TestResource::Model(m_ClassicGame::TEST_CLASS_HASH),
                TestResource::Model(m_ClassicGameAttemptCount::TEST_CLASS_HASH),
                TestResource::Model(m_ClassicAttempt::TEST_CLASS_HASH),
                TestResource::Model(m_GameStats::TEST_CLASS_HASH),
                TestResource::Contract(player_system::TEST_CLASS_HASH),
                TestResource::Contract(actions::TEST_CLASS_HASH),
                TestResource::Event(actions::e_GameStarted::TEST_CLASS_HASH),    
                TestResource::Event(actions::e_GuessSubmitted::TEST_CLASS_HASH),
                TestResource::Event(actions::e_GameWon::TEST_CLASS_HASH),
                TestResource::Event(actions::e_GameLost::TEST_CLASS_HASH),
            ].span(),
        };
        ndef
    }

    fn contract_defs() -> Span<ContractDef> {
        [
            ContractDefTrait::new(@"tweetle_dojo", @"player_system")
                .with_writer_of([dojo::utils::bytearray_hash(@"tweetle_dojo")].span()),
            ContractDefTrait::new(@"tweetle_dojo", @"actions")
                .with_writer_of([dojo::utils::bytearray_hash(@"tweetle_dojo")].span()),
        ].span()
    }

    #[test]
    fn test_game_flow() {
        let caller: starknet::ContractAddress = 0x1234.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        // Set caller address AFTER world setup
        starknet::testing::set_contract_address(caller);
        starknet::testing::set_account_contract_address(caller);

        // Get player system dispatcher
        let (player_addr, _) = world.dns(@"player_system").unwrap();
        let player_system = IPlayerActionsDispatcher { contract_address: player_addr };
        
        // Register player with username and no referrer
        player_system.register_player('testuser', 0.try_into().unwrap());

        // Verify player registration
        let player: Player = world.read_model(caller);
        assert(player.is_registered, 'Player not registered');
        assert(player.username == 'testuser', 'Username mismatch');
        assert(player.classic_game_count == 0, 'Initial game count != 0');

        // Get actions dispatcher
        let (actions_addr, _) = world.dns(@"actions").unwrap();
        let actions = IActionsDispatcher { contract_address: actions_addr };
        
        // Start a game
        actions.start_game();

        // Verify game was created
        let player_after_start: Player = world.read_model(caller);
        assert(player_after_start.classic_game_count == 1, 'Game count should be 1');

        // Verify game exists
        let game: ClassicGame = world.read_model((caller, 1_u64));
        assert(game.player == caller, 'Game player mismatch');
        assert(game.game_id == 1, 'Game id should be 1');
        assert(!game.has_ended, 'Game should be active');

        // Submit a guess (not the correct word)
        actions.submit_guess(1, 0x6369676172); // 'cigar'

        // Verify attempt was recorded
        let attempt_info: ClassicGameAttemptCount = world.read_model((caller, 1_u64));
        assert(attempt_info.count == 1, 'Attempt count should be 1');

        // Verify attempt details
        let attempt: ClassicAttempt = world.read_model((caller, 1_u64, 1_u64));
        assert(attempt.word == 0x6369676172, 'Attempt word mismatch');
        assert(attempt.attempt_number == 1, 'Attempt number should be 1');
    }

    #[test]
    fn test_multiple_guesses() {
        let caller: starknet::ContractAddress = 0x5678.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        starknet::testing::set_contract_address(caller);
        starknet::testing::set_account_contract_address(caller);

        let (player_addr, _) = world.dns(@"player_system").unwrap();
        let player_system = IPlayerActionsDispatcher { contract_address: player_addr };
        player_system.register_player('player2', 0.try_into().unwrap());

        let (actions_addr, _) = world.dns(@"actions").unwrap();
        let actions = IActionsDispatcher { contract_address: actions_addr };
        actions.start_game();

        // Submit multiple guesses (use words from the dictionary)
        actions.submit_guess(1, 0x6369676172); // 'cigar'
        
        // Check game hasn't ended after first guess
        let game: ClassicGame = world.read_model((caller, 1_u64));
        if !game.has_ended {
            actions.submit_guess(1, 0x6162616361); // 'abaca'
            actions.submit_guess(1, 0x616261636b); // 'aback'
            
            let attempt_info: ClassicGameAttemptCount = world.read_model((caller, 1_u64));
            assert(attempt_info.count == 3, 'Should have 3 attempts');
        }
    }

    #[test]
    #[should_panic(expected: ('Player already registered', 'ENTRYPOINT_FAILED'))]
    fn test_duplicate_registration() {
        let caller: starknet::ContractAddress = 0x9999.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        starknet::testing::set_contract_address(caller);
        starknet::testing::set_account_contract_address(caller);

        let (player_addr, _) = world.dns(@"player_system").unwrap();
        let player_system = IPlayerActionsDispatcher { contract_address: player_addr };
        
        player_system.register_player('duplicate', 0.try_into().unwrap());
        player_system.register_player('duplicate2', 0.try_into().unwrap());
    }

    #[test]
    #[should_panic(expected: ('Player not registered', 'ENTRYPOINT_FAILED'))]
    fn test_start_game_without_registration() {
        let caller: starknet::ContractAddress = 0xAAAA.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        starknet::testing::set_contract_address(caller);
        starknet::testing::set_account_contract_address(caller);

        let (actions_addr, _) = world.dns(@"actions").unwrap();
        let actions = IActionsDispatcher { contract_address: actions_addr };
        actions.start_game();
    }
}