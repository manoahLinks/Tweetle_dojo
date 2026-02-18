import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDojo } from '../dojo/DojoContext';
import { usePlayer } from '../hooks/usePlayer';
import { NavigationContext } from '../../App';
import { colors, fontSize, fontWeight, spacing, radius, fontFamily, gradients } from '../theme';
import { TabBar } from '../components/TabBar';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 54 : 36;
const PREVIEW_TILE = 40;

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr || '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function DashboardScreen() {
  const { address } = useDojo();
  const { navigate } = useContext(NavigationContext);
  const { player } = usePlayer();

  // Fields not yet in contract — use safe defaults
  const p = player as any;
  const streak = p?.streak ?? 0;
  const lives = p?.lives ?? 5;
  const level = p?.level ?? 1;
  const winRate = player?.classicGameCount
    ? Math.round((p?.wins ?? 0) / player.classicGameCount * 100)
    : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[...gradients.header]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>TWEETLE</Text>
        <Text style={styles.headerSubtitle}>GUESS THE WORD. PROVE YOUR SKILL.</Text>

        <View style={styles.walletBadge}>
          <View style={styles.walletDot}>
            <Text style={styles.walletDotText}>K</Text>
          </View>
          <Text style={styles.walletText}>
            {player?.username || truncateAddress(address || '')}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxEmoji}>🔥</Text>
            <Text style={styles.statBoxValue}>{streak}</Text>
            <Text style={styles.statBoxLabel}>Streak</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxEmoji}>🎮</Text>
            <Text style={styles.statBoxValue}>{player?.classicGameCount ?? 0}</Text>
            <Text style={styles.statBoxLabel}>Played</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxEmoji}>🏆</Text>
            <Text style={styles.statBoxValue}>{winRate}%</Text>
            <Text style={styles.statBoxLabel}>Win %</Text>
          </View>
        </View>

        {/* Daily Challenge Card */}
        <View style={styles.dailyCard}>
          <View style={styles.dailyAccent} />
          <Text style={styles.dailyTitle}>Today's Daily Challenge</Text>
          <Text style={styles.dailyDesc}>
            Solve today's puzzle and earn up to{' '}
            <Text style={styles.dailyHighlight}>50 Points!</Text>
          </Text>

          <View style={styles.previewRow}>
            {['T', 'W', 'E', 'E', 'T'].map((letter, i) => {
              const tileColors = [
                colors.tile.correct,
                colors.tile.present,
                colors.tile.absent,
                colors.tile.correct,
                colors.tile.absent,
              ];
              return (
                <View
                  key={i}
                  style={[styles.previewTile, { backgroundColor: tileColors[i] }]}
                >
                  <Text style={[
                    styles.previewLetter,
                    i === 1 && { color: colors.bg.primary },
                  ]}>{letter}</Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.dailyPlayBtn}
            onPress={() => navigate('gameboard' as any, { mode: 'daily' })}
            activeOpacity={0.8}
          >
            <Text style={styles.dailyPlayBtnText}>PLAY</Text>
          </TouchableOpacity>
        </View>

        {/* Lives */}
        <View style={styles.livesRow}>
          <View style={styles.livesLeft}>
            <Text style={styles.livesEmojis}>
              {'🍃'.repeat(Math.min(lives, 5))}
            </Text>
            <Text style={styles.livesText}>
              {lives} lives remaining
            </Text>
          </View>
          <Text style={styles.livesReset}>Resets in 24h</Text>
        </View>

        {/* Level Badge */}
        <View style={styles.levelBadge}>
          <Text style={styles.levelEmoji}>{player?.levelIcon ?? '🥚'}</Text>
          <View>
            <Text style={styles.levelTitle}>{player?.levelTitle ?? 'Hatchling'}</Text>
            <Text style={styles.levelSubtitle}>Level {level}</Text>
          </View>
        </View>

        {/* Game Modes */}
        <Text style={styles.sectionTitle}>Choose Your Mode</Text>
        <View style={styles.modesRow}>
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => navigate('gameboard' as any, { mode: 'classic' })}
            activeOpacity={0.8}
          >
            <Text style={styles.modeIcon}>🎯</Text>
            <Text style={styles.modeTitle}>Classic</Text>
            <Text style={styles.modeDesc}>6 attempts{'\n'}Use lives</Text>
            <View style={styles.modePlayPill}>
              <Text style={styles.modePlayText}>Play</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, styles.modeCardAccent]}
            onPress={() => navigate('gameboard' as any, { mode: 'daily' })}
            activeOpacity={0.8}
          >
            <Text style={styles.modeIcon}>📅</Text>
            <Text style={styles.modeTitle}>Daily</Text>
            <Text style={styles.modeDesc}>1 word/day{'\n'}Max 50pts</Text>
            <View style={[styles.modePlayPill, styles.modePlayPillAccent]}>
              <Text style={styles.modePlayTextAccent}>Play</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TabBar activeTab="dashboard" onNavigate={(tab) => navigate(tab as any)} />
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
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.brand.primary,
    fontSize: fontSize['3xl'],
    fontFamily: fontFamily.display,
    letterSpacing: 4,
  },
  headerSubtitle: {
    color: colors.text.muted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bodySemiBold,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,229,204,0.12)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  walletDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletDotText: {
    color: colors.bg.primary,
    fontSize: 11,
    fontWeight: fontWeight.bold,
  },
  walletText: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
  },

  // ── Body ──
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
  },

  // ── Stats Row ──
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.tile.border,
  },
  statBoxEmoji: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  statBoxValue: {
    color: colors.text.primary,
    fontSize: fontSize.xl,
    fontFamily: fontFamily.heading,
  },
  statBoxLabel: {
    color: colors.text.muted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
  },

  // ── Daily Card ──
  dailyCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.tile.border,
    overflow: 'hidden',
  },
  dailyAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.brand.primary,
  },
  dailyTitle: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.heading,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  dailyDesc: {
    color: colors.text.secondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.base,
  },
  dailyHighlight: {
    color: colors.brand.primary,
    fontFamily: fontFamily.bodyBold,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.base,
  },
  previewTile: {
    width: PREVIEW_TILE,
    height: PREVIEW_TILE,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLetter: {
    color: colors.text.onTile,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.display,
  },
  dailyPlayBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dailyPlayBtnText: {
    color: colors.bg.primary,
    fontSize: fontSize.base,
    fontFamily: fontFamily.bodySemiBold,
    letterSpacing: 2,
  },

  // ── Lives ──
  livesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.tile.border,
  },
  livesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  livesEmojis: {
    fontSize: 16,
    letterSpacing: 2,
  },
  livesText: {
    color: colors.text.secondary,
    fontSize: fontSize.sm,
  },
  livesReset: {
    color: colors.text.muted,
    fontSize: fontSize.xs,
  },

  // ── Level Badge ──
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.tile.border,
  },
  levelEmoji: {
    fontSize: 32,
  },
  levelTitle: {
    color: colors.text.primary,
    fontSize: fontSize.base,
    fontFamily: fontFamily.heading,
  },
  levelSubtitle: {
    color: colors.text.muted,
    fontSize: fontSize.sm,
  },

  // ── Game Modes ──
  sectionTitle: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.heading,
    marginBottom: spacing.md,
  },
  modesRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  modeCard: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.tile.border,
  },
  modeCardAccent: {
    borderColor: colors.brand.primary,
  },
  modeIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  modeTitle: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.heading,
    marginBottom: spacing.xs,
  },
  modeDesc: {
    color: colors.text.secondary,
    fontSize: fontSize.xs,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  modePlayPill: {
    backgroundColor: colors.bg.surfaceLight,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  modePlayPillAccent: {
    backgroundColor: colors.brand.primary,
  },
  modePlayText: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
  },
  modePlayTextAccent: {
    color: colors.bg.primary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
  },

});
