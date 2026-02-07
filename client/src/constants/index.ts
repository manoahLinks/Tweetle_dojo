export const RPC_URL = 'https://api.cartridge.gg/x/starknet/sepolia';
export const CARTRIDGE_API_URL = 'https://api.cartridge.gg';
export const KEYCHAIN_URL = 'https://x.cartridge.gg';

// Tweetle Dojo contract addresses (from manifest_sepolia.json)
export const WORLD_ADDRESS =
  '0x45b2841cbd334ae7cb39c89fdea585341b4b7688e215076aede41fc354c3f8d';
export const ACTIONS_CONTRACT =
  '0x97b632e93243e3c8fa31ea94580ae1e54f8338015c811b6413455cdeb319b8';
export const DAILY_GAME_CONTRACT =
  '0x6b4d457983ca94b1c7ecda18411a01e5c1cbdd96cd4e92b46fd984df9751300';
export const PLAYER_SYSTEM_CONTRACT =
  '0x143fb2cfabb7277a1b8696284f0ca6327698d2db74097fe7967cc13975dd239';

// Token contracts on Sepolia
export const ETH_CONTRACT =
  '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';

// Session policies for Tweetle Dojo game actions
export const SESSION_POLICIES = [
  {
    contractAddress: PLAYER_SYSTEM_CONTRACT,
    entrypoint: 'register_player',
  },
  {
    contractAddress: ACTIONS_CONTRACT,
    entrypoint: 'start_game',
  },
  {
    contractAddress: ACTIONS_CONTRACT,
    entrypoint: 'submit_guess',
  },
  {
    contractAddress: DAILY_GAME_CONTRACT,
    entrypoint: 'get_or_create_daily_game',
  },
  {
    contractAddress: DAILY_GAME_CONTRACT,
    entrypoint: 'join_daily_game',
  },
  {
    contractAddress: DAILY_GAME_CONTRACT,
    entrypoint: 'submit_daily_guess',
  },
];
