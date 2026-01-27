use starknet::ContractAddress;

#[starknet::interface]
pub trait IPlayerActions<TContractState> {
    fn register_player(ref self: TContractState, username: felt252, referrer: ContractAddress);
}

#[dojo::contract]
mod player_system {
    use super::IPlayerActions;
    use starknet::{ContractAddress, get_caller_address};
    use tweetle_dojo::models::{
        player::{Player, PlayerUsername, PlayerFriend},
        game_stats::GameStats
    };
    use core::num::traits::Zero;
    use dojo::model::ModelStorage;

    #[abi(embed_v0)]
    impl PlayerActionsImpl of IPlayerActions<ContractState> {
        fn register_player(
            ref self: ContractState,
            username: felt252,
            referrer: ContractAddress
        ) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            
            // Check if player already registered
            let mut player: Player = world.read_model(caller);
            assert(!player.is_registered, 'Player already registered');
            
            // Check if username is taken
            let username_check: PlayerUsername = world.read_model(username);
            assert(username_check.address.is_zero(), 'Username already taken');
            
            // Get game stats and increment player count
            let mut stats: GameStats = world.read_model(0);
            stats.player_count += 1;
            
            // Register player
            player.address = caller;
            player.username = username;
            player.is_registered = true;
            player.classic_game_count = 0;
            player.points = 0;
            player.friends_count = 0;
            
            // Handle referrer
            if !referrer.is_zero() && referrer != caller {
                let mut referrer_player: Player = world.read_model(referrer);
                if referrer_player.is_registered {
                    player.referrer = referrer;
                    
                    // Add to referrer's friend list
                    let _friend_entry = PlayerFriend {
                        referrer: referrer,
                        friend_index: referrer_player.friends_count,
                        friend_address: caller
                    };
                    
                    // Update referrer's friend count
                    let mut updated_referrer = referrer_player;
                    updated_referrer.friends_count += 1;
                    
                    world.write_model(@updated_referrer);
                }
            }
            
            // Map username to address
            let _username_mapping = PlayerUsername {
                username,
                address: caller
            };
            
            world.write_model(@player);
            
            // Emit event
            // emit!(world, PlayerRegistered { player: caller, username });
            // world.emit_event(@PlayerRegistered { player: caller, username }); // i will add this event later
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        /// Use the default namespace "dojo_starter". This function is handy since the ByteArray
        /// can't be const.
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"tweetle_dojo")
        }
    }
}