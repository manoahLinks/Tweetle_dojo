import React, { useState, useCallback, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationContext, type GameMode } from '../../App';
import { useDojo } from '../dojo/DojoContext';
import { usePlayer } from '../hooks/usePlayer';
import { useGameActions, type DailyStatus } from '../hooks/useGameActions';
import { colors, fontSize, fontWeight, spacing, radius, grid, fontFamily, gradients } from '../theme';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 54 : 36;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BOARD_MAX_WIDTH = 300;
const BOARD_WIDTH = Math.min(SCREEN_WIDTH - 48, BOARD_MAX_WIDTH);
const TILE_GAP = 6;
const TILE_SIZE = Math.floor((BOARD_WIDTH - TILE_GAP * (grid.cols - 1)) / grid.cols);

export type TileState = 'empty' | 'filled' | 'correct' | 'present' | 'absent';

export interface TileData {
  letter: string;
  state: TileState;
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
];

const KEY_GAP = 4;
const KEY_WIDTH = Math.floor(
  (SCREEN_WIDTH - 16 - KEY_GAP * (KEYBOARD_ROWS[0].length - 1)) /
    KEYBOARD_ROWS[0].length
);
const KEY_HEIGHT = 46;

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

const TILE_BORDER: Record<TileState, string> = {
  empty: colors.tile.border as string,
  filled: colors.tile.activeBorder as string,
  correct: colors.tile.correct as string,
  present: colors.tile.present as string,
  absent: 'transparent',
};

