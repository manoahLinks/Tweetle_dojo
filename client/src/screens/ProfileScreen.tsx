import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { NavigationContext } from '../../App';
import { useDojo } from '../dojo/DojoContext';
import { usePlayer, getLevel, LEVELS } from '../hooks/usePlayer';
import {
  apolloClient,
  GET_ALL_PLAYER_ATTEMPTS,
  GET_ALL_DAILY_ATTEMPT_COUNTS,
  type GetAllPlayerAttemptsResponse,
  type GetAllDailyAttemptCountsResponse,
} from '../dojo/apollo';
import { colors, fontSize, fontWeight, spacing, radius, fontFamily } from '../theme';
import { TabBar } from '../components/TabBar';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 54 : 36;
const WIN_HINT = 682; // all 5 letters correct

const MOCK_ACHIEVEMENTS = [
  { id: 'first_win', icon: '🏆', title: 'First Win', desc: 'Win your first game' },
  { id: 'streak_5', icon: '🔥', title: '5-Game Streak', desc: 'Win 5 games in a row' },
  { id: 'daily_champ', icon: '👑', title: 'Daily Champion', desc: 'Win a daily challenge' },
  { id: 'word_master', icon: '📖', title: 'Word Master', desc: 'Solve in 1 attempt' },
];

const MOCK_COLLECTIBLES = [
  { id: 'nft_owl', icon: '🦉', name: 'Tweetle Owl' },
  { id: 'nft_egg', icon: '🥚', name: 'Golden Egg' },
  { id: 'nft_feather', icon: '🪶', name: 'Phoenix Feather' },
];

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr || '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getNextLevel(points: number) {
  const current = getLevel(points);
  const currentIdx = LEVELS.findIndex((l) => l.title === current.title);
  const next = LEVELS[currentIdx + 1];
  if (!next) return { next: null, progress: 1, xpNeeded: 0 };
  const xpIntoLevel = points - current.xp;
  const xpForLevel = next.xp - current.xp;
  return {
    next,
    progress: xpForLevel > 0 ? xpIntoLevel / xpForLevel : 1,
    xpNeeded: next.xp - points,
  };
}

interface ProfileStats {
  classicWins: number;
  dailyGamesPlayed: number;
  bestAttempt: number | null; // fewest attempts to win
}

