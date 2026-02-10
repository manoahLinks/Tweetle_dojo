import React, { useState, useCallback, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { NavigationContext, type GameMode } from '../../App';
import { useSession } from '../hooks/SessionContext';
import { usePlayer } from '../hooks/usePlayer';
import { useGameActions, type DailyStatus } from '../hooks/useGameActions';
import { colors, fontSize, fontWeight, spacing, radius, grid } from '../theme';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 54 : 36;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Board sizing — constrained so it doesn't eat the whole screen
const BOARD_MAX_WIDTH = 300;
const BOARD_WIDTH = Math.min(SCREEN_WIDTH - 48, BOARD_MAX_WIDTH);
const TILE_GAP = 5;
const TILE_SIZE = Math.floor((BOARD_WIDTH - TILE_GAP * (grid.cols - 1)) / grid.cols);

export type TileState = 'empty' | 'filled' | 'correct' | 'present' | 'absent';

export interface TileData {
  letter: string;
  state: TileState;
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
];

// Keyboard sizing
const KEY_GAP = 4;
const KEY_WIDTH = Math.floor(
  (SCREEN_WIDTH - 16 - KEY_GAP * (KEYBOARD_ROWS[0].length - 1)) /
    KEYBOARD_ROWS[0].length
);
const KEY_HEIGHT = 44;

function getKeyboardStates(guesses: TileData[][]): Record<string, TileState> {
  const states: Record<string, TileState> = {};
  for (const row of guesses) {
    for (const tile of row) {
      const existing = states[tile.letter];
      if (tile.state === 'correct') {
        states[tile.letter] = 'correct';
      } else if (tile.state === 'present' && existing !== 'correct') {
        states[tile.letter] = 'present';
      } else if (!existing) {
        states[tile.letter] = tile.state;
      }
    }
  }
  return states;
}

const TILE_BG: Record<TileState, string> = {
  empty: colors.tile.empty,
  filled: colors.tile.empty,
  correct: colors.tile.correct,
  present: colors.tile.present,
  absent: colors.tile.absent,
};

// ── Tile ──
function Tile({ tile }: { tile: TileData }) {
  const isActive = tile.letter !== '' && tile.state === 'filled';
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: TILE_BG[tile.state] },
        isActive && styles.tileActive,
      ]}
    >
      {tile.letter !== '' && (
        <Text style={styles.tileLetter}>{tile.letter}</Text>
      )}
    </View>
  );
}

// ── Keyboard Key ──
function KeyboardKey({
  letter,
  state,
  onPress,
}: {
  letter: string;
  state?: TileState;
  onPress: (key: string) => void;
}) {
  const isBackspace = letter === '⌫';
  const hasState = state && state !== 'empty' && state !== 'filled';
  const keyBg = hasState
    ? state === 'correct'
      ? colors.tile.correct
      : state === 'present'
        ? colors.tile.present
        : colors.tile.absent
    : '#FFFFFF';
  const textColor = hasState ? colors.text.onTile : colors.bg.primary;

  return (
    <TouchableOpacity
      style={[
        styles.key,
        { backgroundColor: keyBg },
        isBackspace && styles.keyWide,
      ]}
      onPress={() => onPress(letter)}
      activeOpacity={0.6}
    >
      <Text style={[styles.keyText, { color: textColor }]}>{letter}</Text>
    </TouchableOpacity>
  );
}

