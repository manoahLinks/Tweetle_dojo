import { TORII_URL } from './dojoConfig';

const GQL = `${TORII_URL}/graphql`;

// ── GraphQL fetch helper ──

async function gql<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Torii query failed: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'GraphQL error');
  return json.data;
}

// ── Poll helper — retries until condition is met ──

async function pollTorii<T>(
  queryFn: () => Promise<T | null>,
  maxAttempts = 20,
  intervalMs = 150,
): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await queryFn();
    if (result !== null) return result;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Torii polling timed out');
}

// ── Player ──

export async function fetchPlayer(address: string) {
  const data = await gql(`
    query ($address: String!) {
      tweetleDojoPlayerModels(where: { address: $address }, first: 1) {
        edges { node { address username classic_game_count points is_registered } }
      }
    }
  `, { address });
  const node = data.tweetleDojoPlayerModels?.edges?.[0]?.node;
  return node ?? null;
}

export async function pollPlayerRegistered(address: string) {
  return pollTorii(() => fetchPlayer(address));
}

// ── ClassicGame ──

export async function fetchLatestClassicGame(player: string) {
  const data = await gql(`
    query ($player: String!) {
      tweetleDojoClassicGameModels(
        where: { player: $player }
        order: { field: GAME_ID, direction: DESC }
        first: 1
      ) {
        edges { node { player game_id starts_at expires_at word_index has_ended } }
      }
    }
  `, { player });
  const node = data.tweetleDojoClassicGameModels?.edges?.[0]?.node;
  return node ?? null;
}

export async function pollNewClassicGame(player: string, afterGameId: number): Promise<any> {
  return pollTorii(async () => {
    const game = await fetchLatestClassicGame(player);
    if (game && Number(game.game_id) > afterGameId) return game;
    return null;
  });
}

// ── ClassicAttempt ──

export async function fetchLatestAttempt(player: string, gameId: number) {
  const data = await gql(`
    query ($player: String!, $gameId: String!) {
      tweetleDojoClassicAttemptModels(
        where: { player: $player, game_id: $gameId }
        order: { field: ATTEMPT_NUMBER, direction: DESC }
        first: 1
      ) {
        edges { node { player game_id attempt_number word hint_packed } }
      }
    }
  `, { player, gameId: '0x' + gameId.toString(16) });
  const node = data.tweetleDojoClassicAttemptModels?.edges?.[0]?.node;
  return node ?? null;
}

export async function pollNewAttempt(
  player: string,
  gameId: number,
  afterAttempt: number
): Promise<any> {
  return pollTorii(async () => {
    const attempt = await fetchLatestAttempt(player, gameId);
    if (attempt && Number(attempt.attempt_number) > afterAttempt) return attempt;
    return null;
  });
}

// ── ClassicGameAttemptCount ──

export async function fetchAttemptCount(player: string, gameId: number) {
  const data = await gql(`
    query ($player: String!, $gameId: String!) {
      tweetleDojoClassicGameAttemptCountModels(
        where: { player: $player, game_id: $gameId }
        first: 1
      ) {
        edges { node { player game_id count } }
      }
    }
  `, { player, gameId: '0x' + gameId.toString(16) });
  const node = data.tweetleDojoClassicGameAttemptCountModels?.edges?.[0]?.node;
  return node ?? null;
}

// ── ClassicGame ended check (for win/loss) ──

export async function fetchClassicGame(player: string, gameId: number) {
  const data = await gql(`
    query ($player: String!, $gameId: String!) {
      tweetleDojoClassicGameModels(
        where: { player: $player, game_id: $gameId }
        first: 1
      ) {
        edges { node { player game_id has_ended } }
      }
    }
  `, { player, gameId: '0x' + gameId.toString(16) });
  const node = data.tweetleDojoClassicGameModels?.edges?.[0]?.node;
  return node ?? null;
}
