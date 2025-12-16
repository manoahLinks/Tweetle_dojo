use starknet::ContractAddress;

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct GameStats {
    #[key]
    pub id: u8, // Always 0, singleton pattern
    pub player_count: u64,
    pub daily_games_count: u64,
    pub next_daily_update: u64,
    pub attempt_price: u256,
    pub daily_instructor: ContractAddress,
    pub token_address: ContractAddress,
}