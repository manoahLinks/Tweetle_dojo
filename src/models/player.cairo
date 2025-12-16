use starknet::ContractAddress;

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Player {
    #[key]
    pub address: ContractAddress,
    pub username: felt252,
    pub classic_game_count: u64,
    pub points: u64,
    pub is_registered: bool,
    pub referrer: ContractAddress,
    pub friends_count: u256,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct PlayerUsername {
    #[key]
    pub username: felt252,
    pub address: ContractAddress,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct PlayerFriend {
    #[key]
    pub referrer: ContractAddress,
    #[key]
    pub friend_index: u256,
    pub friend_address: ContractAddress,
}
