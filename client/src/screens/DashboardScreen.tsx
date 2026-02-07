import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { useSession } from '../hooks/SessionContext';
import { NavigationContext } from '../../App';
import { colors, fontSize, fontWeight, spacing, radius } from '../theme';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 54 : 36;

const PREVIEW_TILE = 44;

const MOCK = {
  score: 5769,
  level: 'Novice',
  levelIcon: '🏆',
  streak: 3,
  dailyWord: ['N', 'E', 'S', 'T', 'L'],
  dailyTileColors: [
    colors.tile.correct,
    colors.tile.absent,
    colors.tile.correct,
    colors.tile.present,
    colors.tile.absent,
  ],
};

export function DashboardScreen() {
  const _session = useSession();
  const { navigate, goBack } = useContext(NavigationContext);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={goBack}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Tweetle</Text>
            <Text style={styles.headerSubtitle}>bot</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <TouchableOpacity style={styles.walletBadge}>
          <View style={styles.walletIcon}>
            <Text style={styles.walletIconText}>C</Text>
          </View>
          <Text style={styles.walletText}>Connect wallet</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Birdle Challenge */}
        <View style={styles.challengeSection}>
          <Image
            source={require('../../assets/tweetle_mascot.png')}
            style={styles.mascotSmall}
            resizeMode="contain"
          />
          <Text style={styles.challengeTitle}>Birdle Challenge</Text>
          <Text style={styles.challengeSubtitle}>
            Solve. Score. Win Rewards.
          </Text>

          <View style={styles.scoreRow}>
            <View style={styles.scorePill}>
              <Text style={styles.coinIcon}>🪙</Text>
              <Text style={styles.scoreValue}>
                {MOCK.score.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.badgesRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>{MOCK.levelIcon}</Text>
              <Text style={styles.badgeLabel}>Level</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>🐣</Text>
              <Text style={styles.badgeLabel}>{MOCK.level}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>⋯</Text>
              <Text style={styles.badgeLabel}>More</Text>
            </View>
          </View>
        </View>

        {/* Game Modes */}
        <Text style={styles.sectionTitle}>Choose Your Mode</Text>
        <View style={styles.modesRow}>
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => navigate('gameboard')}
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
            style={[styles.modeCard, styles.modeCardDaily]}
            onPress={() => navigate('gameboard')}
            activeOpacity={0.8}
          >
            <Text style={styles.modeIcon}>📅</Text>
            <Text style={styles.modeTitle}>Daily</Text>
            <Text style={styles.modeDesc}>1 word/day{'\n'}Max 50pts</Text>
            <View style={[styles.modePlayPill, styles.modePlayPillDaily]}>
              <Text style={styles.modePlayText}>Play</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Today's Daily Challenge */}
        <View style={styles.dailyCard}>
          <Text style={styles.dailyTitle}>Today's Daily Challenge</Text>

          <View style={styles.previewRow}>
            {MOCK.dailyWord.map((letter, i) => (
              <View
                key={i}
                style={[
                  styles.previewTile,
                  { backgroundColor: MOCK.dailyTileColors[i] },
                ]}
              >
                <Text style={styles.previewLetter}>{letter}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.dailyDescription}>
            Think You've Got What It Takes? Solve Today's Puzzle And Earn The
            Max Reward Of{' '}
            <Text style={styles.dailyHighlight}>50 Points!</Text> Put Your Word
            Skills To The Test And Climb The Leaderboard With Each Victory.
          </Text>

          <TouchableOpacity
            style={styles.playButton}
            onPress={() => navigate('gameboard')}
            activeOpacity={0.8}
          >
            <Text style={styles.playButtonText}>Play Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabIconActive}>🏠</Text>
          <Text style={styles.tabLabelActive}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => navigate('leaderboard')}>
          <Text style={styles.tabIcon}>📊</Text>
          <Text style={styles.tabLabel}>Leaderboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabIcon}>👥</Text>
          <Text style={styles.tabLabel}>Friends</Text>
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
  header: {
    backgroundColor: colors.brand.secondary,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginBottom: spacing.base,
  },
  backText: {
    color: colors.info,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  headerSubtitle: {
    color: colors.text.muted,
    fontSize: fontSize.xs,
  },
  walletBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand.primaryAlpha,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  walletIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletIconText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: fontWeight.bold,
  },
  walletText: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  challengeSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  mascotSmall: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: spacing.sm,
  },
  challengeTitle: {
    color: colors.text.primary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extrabold,
    marginBottom: spacing.xs,
  },
  challengeSubtitle: {
    color: colors.text.secondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.base,
  },
  scoreRow: {
    marginBottom: spacing.base,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  coinIcon: {
    fontSize: 16,
  },
  scoreValue: {
    color: colors.gold,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  badge: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  badgeIcon: {
    fontSize: 24,
  },
  badgeLabel: {
    color: colors.text.secondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
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
    borderColor: colors.bg.surfaceLight,
  },
  modeCardDaily: {
    borderColor: colors.brand.primary,
  },
  modeIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  modeTitle: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
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
    backgroundColor: colors.brand.secondary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  modePlayPillDaily: {
    backgroundColor: colors.brand.primary,
  },
  modePlayText: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  dailyCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  dailyTitle: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.base,
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  dailyDescription: {
    color: colors.text.secondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.base,
  },
  dailyHighlight: {
    color: colors.brand.primary,
    fontWeight: fontWeight.bold,
  },
  playButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  playButtonText: {
    color: colors.text.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: colors.bg.surfaceLight,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.base,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabIconActive: {
    fontSize: 20,
  },
  tabLabel: {
    color: colors.text.muted,
    fontSize: fontSize.xs,
  },
  tabLabelActive: {
    color: colors.text.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
