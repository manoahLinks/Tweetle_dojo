import type { TileState } from '../screens/GameBoardScreen';

// ── Contract Models ──

export interface Player {
  address: string;
  username: string;
  classicGameCount: number;
  points: number;
  isRegistered: boolean;
  referrer: string;
  friendsCount: number;
}

export interface ClassicGame {
  player: string;
  gameId: number;
  activePlayers: number;
  startsAt: number;
  expiresAt: number;
  wordIndex: string;
  hasEnded: boolean;
}

export interface ClassicAttempt {
  player: string;
  gameId: number;
  attemptNumber: number;
  word: string;
  hintPacked: number;
}

export interface ClassicGameAttemptCount {
  player: string;
  gameId: number;
  count: number;
}

export interface DailyGame {
  gameId: number;
  wordIndex: string;
  startsAt: number;
  expiresAt: number;
  winnersCount: number;
  playersCount: number;
}

export interface DailyAttempt {
  player: string;
  gameId: number;
  attemptNumber: number;
  word: string;
  hintPacked: number;
}

export interface DailyAttemptCount {
  player: string;
  gameId: number;
  count: number;
  hasJoined: boolean;
}

export interface GameStats {
  id: number;
  playerCount: number;
  dailyGamesCount: number;
  nextDailyUpdate: number;
  attemptPrice: number;
  dailyInstructor: string;
  tokenAddress: string;
}

// ── Events ──

export interface GameStartedEvent {
  gameId: number;
  player: string;
}

export interface GuessSubmittedEvent {
  gameId: number;
  player: string;
  attemptNumber: number;
  word: string;
  hintPacked: number;
}

export interface GameWonEvent {
  gameId: number;
  player: string;
  attempts: number;
  pointsEarned: number;
}

export interface GameLostEvent {
  gameId: number;
  player: string;
}

export interface DailyGameCreatedEvent {
  gameId: number;
  startsAt: number;
  expiresAt: number;
}

export interface DailyGuessSubmittedEvent {
  gameId: number;
  player: string;
  attemptNumber: number;
  word: string;
  hintPacked: number;
}

export interface DailyGameWonEvent {
  gameId: number;
  player: string;
  attempts: number;
  pointsEarned: number;
  winnerIndex: number;
}

// ── hint_packed decoder ──
// hint_packed encodes 5 tile states in a u16:
//   hint = s0*256 + s1*64 + s2*16 + s3*4 + s4
// where 0=absent, 1=present, 2=correct

const HINT_DIVISORS = [256, 64, 16, 4, 1];
const HINT_TO_STATE: Record<number, TileState> = {
  0: 'absent',
  1: 'present',
  2: 'correct',
};

export const WINNING_HINT = 682; // 2*256 + 2*64 + 2*16 + 2*4 + 2

export function decodeHints(hintPacked: number): TileState[] {
  return HINT_DIVISORS.map((div) => {
    const val = Math.floor(hintPacked / div) % 4;
    return HINT_TO_STATE[val] ?? 'absent';
  });
}

// ── felt252 <-> string encoding ──
// Words are 5 uppercase ASCII chars packed into a felt252.
// The encoding packs bytes left-to-right: b0 is MSB, b4 is LSB.

export function stringToFelt(word: string): string {
  let val = BigInt(0);
  for (let i = 0; i < word.length; i++) {
    val = val * BigInt(256) + BigInt(word.charCodeAt(i));
  }
  return '0x' + val.toString(16);
}

export function feltToString(felt: string | bigint): string {
  let n = typeof felt === 'string' ? BigInt(felt) : felt;
  const bytes: number[] = [];
  while (n > 0n) {
    bytes.unshift(Number(n % 256n));
    n = n / 256n;
  }
  return String.fromCharCode(...bytes);
}
