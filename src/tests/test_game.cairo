#[cfg(test)]
mod tests {
    use dojo_cairo_test::WorldStorageTestTrait;
    use dojo::model::{ModelStorage, Model};
    use dojo::world::WorldStorageTrait;
    use dojo_cairo_test::{spawn_test_world, NamespaceDef, TestResource, ContractDefTrait, ContractDef};
    
    use tweetle_dojo::models::player::{Player, PlayerUsername, PlayerFriend};
    use tweetle_dojo::models::game::{ClassicGame, ClassicGameAttemptCount};
    use tweetle_dojo::models::attempt::{ClassicAttempt};
    
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
    use starknet::ContractAddress;

    fn namespace_def() -> NamespaceDef {
        NamespaceDef {
            namespace: "tweetle_dojo",
            resources: [
                TestResource::Model(Player::TEST_CLASS_HASH),
                TestResource::Model(PlayerUsername::TEST_CLASS_HASH),
                TestResource::Model(PlayerFriend::TEST_CLASS_HASH),
                TestResource::Model(ClassicGame::TEST_CLASS_HASH),
                TestResource::Model(ClassicGameAttemptCount::TEST_CLASS_HASH),
                TestResource::Model(ClassicAttempt::TEST_CLASS_HASH),
                TestResource::Contract(player_system::TEST_CLASS_HASH),
                TestResource::Contract(actions::TEST_CLASS_HASH),
            ].span(),
        }
    }

    fn contract_defs() -> Span<ContractDef> {
        [
            ContractDefTrait::new(@"tweetle_dojo", @"player_system"),
            ContractDefTrait::new(@"tweetle_dojo", @"actions"),
        ].span()
    }

    #[test]
    fn test_game_flow() {
        let caller = starknet::contract_address_const::<0x1234>();
        starknet::testing::set_caller_address(caller);
        
        let ndef = namespace_def();
        let mut world = spawn_test_world([ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let (player_addr, _) = world.dns(@"player_system").unwrap();
        let player_system = IPlayerActionsDispatcher { contract_address: player_addr };
        player_system.register_player('test', starknet::contract_address_const::<0x0>());

        let (actions_addr, _) = world.dns(@"actions").unwrap();
        let actions = IActionsDispatcher { contract_address: actions_addr };
        actions.start_game();

        let player: Player = world.read_model(caller);
        assert(player.classic_game_count == 1, 'game count fail');

        actions.submit_guess(1, 0x6369676172); // 'cigar'

        let attempt_info: ClassicGameAttemptCount = world.read_model((caller, 1));
        assert(attempt_info.count == 1, 'attempt count fail');
    }
}