// ── Tile ──
function Tile({ tile }: { tile: TileData }) {
  const isActive = tile.letter !== '' && tile.state === 'filled';
  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: TILE_BG[tile.state],
          borderColor: TILE_BORDER[tile.state],
          borderWidth: isActive ? 2 : 1,
        },
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
  const isWide = letter === '⌫' || letter === 'ENTER';
  const hasState = state && state !== 'empty' && state !== 'filled';

  let keyBg: string = colors.tile.empty;
  let borderColor: string = colors.tile.border;
  let textColor: string = colors.text.primary;

  if (hasState) {
    if (state === 'correct') {
      keyBg = colors.tile.correct;
      borderColor = colors.tile.correct;
    } else if (state === 'present') {
      keyBg = colors.tile.present;
      borderColor = colors.tile.present;
      textColor = colors.bg.primary;
    } else {
      keyBg = 'rgba(12,141,138,0.15)';
      borderColor = 'rgba(12,141,138,0.1)';
    }
  }

  return (
    <TouchableOpacity
      style={[
        styles.key,
        { backgroundColor: keyBg, borderColor },
        isWide && styles.keyWide,
      ]}
      onPress={() => onPress(letter)}
      activeOpacity={0.6}
    >
      <Text
        style={[
          styles.keyText,
          { color: textColor },
          isWide && styles.keyTextWide,
        ]}
      >
        {letter}
      </Text>
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
        <View
          style={[
            styles.countdownIcon,
            { backgroundColor: isWin ? colors.success : colors.bg.surfaceLight },
          ]}
        >
          <Text style={styles.countdownIconText}>{isWin ? '🏆' : '✋'}</Text>
        </View>

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

        <Text style={styles.countdownLabel}>Next Daily Challenge in</Text>
        <Text style={styles.countdownTimer}>{formatCountdown(secondsLeft)}</Text>

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
export function GameBoardScreen() {
  const { goBack, params } = useContext(NavigationContext);
  const mode: GameMode = (params?.mode as GameMode) || 'classic';
  const { address } = useDojo();
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

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setIsLoading(true);
      try {
        if (mode === 'daily') {
          const status = await checkDailyStatus();
          if (status.hasFinished) {
            if (!cancelled) setDailyFinished(status);
            return;
          }
          if (!status.hasJoined) {
            const dailyGameId = await startDailyGame();
            if (!cancelled) {
              setGameId(dailyGameId);
              setGuesses([]);
            }
          } else {
            if (!cancelled) {
              setGameId(status.gameId);
              setGuesses(status.guesses);
            }
          }
        } else {
          const resumed = await resumeOrStartGame();
          if (!cancelled) {
            setGameId(resumed.gameId);
            setGuesses(resumed.guesses);
            if (resumed.gameOver) setGameOver(resumed.gameOver);
          }
        }
      } catch (err: any) {
        if (!cancelled) Alert.alert('Error', err.message);
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
      } else if (key === 'ENTER') {
        // Submit handled inline
        return;
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
      const status = await checkDailyStatus();
      setDailyFinished(status);
      return;
    }
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
        Array.from({ length: grid.cols }, (): TileData => ({ letter: '', state: 'empty' }))
      );
    }
  }

  const canSubmit = currentGuess.length === grid.cols && !isLoading && !gameOver && gameId !== null;
  const isDaily = mode === 'daily';
  // Fields not yet in contract — use safe defaults
  const p = player as any;
  const playerLevel = p?.level ?? 1;
  const playerLives = p?.lives ?? 3;
  const playerGems = p?.gems ?? 0;

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
      {/* Top Bar */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.topStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>SCORE</Text>
              <Text style={styles.statValue}>{(player?.points ?? 0).toLocaleString()}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>🍃</Text>
              <Text style={styles.statValue}>{playerLives}</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>💎</Text>
            <Text style={styles.statValue}>{playerGems}</Text>
          </View>
        </View>

        <Text style={styles.levelText}>LEVEL {playerLevel}</Text>
      </View>

      {/* Board */}
      <View style={styles.boardWrapper}>
        {guesses.length === 0 && currentGuess.length === 0 && (
          <Text style={styles.promptText}>MAKE YOUR FIRST GUESS!</Text>
        )}
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
                onPress={key === 'ENTER' ? () => handleSubmit() : handleKeyPress}
              />
            ))}
          </View>
        ))}
      </View>

      {/* Bottom Toolbar */}
      <View style={styles.toolbar}>
        {['🎨', 'ℹ️', '🔊', '❓', '⚙️'].map((icon, i) => (
          <TouchableOpacity key={i} style={styles.toolbarIcon} activeOpacity={0.6}>
            <Text style={styles.toolbarIconText}>{icon}</Text>
          </TouchableOpacity>
        ))}
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
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            {/* Golden banner */}
            <LinearGradient
              colors={[...gradients.gold]}
              style={styles.modalBanner}
            >
              <Text style={styles.modalBannerText}>
                {gameOver === 'won' ? "YOU'RE A PRO!" : 'TRY AGAIN'}
              </Text>
            </LinearGradient>

            {/* Solved word tiles */}
            {guesses.length > 0 && (
              <View style={styles.modalTileRow}>
                {guesses[guesses.length - 1].map((tile, i) => (
                  <View
                    key={i}
                    style={[
                      styles.modalTile,
                      { backgroundColor: TILE_BG[tile.state] },
                    ]}
                  >
                    <Text style={styles.modalTileLetter}>{tile.letter}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Points */}
            {gameOver === 'won' && (
              <Text style={styles.modalPoints}>
                +{winAttempts <= 2 ? 100 : winAttempts <= 4 ? 75 : 50} points
              </Text>
            )}

            <Text style={styles.modalSubtitle}>
              {gameOver === 'won'
                ? `Solved in ${winAttempts} attempt${winAttempts !== 1 ? 's' : ''}!`
                : 'Better luck next time!'}
            </Text>

            {/* Share button */}
            <TouchableOpacity style={styles.shareBtn} activeOpacity={0.8}>
              <Text style={styles.shareBtnText}>SHARE ON X</Text>
            </TouchableOpacity>

            {/* Play Next */}
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
    backgroundColor: colors.bg.surface,
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
    marginBottom: spacing.xs,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: colors.brand.primary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: fontSize.base,
    fontFamily: fontFamily.heading,
    textAlign: 'center' as const,
  },
  topStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    color: colors.text.muted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bodySemiBold,
    marginRight: 4,
  },
  statValue: {
    color: colors.text.primary,
    fontSize: fontSize.base,
    fontFamily: fontFamily.bodyBold,
  },
  statEmoji: {
    fontSize: 16,
  },
  levelText: {
    color: colors.brand.primary,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.heading,
    textAlign: 'center',
    letterSpacing: 2,
  },

  // ── Board ──
  boardWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptText: {
    color: colors.text.muted,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    letterSpacing: 1,
    marginBottom: spacing.md,
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
    borderRadius: radius.sm,
  },
  tileLetter: {
    color: colors.text.onTile,
    fontSize: Math.round(TILE_SIZE * 0.45),
    fontFamily: fontFamily.display,
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
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  keyWide: {
    width: KEY_WIDTH * 1.5,
  },
  keyText: {
    fontSize: 15,
    fontFamily: fontFamily.bodyBold,
  },
  keyTextWide: {
    fontSize: 10,
    fontFamily: fontFamily.bodySemiBold,
  },

  // ── Bottom Toolbar ──
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing['2xl'] : spacing['3xl'],
  },
  toolbarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarIconText: {
    fontSize: 18,
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
    borderWidth: 1,
    borderColor: colors.tile.border,
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
  modalBanner: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  modalBannerText: {
    color: colors.text.primary,
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.display,
    letterSpacing: 2,
    textAlign: 'center',
  },
  modalTileRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
  },
  modalTile: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTileLetter: {
    color: colors.text.onTile,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.display,
  },
  modalPoints: {
    color: colors.brand.accent,
    fontSize: fontSize.xl,
    fontFamily: fontFamily.heading,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    color: colors.text.secondary,
    fontSize: fontSize.base,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },
  shareBtn: {
    backgroundColor: colors.bg.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.tile.border,
    marginBottom: spacing.md,
  },
  shareBtnText: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    letterSpacing: 1,
  },
  modalBtnPrimary: {
    width: '100%',
    backgroundColor: colors.brand.primary,
    paddingVertical: spacing.base,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  modalBtnPrimaryText: {
    color: colors.bg.primary,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bodySemiBold,
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
    fontFamily: fontFamily.display,
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
    borderRadius: radius.sm,
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
    fontFamily: fontFamily.display,
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
    color: colors.bg.primary,
    fontSize: fontSize.base,
    fontFamily: fontFamily.bodySemiBold,
  },
});