// ── Countdown helper ──
function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ── Countdown Screen ──
function DailyCountdownScreen({
  dailyStatus,
  goBack,
}: {
  dailyStatus: DailyStatus;
  goBack: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    return Math.max(0, dailyStatus.expiresAt - Math.floor(Date.now() / 1000));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, dailyStatus.expiresAt - Math.floor(Date.now() / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [dailyStatus.expiresAt]);

  const isWin = dailyStatus.gameOver === 'won';
  const attemptCount = dailyStatus.guesses.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Challenge</Text>
          <View style={styles.backBtn} />
        </View>
      </View>

      <View style={styles.countdownWrapper}>
        {/* Result icon */}
        <View
          style={[
            styles.countdownIcon,
            { backgroundColor: isWin ? colors.success : colors.brand.secondary },
          ]}
        >
          <Text style={styles.countdownIconText}>{isWin ? '🏆' : '✋'}</Text>
        </View>

        {/* Result text */}
        <Text
          style={[
            styles.countdownResultText,
            { color: isWin ? colors.success : colors.brand.primary },
          ]}
        >
          {isWin ? 'YOU WON!' : 'BETTER LUCK TOMORROW'}
        </Text>

        {isWin && (
          <Text style={styles.countdownSubtext}>
            Solved in {attemptCount} attempt{attemptCount !== 1 ? 's' : ''}
          </Text>
        )}

        {/* Mini board preview */}
        <View style={styles.miniBoard}>
          {dailyStatus.guesses.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.miniRow}>
              {row.map((tile, colIdx) => (
                <View
                  key={`${rowIdx}-${colIdx}`}
                  style={[
                    styles.miniTile,
                    { backgroundColor: TILE_BG[tile.state] },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>

        {/* Countdown */}
        <Text style={styles.countdownLabel}>Next Daily Challenge in</Text>
        <Text style={styles.countdownTimer}>{formatCountdown(secondsLeft)}</Text>

        {/* Back to dashboard */}
        <TouchableOpacity
          style={styles.countdownBtn}
          onPress={goBack}
          activeOpacity={0.8}
        >
          <Text style={styles.countdownBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Game Board Screen ──
function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr || '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function GameBoardScreen() {
  const { goBack, params } = useContext(NavigationContext);
  const mode: GameMode = (params?.mode as GameMode) || 'classic';
  const { sessionMetadata } = useSession();
  const { player, refetch: refetchPlayer } = usePlayer();
  const {
    startGame,
    submitGuess,
    resumeOrStartGame,
    checkDailyStatus,
    startDailyGame,
    submitDailyGuess,
  } = useGameActions();

  const [gameId, setGameId] = useState<number | null>(null);
  const [guesses, setGuesses] = useState<TileData[][]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gameOver, setGameOver] = useState<'won' | 'lost' | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [winAttempts, setWinAttempts] = useState(0);
  const [dailyFinished, setDailyFinished] = useState<DailyStatus | null>(null);
  const currentRow = guesses.length;
  const keyStates = getKeyboardStates(guesses);

  // Init game based on mode (player registration handled at connect time)
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setIsLoading(true);
      try {
        if (mode === 'daily') {
          // Check daily game status
          const status = await checkDailyStatus();

          if (status.hasFinished) {
            // Already played today — show countdown
            if (!cancelled) setDailyFinished(status);
            return;
          }

          if (!status.hasJoined) {
            // Start and join daily game
            const dailyGameId = await startDailyGame();
            if (!cancelled) {
              setGameId(dailyGameId);
              setGuesses([]);
            }
          } else {
            // Resume in-progress daily game
            if (!cancelled) {
              setGameId(status.gameId);
              setGuesses(status.guesses);
            }
          }
        } else {
          // Classic mode — resume or start
          const resumed = await resumeOrStartGame();
          if (!cancelled) {
            setGameId(resumed.gameId);
            setGuesses(resumed.guesses);
            if (resumed.gameOver) setGameOver(resumed.gameOver);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          Alert.alert('Error', err.message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [resumeOrStartGame, checkDailyStatus, startDailyGame, mode]);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (gameOver || isLoading) return;
      if (key === '⌫') {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (currentGuess.length < grid.cols) {
        setCurrentGuess((prev) => prev + key);
      }
    },
    [currentGuess, gameOver, isLoading]
  );

  const handleSubmit = useCallback(async () => {
    if (currentGuess.length !== grid.cols || !gameId || isLoading || gameOver) return;
    setIsLoading(true);
    try {
      const submitFn = mode === 'daily' ? submitDailyGuess : submitGuess;
      const result = await submitFn(gameId, currentGuess, guesses.length);
      const submittedRow: TileData[] = currentGuess.split('').map((letter, i) => ({
        letter,
        state: result.tileStates[i] || 'absent',
      }));
      setGuesses((prev) => [...prev, submittedRow]);
      setCurrentGuess('');

      if (result.isWin) {
        setGameOver('won');
        setWinAttempts(result.attemptNumber);
        refetchPlayer();
        setTimeout(() => setShowModal(true), 400);
      } else if (result.isLoss) {
        setGameOver('lost');
        setTimeout(() => setShowModal(true), 400);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentGuess, gameId, isLoading, gameOver, guesses.length, submitGuess, submitDailyGuess, mode, refetchPlayer]);

  const handlePlayNext = useCallback(async () => {
    setShowModal(false);

    if (mode === 'daily') {
      // Daily mode — can't play again, show countdown
      const status = await checkDailyStatus();
      setDailyFinished(status);
      return;
    }

    // Classic mode — start new game
    setIsLoading(true);
    try {
      const newGameId = await startGame();
      setGameId(newGameId);
      setGuesses([]);
      setCurrentGuess('');
      setGameOver(null);
      setWinAttempts(0);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [startGame, mode, checkDailyStatus]);

  const handleExtraAttempt = useCallback(() => {
    // TODO: not yet implemented in the contract
    setShowModal(false);
  }, []);

  // If daily game is finished, show countdown
  if (dailyFinished) {
    return <DailyCountdownScreen dailyStatus={dailyFinished} goBack={goBack} />;
  }

  // Build 6x5 board
  const board: TileData[][] = [];
  for (let r = 0; r < grid.rows; r++) {
    if (r < guesses.length) {
      board.push(guesses[r]);
    } else if (r === currentRow) {
      const row: TileData[] = [];
      for (let c = 0; c < grid.cols; c++) {
        row.push({
          letter: currentGuess[c] || '',
          state: currentGuess[c] ? 'filled' : 'empty',
        });
      }
      board.push(row);
    } else {
      board.push(
        Array.from({ length: grid.cols }, (): TileData => ({
          letter: '',
          state: 'empty',
        }))
      );
    }
  }

  const canSubmit = currentGuess.length === grid.cols && !isLoading && !gameOver && gameId !== null;
  const isDaily = mode === 'daily';

  // Loading overlay while starting game
  if (gameId === null) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text style={{ color: colors.text.primary, marginTop: spacing.md, fontSize: fontSize.sm }}>
          {isDaily ? 'Loading daily challenge...' : 'Starting game...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isDaily ? 'Daily Challenge' : 'Tweetle'}
          </Text>
          <View style={styles.backBtn} />
        </View>

        {/* Info bar */}
        <View style={styles.infoBar}>
          <View style={styles.infoPill}>
            <View style={styles.pillDot}>
              <Text style={styles.pillDotText}>C</Text>
            </View>
            <Text style={styles.pillText}>
              {sessionMetadata.username || truncateAddress(sessionMetadata.address || '0x...')}
            </Text>
          </View>

          <View style={styles.infoPillSmall}>
            <Text style={styles.pillEmoji}>{isDaily ? '📅' : '🎯'}</Text>
            <Text style={styles.pillText}>{isDaily ? 'Daily' : 'Classic'}</Text>
          </View>

          <View style={[styles.infoPill, styles.scorePill]}>
            <Text style={styles.pillEmoji}>🪙</Text>
            <Text style={styles.scoreText}>{(player?.points ?? 0).toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* Board — centered, constrained */}
      <View style={styles.boardWrapper}>
        <View style={styles.boardContainer}>
          {board.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.tileRow}>
              {row.map((tile, colIdx) => (
                <Tile key={`${rowIdx}-${colIdx}`} tile={tile} />
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Keyboard */}
      <View style={styles.keyboard}>
        {KEYBOARD_ROWS.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.keyboardRow}>
            {row.map((key) => (
              <KeyboardKey
                key={key}
                letter={key}
                state={keyStates[key]}
                onPress={handleKeyPress}
              />
            ))}
          </View>
        ))}
      </View>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.hintButton} activeOpacity={0.7}>
          <Image
            source={require('../../assets/tweetle_mascot.png')}
            style={styles.hintMascot}
            resizeMode="contain"
          />
          <Text style={styles.hintText}>Hint</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
          activeOpacity={0.8}
          disabled={!canSubmit}
          onPress={handleSubmit}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.text.primary} />
          ) : (
            <Text style={styles.submitText}>
              {gameOver ? (gameOver === 'won' ? 'You Won!' : 'Game Over') : 'Submit'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Win / Loss Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            {/* Title */}
            <Text
              style={[
                styles.modalTitle,
                { color: gameOver === 'won' ? colors.success : colors.success },
              ]}
            >
              {gameOver === 'won' ? 'YOU WON!' : 'TRY AGAIN'}
            </Text>

            {/* Icon */}
            <View
              style={[
                styles.modalIcon,
                {
                  backgroundColor:
                    gameOver === 'won' ? colors.success : colors.brand.secondary,
                },
              ]}
            >
              <Text style={styles.modalIconText}>
                {gameOver === 'won' ? '🏆' : '✋'}
              </Text>
            </View>

            {/* Subtitle */}
            <Text style={styles.modalSubtitle}>
              {gameOver === 'won'
                ? `Solved in ${winAttempts} attempt${winAttempts !== 1 ? 's' : ''}!`
                : 'Better luck next time!'}
            </Text>

            {/* Play Next / Next Challenge button */}
            <TouchableOpacity
              style={styles.modalBtnPrimary}
              activeOpacity={0.8}
              onPress={handlePlayNext}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.text.primary} />
              ) : (
                <Text style={styles.modalBtnPrimaryText}>
                  {isDaily ? 'See Countdown' : 'Play Next'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Extra Attempt button (loss only, classic only) */}
            {gameOver === 'lost' && !isDaily && (
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                activeOpacity={0.8}
                onPress={handleExtraAttempt}
              >
                <Text style={styles.modalBtnSecondaryText}>Get Extra Attempt</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    paddingTop: STATUS_BAR_HEIGHT,
  },

  // ── Header ──
  header: {
    backgroundColor: colors.brand.secondary,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 50,
  },
  backText: {
    color: colors.info,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1A1A2ECC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  infoPillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1A1A2ECC',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  pillDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillDotText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: fontWeight.bold,
  },
  pillText: {
    color: colors.text.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  pillEmoji: {
    fontSize: 12,
  },
  scorePill: {
    borderWidth: 1,
    borderColor: colors.gold,
  },
  scoreText: {
    color: colors.gold,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },

  // ── Board ──
  boardWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardContainer: {
    width: BOARD_WIDTH,
    gap: TILE_GAP,
  },
  tileRow: {
    flexDirection: 'row',
    gap: TILE_GAP,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.tile.border,
  },
  tileActive: {
    borderColor: colors.tile.activeBorder,
    borderWidth: 2,
  },
  tileLetter: {
    color: colors.text.onTile,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },

  // ── Keyboard ──
  keyboard: {
    paddingHorizontal: 8,
    gap: KEY_GAP,
    paddingBottom: 4,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: KEY_GAP,
  },
  key: {
    width: KEY_WIDTH,
    height: KEY_HEIGHT,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyWide: {
    width: KEY_WIDTH * 1.4,
  },
  keyText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },

  // ── Action Bar ──
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2xl'],
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing['2xl'] : spacing['3xl'],
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hintMascot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  hintText: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  submitButton: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.bg.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: spacing.base,
    right: spacing.base,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: colors.text.secondary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  modalTitle: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.extrabold,
    letterSpacing: 2,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  modalIconText: {
    fontSize: 28,
  },
  modalSubtitle: {
    color: colors.text.secondary,
    fontSize: fontSize.base,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },
  modalBtnPrimary: {
    width: '100%',
    backgroundColor: colors.success,
    paddingVertical: spacing.base,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4ADE80',
    marginBottom: spacing.md,
    minHeight: 52,
  },
  modalBtnPrimaryText: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  modalBtnSecondary: {
    width: '100%',
    backgroundColor: colors.silver,
    paddingVertical: spacing.base,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    minHeight: 52,
  },
  modalBtnSecondaryText: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },

  // ── Countdown Screen ──
  countdownWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  countdownIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  countdownIconText: {
    fontSize: 36,
  },
  countdownResultText: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.extrabold,
    letterSpacing: 2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  countdownSubtext: {
    color: colors.text.secondary,
    fontSize: fontSize.base,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  miniBoard: {
    gap: 3,
    marginBottom: spacing['2xl'],
  },
  miniRow: {
    flexDirection: 'row',
    gap: 3,
  },
  miniTile: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  countdownLabel: {
    color: colors.text.secondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  countdownTimer: {
    color: colors.text.primary,
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.extrabold,
    letterSpacing: 4,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },
  countdownBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.base,
    borderRadius: radius.full,
  },
  countdownBtnText: {
    color: colors.text.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
});
