import { ApolloClient, InMemoryCache, HttpLink, gql } from '@apollo/client';
import { TORII_URL } from '../env';

// ── Apollo Client ──

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: `${TORII_URL}/graphql` }),
  cache: new InMemoryCache(),
});

// ── Polling Helper ──

async function poll<T>(
  queryFn: () => Promise<T | null>,
  maxAttempts = 40,
  intervalMs = 2000,
): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await queryFn();
    if (result !== null) return result;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Torii polling timed out');
}

// ══════════════════════════════════════
//  PLAYER
// ══════════════════════════════════════

export const GET_PLAYER = gql`
  query GetPlayer($address: String!) {
    tweetleDojoPlayerModels(where: { address: $address }, first: 1) {
      edges {
        node {
          address
          username
          classic_game_count
          points
          is_registered
          friends_count
        }
      }
    }
  }
`;

export interface PlayerNode {
  address: string;
  username: string;
  classic_game_count: number;
  points: number;
  is_registered: boolean;
  friends_count?: number;
}

interface GetPlayerResponse {
  tweetleDojoPlayerModels: {
    edges: Array<{ node: PlayerNode }>;
  };
}

export async function fetchPlayer(address: string): Promise<PlayerNode | null> {
  const { data } = await apolloClient.query<GetPlayerResponse>({
    query: GET_PLAYER,
    variables: { address },
    fetchPolicy: 'network-only',
  });
  return data?.tweetleDojoPlayerModels?.edges?.[0]?.node ?? null;
}

export async function pollPlayerRegistered(address: string) {
  return poll(() => fetchPlayer(address));
}

// ══════════════════════════════════════
//  CLASSIC MODE
// ══════════════════════════════════════

export const GET_LATEST_CLASSIC_GAME = gql`
  query GetLatestClassicGame($player: String!) {
    tweetleDojoClassicGameModels(
      where: { player: $player }
      order: { field: GAME_ID, direction: DESC }
      first: 1
    ) {
      edges {
        node {
          player
          game_id
          starts_at
          expires_at
          word_index
          has_ended
        }
      }
    }
  }
`;

export const GET_GAME_ATTEMPTS = gql`
  query GetGameAttempts($player: String!, $gameId: String!) {
    tweetleDojoClassicAttemptModels(
      where: { player: $player, game_id: $gameId }
      order: { field: ATTEMPT_NUMBER, direction: ASC }
    ) {
      edges {
        node {
          player
          game_id
          attempt_number
          word
          hint_packed
        }
      }
    }
  }
`;

const GET_LATEST_ATTEMPT = gql`
  query GetLatestAttempt($player: String!, $gameId: String!) {
    tweetleDojoClassicAttemptModels(
      where: { player: $player, game_id: $gameId }
      order: { field: ATTEMPT_NUMBER, direction: DESC }
      first: 1
    ) {
      edges {
        node { player game_id attempt_number word hint_packed }
      }
    }
  }
`;

export interface ClassicGameNode {
  player: string;
  game_id: number;
  starts_at: number;
  expires_at: number;
  word_index: string;
  has_ended: boolean;
}

export interface ClassicAttemptNode {
  player: string;
  game_id: number;
  attempt_number: number;
  word: string;
  hint_packed: number;
}

interface GetLatestClassicGameResponse {
  tweetleDojoClassicGameModels: {
    edges: Array<{ node: ClassicGameNode }>;
  };
}

interface GetGameAttemptsResponse {
  tweetleDojoClassicAttemptModels: {
    edges: Array<{ node: ClassicAttemptNode }>;
  };
}

export async function fetchLatestClassicGame(player: string): Promise<ClassicGameNode | null> {
  const { data } = await apolloClient.query<GetLatestClassicGameResponse>({
    query: GET_LATEST_CLASSIC_GAME,
    variables: { player },
    fetchPolicy: 'network-only',
  });
  return data?.tweetleDojoClassicGameModels?.edges?.[0]?.node ?? null;
}

export async function fetchGameAttempts(player: string, gameId: number): Promise<ClassicAttemptNode[]> {
  const { data } = await apolloClient.query<GetGameAttemptsResponse>({
    query: GET_GAME_ATTEMPTS,
    variables: { player, gameId: '0x' + gameId.toString(16) },
    fetchPolicy: 'network-only',
  });
  return data?.tweetleDojoClassicAttemptModels?.edges?.map((e) => e.node) ?? [];
}

export async function pollNewClassicGame(player: string, afterGameId: number) {
  return poll(async () => {
    const game = await fetchLatestClassicGame(player);
    if (game && Number(game.game_id) > afterGameId) return game;
    return null;
  });
}

