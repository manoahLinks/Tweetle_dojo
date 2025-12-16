use starknet::ContractAddress;

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct DailyGame {
    #[key]
    pub game_id: u64,
    pub word_index: felt252,
    pub starts_at: u64,
    pub expires_at: u64,
    pub winners_count: u64,
    pub players_count: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct DailyWinner {
    #[key]
    pub game_id: u64,
    #[key]
    pub winner_index: u64,
    pub player: ContractAddress,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct DailyPlayer {
    #[key]
    pub game_id: u64,
    #[key]
    pub player_index: u64,
    pub player: ContractAddress,
}