function StatCard({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const { navigate } = useContext(NavigationContext);
  const { address: playerAddress } = useDojo();
  const { player, loading: playerLoading } = usePlayer();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!playerAddress) return;
    setStatsLoading(true);
    try {
      const [attemptsRes, dailyRes] = await Promise.all([
        apolloClient.query<GetAllPlayerAttemptsResponse>({
          query: GET_ALL_PLAYER_ATTEMPTS,
          variables: { player: playerAddress },
          fetchPolicy: 'network-only',
        }),
        apolloClient.query<GetAllDailyAttemptCountsResponse>({
          query: GET_ALL_DAILY_ATTEMPT_COUNTS,
          variables: { player: playerAddress },
          fetchPolicy: 'network-only',
        }),
      ]);

      // Count classic wins: distinct game_ids with hint_packed == 682
      const attempts = attemptsRes.data?.tweetleDojoClassicAttemptModels?.edges?.map((e) => e.node) ?? [];
      const winningGameIds = new Set<string>();
      let bestAttempt: number | null = null;

      for (const a of attempts) {
        if (Number(a.hint_packed) === WIN_HINT) {
          const gid = String(a.game_id);
          winningGameIds.add(gid);
          const attemptNum = Number(a.attempt_number);
          if (bestAttempt === null || attemptNum < bestAttempt) {
            bestAttempt = attemptNum;
          }
        }
      }

      // Count daily games played (has_joined == true)
      const dailyNodes = dailyRes.data?.tweetleDojoDailyAttemptCountModels?.edges?.map((e) => e.node) ?? [];
      const dailyGamesPlayed = dailyNodes.filter((n) => n.has_joined).length;

      setStats({
        classicWins: winningGameIds.size,
        dailyGamesPlayed,
        bestAttempt,
      });
    } catch {
      // silently fail
    } finally {
      setStatsLoading(false);
    }
  }, [playerAddress]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const loading = playerLoading || statsLoading;
  const points = player?.points ?? 0;
  const level = getLevel(points);
  const { next, progress, xpNeeded } = getNextLevel(points);
  const username = player?.username || 'Player';
  const address = playerAddress || '';

  const classicGames = player?.classicGameCount ?? 0;
  const classicWins = stats?.classicWins ?? 0;
  const winRate = classicGames > 0 ? Math.round((classicWins / classicGames) * 100) : 0;
  const dailyGamesPlayed = stats?.dailyGamesPlayed ?? 0;
  const totalGames = classicGames + dailyGamesPlayed;

  // Unlock achievements based on real data
  const achievements = MOCK_ACHIEVEMENTS.map((a) => {
    let unlocked = false;
    if (a.id === 'first_win' && classicWins > 0) unlocked = true;
    if (a.id === 'daily_champ' && dailyGamesPlayed > 0) unlocked = true;
    if (a.id === 'word_master' && stats?.bestAttempt === 1) unlocked = true;
    // streak_5 stays locked (no streak tracking yet)
    return { ...a, unlocked };
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Identity Card */}
          <View style={styles.identityCard}>
            <View style={styles.avatarRing}>
              <Text style={styles.avatarIcon}>{player?.levelIcon ?? '🥚'}</Text>
            </View>
            <Text style={styles.username}>{username}</Text>
            {address ? (
              <View style={styles.addressPill}>
                <Text style={styles.addressText}>{truncateAddress(address)}</Text>
              </View>
            ) : null}
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{level.icon} {level.title}</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <StatCard value={points.toLocaleString()} label="Points" />
            <StatCard value={String(totalGames)} label="Games" />
            <StatCard value={`${winRate}%`} label="Win Rate" />
          </View>

          {/* Detailed Stats */}
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Game Stats</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Classic Games</Text>
              <Text style={styles.detailValue}>{classicGames}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Classic Wins</Text>
              <Text style={styles.detailValue}>{classicWins}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Daily Games</Text>
              <Text style={styles.detailValue}>{dailyGamesPlayed}</Text>
            </View>
            {stats?.bestAttempt != null && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Best Solve</Text>
                <Text style={[styles.detailValue, styles.detailValueAccent]}>
                  {stats.bestAttempt === 1 ? '1 attempt' : `${stats.bestAttempt} attempts`}
                </Text>
              </View>
            )}
            <View style={[styles.detailRow, styles.detailRowLast]}>
              <Text style={styles.detailLabel}>Friends</Text>
              <Text style={styles.detailValue}>{player?.friendsCount ?? 0}</Text>
            </View>
          </View>

          {/* XP Progress */}
          <View style={styles.xpSection}>
            <View style={styles.xpHeader}>
              <Text style={styles.xpTitle}>Level Progress</Text>
              {next && (
                <Text style={styles.xpInfo}>{xpNeeded} XP to {next.title}</Text>
              )}
            </View>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
            </View>
            <View style={styles.xpLabels}>
              <Text style={styles.xpLabel}>{level.icon} {level.title}</Text>
              {next && <Text style={styles.xpLabel}>{next.icon} {next.title}</Text>}
            </View>
          </View>

          {/* Achievements */}
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsGrid}>
            {achievements.map((a) => (
              <View
                key={a.id}
                style={[styles.achievementCard, !a.unlocked && styles.achievementLocked]}
              >
                <Text style={[styles.achievementIcon, !a.unlocked && styles.achievementIconLocked]}>
                  {a.unlocked ? a.icon : '🔒'}
                </Text>
                <Text style={styles.achievementTitle}>{a.title}</Text>
                <Text style={styles.achievementDesc}>{a.desc}</Text>
              </View>
            ))}
          </View>

          {/* Collectibles */}
          <Text style={styles.sectionTitle}>Collectibles</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.collectiblesRow}
          >
            {MOCK_COLLECTIBLES.map((c) => (
              <View key={c.id} style={styles.collectibleCard}>
                <View style={styles.collectibleIconBg}>
                  <Text style={styles.collectibleIcon}>{c.icon}</Text>
                </View>
                <Text style={styles.collectibleName}>{c.name}</Text>
                <Text style={styles.collectibleTag}>Coming Soon</Text>
              </View>
            ))}
          </ScrollView>
        </ScrollView>
      )}

      <TabBar activeTab="profile" onNavigate={(tab) => navigate(tab as any)} />
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
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.heading,
  },

  // ── Loading ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Body ──
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
  },

  // ── Identity Card ──
  identityCard: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.bg.surface,
    borderWidth: 3,
    borderColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarIcon: {
    fontSize: 36,
  },
  username: {
    color: colors.text.primary,
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.heading,
    marginBottom: spacing.sm,
  },
  addressPill: {
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  addressText: {
    color: colors.text.secondary,
    fontSize: fontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  levelBadge: {
    backgroundColor: colors.brand.primaryAlpha,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  levelBadgeText: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },

  // ── Stats Row ──
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
  statValue: {
    color: colors.gold,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  statValueAccent: {
    color: colors.brand.primary,
  },
  statLabel: {
    color: colors.text.muted,
    fontSize: fontSize.xs,
  },

  // ── Detail Card ──
  detailCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.xl,
  },
  detailTitle: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.surfaceLight,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    color: colors.text.secondary,
    fontSize: fontSize.sm,
  },
  detailValue: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  detailValueAccent: {
    color: colors.success,
  },

  // ── XP Progress ──
  xpSection: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.xl,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  xpTitle: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  xpInfo: {
    color: colors.text.secondary,
    fontSize: fontSize.xs,
  },
  xpBarBg: {
    height: 8,
    backgroundColor: colors.bg.surfaceLight,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  xpBarFill: {
    height: '100%' as any,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.full,
  },
  xpLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpLabel: {
    color: colors.text.muted,
    fontSize: fontSize.xs,
  },

  // ── Achievements ──
  sectionTitle: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.heading,
    marginBottom: spacing.md,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  achievementCard: {
    width: '47%',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    alignItems: 'center',
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  achievementIconLocked: {
    opacity: 0.6,
  },
  achievementTitle: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  achievementDesc: {
    color: colors.text.muted,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },

  // ── Collectibles ──
  collectiblesRow: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  collectibleCard: {
    width: 120,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.bg.surfaceLight,
  },
  collectibleIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.bg.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  collectibleIcon: {
    fontSize: 28,
  },
  collectibleName: {
    color: colors.text.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  collectibleTag: {
    color: colors.text.muted,
    fontSize: 10,
    fontStyle: 'italic',
  },

});