async function fetchLatestAttempt(player: string, gameId: number): Promise<ClassicAttemptNode | null> {
  const { data } = await apolloClient.query<GetGameAttemptsResponse>({
    query: GET_LATEST_ATTEMPT,
    variables: { player, gameId: '0x' + gameId.toString(16) },
    fetchPolicy: 'network-only',
  });
  return data?.tweetleDojoClassicAttemptModels?.edges?.[0]?.node ?? null;
}

export async function pollNewAttempt(player: string, gameId: number, afterAttempt: number) {
  return poll(async () => {
    const attempt = await fetchLatestAttempt(player, gameId);
    if (attempt && Number(attempt.attempt_number) > afterAttempt) return attempt;
    return null;
  });
}

// ══════════════════════════════════════
//  DAILY MODE
// ══════════════════════════════════════

export const GET_DAILY_GAME = gql`
  query GetDailyGame($gameId: String!) {
    tweetleDojoDailyGameModels(where: { game_id: $gameId }, first: 1) {
      edges {
        node {
          game_id
          word_index
          starts_at
          expires_at
          winners_count
          players_count
        }
      }
    }
  }
`;

export const GET_DAILY_ATTEMPT_COUNT = gql`
  query GetDailyAttemptCount($player: String!, $gameId: String!) {
    tweetleDojoDailyAttemptCountModels(
      where: { player: $player, game_id: $gameId }
      first: 1
    ) {
      edges {
        node {
          player
          game_id
          count
          has_joined
        }
      }
    }
  }
`;

export const GET_DAILY_ATTEMPTS = gql`
  query GetDailyAttempts($player: String!, $gameId: String!) {
    tweetleDojoDailyAttemptModels(
      where: { player: $player, game_id: $gameId }
      order: { field: ATTEMPT_NUMBER, direction: ASC }
    ) {
      edges {
        node {
          player
          game_id
          attempt_number
          word
          hint_packed
        }
      }
    }
  }
`;

const GET_LATEST_DAILY_ATTEMPT = gql`
  query GetLatestDailyAttempt($player: String!, $gameId: String!) {
    tweetleDojoDailyAttemptModels(
      where: { player: $player, game_id: $gameId }
      order: { field: ATTEMPT_NUMBER, direction: DESC }
      first: 1
    ) {
      edges {
        node { player game_id attempt_number word hint_packed }
      }
    }
  }
`;

export interface DailyGameNode {
  game_id: string;
  word_index: string;
  starts_at: string;
  expires_at: string;
  winners_count: number;
  players_count: number;
}

export interface DailyAttemptCountNode {
  player: string;
  game_id: string;
  count: number;
  has_joined: boolean;
}

export interface DailyAttemptNode {
  player: string;
  game_id: string;
  attempt_number: number;
  word: string;
  hint_packed: number;
}

interface GetDailyGameResponse {
  tweetleDojoDailyGameModels: {
    edges: Array<{ node: DailyGameNode }>;
  };
}

interface GetDailyAttemptCountResponse {
  tweetleDojoDailyAttemptCountModels: {
    edges: Array<{ node: DailyAttemptCountNode }>;
  };
}

interface GetDailyAttemptsResponse {
  tweetleDojoDailyAttemptModels: {
    edges: Array<{ node: DailyAttemptNode }>;
  };
}

async function fetchDailyGame(gameId: number): Promise<DailyGameNode | null> {
  const { data } = await apolloClient.query<GetDailyGameResponse>({
    query: GET_DAILY_GAME,
    variables: { gameId: '0x' + gameId.toString(16) },
    fetchPolicy: 'network-only',
  });
  return data?.tweetleDojoDailyGameModels?.edges?.[0]?.node ?? null;
}

export async function pollDailyGame(gameId: number) {
  return poll(() => fetchDailyGame(gameId));
}

async function fetchDailyAttemptCount(player: string, gameId: number): Promise<DailyAttemptCountNode | null> {
  const { data } = await apolloClient.query<GetDailyAttemptCountResponse>({
    query: GET_DAILY_ATTEMPT_COUNT,
    variables: { player, gameId: '0x' + gameId.toString(16) },
    fetchPolicy: 'network-only',
  });
  return data?.tweetleDojoDailyAttemptCountModels?.edges?.[0]?.node ?? null;
}

export async function pollDailyJoined(player: string, gameId: number) {
  return poll(async () => {
    const ac = await fetchDailyAttemptCount(player, gameId);
    if (ac && ac.has_joined) return ac;
    return null;
  });
}

