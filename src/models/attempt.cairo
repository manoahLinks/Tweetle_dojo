use starknet::ContractAddress;

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct ClassicAttempt {
    #[key]
    pub player: ContractAddress,
    #[key]
    pub game_id: u64,
    #[key]
    pub attempt_number: u8,
    pub word: felt252,
    pub hint_packed: u16,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct DailyAttempt {
    #[key]
    pub player: ContractAddress,
    #[key]
    pub game_id: u64,
    #[key]
    pub attempt_number: u8,
    pub word: felt252,
    pub hint_packed: u16,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct DailyAttemptCount {
    #[key]
    pub player: ContractAddress,
    #[key]
    pub game_id: u64,
    pub count: u8,
    pub has_joined: bool,
}