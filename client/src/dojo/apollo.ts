import { ApolloClient, InMemoryCache, HttpLink, gql } from '@apollo/client';
import { TORII_URL } from './dojoConfig';

// ── Apollo Client ──

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: `${TORII_URL}/graphql` }),
  cache: new InMemoryCache(),
});

// ── GraphQL Queries ──

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
        }
      }
    }
  }
`;

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

export const GET_ATTEMPT_COUNT = gql`
  query GetAttemptCount($player: String!, $gameId: String!) {
    tweetleDojoClassicGameAttemptCountModels(
      where: { player: $player, game_id: $gameId }
      first: 1
    ) {
      edges {
        node {
          player
          game_id
          count
        }
      }
    }
  }
`;

// ── Response Types ──

export interface PlayerNode {
  address: string;
  username: string;
  classic_game_count: number;
  points: number;
  is_registered: boolean;
}

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

export interface AttemptCountNode {
  player: string;
  game_id: number;
  count: number;
}

export interface GetPlayerResponse {
  tweetleDojoPlayerModels: {
    edges: Array<{ node: PlayerNode }>;
  };
}

export interface GetLatestClassicGameResponse {
  tweetleDojoClassicGameModels: {
    edges: Array<{ node: ClassicGameNode }>;
  };
}

export interface GetGameAttemptsResponse {
  tweetleDojoClassicAttemptModels: {
    edges: Array<{ node: ClassicAttemptNode }>;
  };
}

export interface GetAttemptCountResponse {
  tweetleDojoClassicGameAttemptCountModels: {
    edges: Array<{ node: AttemptCountNode }>;
  };
}