async function fetchLatestDailyAttempt(player: string, gameId: number): Promise<DailyAttemptNode | null> {
  const { data } = await apolloClient.query<GetDailyAttemptsResponse>({
    query: GET_LATEST_DAILY_ATTEMPT,
    variables: { player, gameId: '0x' + gameId.toString(16) },
    fetchPolicy: 'network-only',
  });
  return data?.tweetleDojoDailyAttemptModels?.edges?.[0]?.node ?? null;
}

export async function pollNewDailyAttempt(player: string, gameId: number, afterAttempt: number) {
  return poll(async () => {
    const attempt = await fetchLatestDailyAttempt(player, gameId);
    if (attempt && Number(attempt.attempt_number) > afterAttempt) return attempt;
    return null;
  });
}

export async function fetchDailyAttempts(player: string, gameId: number): Promise<DailyAttemptNode[]> {
  const { data } = await apolloClient.query<GetDailyAttemptsResponse>({
    query: GET_DAILY_ATTEMPTS,
    variables: { player, gameId: '0x' + gameId.toString(16) },
    fetchPolicy: 'network-only',
  });
  return data?.tweetleDojoDailyAttemptModels?.edges?.map((e) => e.node) ?? [];
}

export async function fetchDailyStatus(player: string, gameId: number) {
  return fetchDailyAttemptCount(player, gameId);
}

// ══════════════════════════════════════
//  TOURNAMENT MODE
// ══════════════════════════════════════

export const GET_TOURNAMENTS = gql`
  query GetTournaments($first: Int!) {
    tweetleDojoTournamentModels(
      order: { field: CREATED_AT, direction: DESC }
      first: $first
    ) {
      edges {
        node {
          tournament_id
          creator
          status
          max_players
          current_players
          solution_commitment
          start_time
          end_time
          created_at
        }
      }
    }
  }
`;

export const GET_TOURNAMENT_ENTRIES = gql`
  query GetTournamentEntries($tournamentId: String!) {
    tweetleDojoTournamentEntryModels(
      where: { tournament_id: $tournamentId }
      order: { field: COMPLETION_TIME, direction: ASC }
    ) {
      edges {
        node {
          tournament_id
          player
          attempts_used
          did_win
          completed
          completion_time
          has_joined
        }
      }
    }
  }
`;

export const GET_TOURNAMENT_ATTEMPTS = gql`
  query GetTournamentAttempts($tournamentId: String!, $player: String!) {
    tweetleDojoTournamentAttemptModels(
      where: { tournament_id: $tournamentId, player: $player }
      order: { field: ATTEMPT_NUMBER, direction: ASC }
    ) {
      edges {
        node {
          tournament_id
          player
          attempt_number
          guess_packed
          clue_packed
        }
      }
    }
  }
`;

export interface TournamentNode {
  tournament_id: string;
  creator: string;
  status: number;
  max_players: number;
  current_players: number;
  solution_commitment: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface TournamentEntryNode {
  tournament_id: string;
  player: string;
  attempts_used: number;
  did_win: boolean;
  completed: boolean;
  completion_time: string;
  has_joined: boolean;
}

export interface TournamentAttemptNode {
  tournament_id: string;
  player: string;
  attempt_number: number;
  guess_packed: string;
  clue_packed: number;
}

export async function fetchTournaments(first = 20): Promise<TournamentNode[]> {
  const { data } = await apolloClient.query<{
    tweetleDojoTournamentModels: { edges: Array<{ node: TournamentNode }> };
  }>({
    query: GET_TOURNAMENTS,
    variables: { first },
    fetchPolicy: 'network-only',
  });
  return data?.tweetleDojoTournamentModels?.edges?.map((e) => e.node) ?? [];
}

export async function fetchTournamentAttempts(
  tournamentId: number,
  player: string,
): Promise<TournamentAttemptNode[]> {
  const { data } = await apolloClient.query<{
    tweetleDojoTournamentAttemptModels: { edges: Array<{ node: TournamentAttemptNode }> };
  }>({
    query: GET_TOURNAMENT_ATTEMPTS,
    variables: {
      tournamentId: '0x' + tournamentId.toString(16),
      player,
    },
    fetchPolicy: 'network-only',
  });
  return data?.tweetleDojoTournamentAttemptModels?.edges?.map((e) => e.node) ?? [];
}

export async function pollNewTournamentAttempt(
  tournamentId: number,
  player: string,
  afterAttempt: number,
): Promise<TournamentAttemptNode> {
  return poll(async () => {
    const attempts = await fetchTournamentAttempts(tournamentId, player);
    const latest = attempts[attempts.length - 1];
    if (latest && Number(latest.attempt_number) > afterAttempt) return latest;
    return null;
  });
}
