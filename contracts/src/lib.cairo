pub mod systems {
    pub mod actions;
    pub mod player_system;
    pub mod word;
    pub mod daily_game;
    pub mod tournament_manager;
    pub mod mock_verifier;
}

pub mod models {
    pub mod player;
    pub mod game;
    pub mod attempt;
    pub mod game_stats;
    pub mod daily_game;
    pub mod tournament;
    pub mod config;
}

pub mod tests {
    mod test_game;
    mod test_daily_game;
    mod test_tournament;
}
