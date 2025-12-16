use starknet::ContractAddress;

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct ClassicGame {
    #[key]
    pub player: ContractAddress,
    #[key]
    pub game_id: u64,
    pub active_players: u256,
    pub starts_at: u64,
    pub expires_at: u64,
    pub word_index: felt252,
    pub has_ended: bool,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct ClassicGameAttemptCount {
    #[key]
    pub player: ContractAddress,
    #[key]
    pub game_id: u64,
    pub count: u8,
}