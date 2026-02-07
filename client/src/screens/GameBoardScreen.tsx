import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { NavigationContext } from '../../App';
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

// ── Game Board Screen ──
export function GameBoardScreen() {
  const { goBack } = useContext(NavigationContext);

  // Clean state — ready for integration
  const [guesses, setGuesses] = useState<TileData[][]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const currentRow = guesses.length;
  const keyStates = getKeyboardStates(guesses);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (key === '⌫') {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (currentGuess.length < grid.cols) {
        setCurrentGuess((prev) => prev + key);
      }
    },
    [currentGuess]
  );

  const handleSubmit = useCallback(() => {
    if (currentGuess.length !== grid.cols) return;
    // TODO: integrate with contract — call submitGuess
    // For now, mark all as absent (placeholder feedback)
    const submittedRow: TileData[] = currentGuess.split('').map((letter) => ({
      letter,
      state: 'absent' as TileState,
    }));
    setGuesses((prev) => [...prev, submittedRow]);
    setCurrentGuess('');
  }, [currentGuess]);

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

  const canSubmit = currentGuess.length === grid.cols;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tweetle</Text>
          <View style={styles.backBtn} />
        </View>

        {/* Info bar */}
        <View style={styles.infoBar}>
          <View style={styles.infoPill}>
            <View style={styles.pillDot}>
              <Text style={styles.pillDotText}>C</Text>
            </View>
            <Text style={styles.pillText}>0x89008</Text>
          </View>

          <View style={styles.infoPillSmall}>
            <Text style={styles.pillEmoji}>📅</Text>
            <Text style={styles.pillText}>19</Text>
          </View>

          <View style={[styles.infoPill, styles.scorePill]}>
            <Text style={styles.pillEmoji}>🪙</Text>
            <Text style={styles.scoreText}>78900</Text>
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
          <Text style={styles.submitText}>Submit</Text>
        </TouchableOpacity>
      </View>
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
});
