#[cfg(test)]
mod tests {
    use dojo_cairo_test::WorldStorageTestTrait;
    use dojo::model::ModelStorage;
    use dojo::world::WorldStorageTrait;
    use dojo_cairo_test::{spawn_test_world, NamespaceDef, TestResource, ContractDefTrait, ContractDef};
    use tweetle_dojo::models::player::{Player, PlayerUsername};
    use tweetle_dojo::systems::player_system::{
        player_system,
        IPlayerActionsDispatcher,
        IPlayerActionsDispatcherTrait
    };
    use starknet::ContractAddress;

    fn namespace_def() -> NamespaceDef {
        NamespaceDef {
            namespace: "tweetle_dojo",
            resources: [
                TestResource::Model(Player::TEST_CLASS_HASH),
                TestResource::Model(PlayerUsername::TEST_CLASS_HASH),
                TestResource::Contract(player_system::TEST_CLASS_HASH),
            ].span(),
        }
    }

    fn contract_defs() -> Span<ContractDef> {
        [ContractDefTrait::new(@"tweetle_dojo", @"player_system")].span()
    }

    #[test]
    fn test_register_player() {
        // Setup
        let caller: starknet::ContractAddress = 0x1234.try_into().unwrap();
        let username: felt252 = 0xabcdef;
        let referrer: ContractAddress = 0.try_into().unwrap();
        
        let ndef = namespace_def();
        let mut world = spawn_test_world(dojo::world::world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        // Player system dispatcher
        let (contract_address, _) = world.dns(@"player_system").unwrap();
        let player_actions = IPlayerActionsDispatcher { contract_address };

        // Register the player
        player_actions.register_player(username, referrer);

        // Read registered player state
        let player: Player = world.read_model(caller);
        assert(player.is_registered, 'Player was not registered');
        assert(player.username == username, 'Username mismatch');
        // Add other asserts as needed (classic_game_count == 0, points == 0, etc.)
    }
}