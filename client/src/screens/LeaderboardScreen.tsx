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
import { feltToString } from '../dojo/models';
import { getLevel } from '../hooks/usePlayer';
import {
  apolloClient,
  GET_LEADERBOARD,
  type GetLeaderboardResponse,
} from '../dojo/apollo';
import { colors, fontSize, fontWeight, spacing, radius, fontFamily } from '../theme';
import { TabBar } from '../components/TabBar';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 54 : 36;

interface LeaderboardEntry {
  rank: number;
  address: string;
  username: string;
  points: number;
  gamesPlayed: number;
  level: string;
}

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']; // gold, silver, bronze

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr || '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function decodeUsername(raw: string): string {
  try {
    return raw ? feltToString(raw) : '';
  } catch {
    return raw || '';
  }
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <View style={[styles.medalBadge, { backgroundColor: MEDAL_COLORS[rank - 1] }]}>
        <Text style={styles.medalText}>{rank}</Text>
      </View>
    );
  }
  return (
    <View style={styles.rankBadge}>
      <Text style={styles.rankText}>{rank}</Text>
    </View>
  );
}

function PlayerRow({ player, isCurrentUser }: { player: LeaderboardEntry; isCurrentUser?: boolean }) {
  const displayName = player.username || truncateAddress(player.address);
  return (
    <View style={[styles.playerRow, isCurrentUser && styles.playerRowHighlight]}>
      <RankBadge rank={player.rank} />
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{displayName}</Text>
        <Text style={styles.playerMeta}>{player.level} · {player.gamesPlayed} games</Text>
      </View>
      <View style={styles.pointsContainer}>
        <Text style={styles.pointsValue}>{player.points.toLocaleString()}</Text>
        <Text style={styles.pointsLabel}>pts</Text>
      </View>
    </View>
  );
}

export function LeaderboardScreen() {
  const { navigate, goBack } = useContext(NavigationContext);
  const { address: currentAddress } = useDojo();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apolloClient.query<GetLeaderboardResponse>({
        query: GET_LEADERBOARD,
        variables: { first: 50 },
        fetchPolicy: 'network-only',
      });

      const nodes = data?.tweetleDojoPlayerModels?.edges?.map((e) => e.node) ?? [];
      const mapped: LeaderboardEntry[] = nodes.map((node, idx) => {
        const points = Number(node.points);
        const level = getLevel(points);
        return {
          rank: idx + 1,
          address: node.address,
          username: decodeUsername(node.username),
          points,
          gamesPlayed: Number(node.classic_game_count),
          level: level.title,
        };
      });
      setEntries(mapped);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const hasTop3 = top3.length >= 3;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <View style={styles.backBtn} />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No Players Yet</Text>
          <Text style={styles.emptySubtitle}>
            Be the first to win a game and claim the top spot!
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Podium — Top 3 (only if we have 3+ players) */}
          {hasTop3 && (
            <View style={styles.podium}>
              {/* 2nd place */}
              <View style={styles.podiumSlot}>
                <View style={[styles.podiumAvatar, { backgroundColor: MEDAL_COLORS[1] }]}>
                  <Text style={styles.podiumAvatarText}>2</Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {top3[1].username || truncateAddress(top3[1].address)}
                </Text>
                <Text style={styles.podiumPoints}>{top3[1].points.toLocaleString()}</Text>
                <View style={[styles.podiumBar, styles.podiumBar2]} />
              </View>

              {/* 1st place */}
              <View style={styles.podiumSlot}>
                <Text style={styles.crownEmoji}>👑</Text>
                <View style={[styles.podiumAvatar, styles.podiumAvatarFirst, { backgroundColor: MEDAL_COLORS[0] }]}>
                  <Text style={styles.podiumAvatarText}>1</Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {top3[0].username || truncateAddress(top3[0].address)}
                </Text>
                <Text style={styles.podiumPointsFirst}>{top3[0].points.toLocaleString()}</Text>
                <View style={[styles.podiumBar, styles.podiumBar1]} />
              </View>

              {/* 3rd place */}
              <View style={styles.podiumSlot}>
                <View style={[styles.podiumAvatar, { backgroundColor: MEDAL_COLORS[2] }]}>
                  <Text style={styles.podiumAvatarText}>3</Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {top3[2].username || truncateAddress(top3[2].address)}
                </Text>
                <Text style={styles.podiumPoints}>{top3[2].points.toLocaleString()}</Text>
                <View style={[styles.podiumBar, styles.podiumBar3]} />
              </View>
            </View>
          )}

          {/* Player list — show all if <3 players, otherwise 4th onward */}
          <View style={styles.listCard}>
            {(hasTop3 ? rest : entries).map((player) => (
              <PlayerRow
                key={player.address}
                player={player}
                isCurrentUser={player.address === currentAddress}
              />
            ))}
          </View>
        </ScrollView>
      )}

      <TabBar activeTab="leaderboard" onNavigate={(tab) => navigate(tab as any)} />
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
    paddingBottom: spacing.base,
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
    color: colors.brand.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.heading,
    textAlign: 'center',
  },

  // ── Loading / Empty ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    color: colors.text.secondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
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

  // ── Podium ──
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
  },
  crownEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  podiumAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  podiumAvatarFirst: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  podiumAvatarText: {
    color: colors.bg.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
  },
  podiumName: {
    color: colors.text.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
    maxWidth: 90,
    textAlign: 'center',
  },
  podiumPoints: {
    color: colors.text.secondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  podiumPointsFirst: {
    color: colors.gold,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  podiumBar: {
    width: '80%',
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  podiumBar1: {
    height: 80,
    backgroundColor: '#FFD70040',
    borderWidth: 1,
    borderColor: '#FFD70060',
    borderBottomWidth: 0,
  },
  podiumBar2: {
    height: 56,
    backgroundColor: '#C0C0C040',
    borderWidth: 1,
    borderColor: '#C0C0C060',
    borderBottomWidth: 0,
  },
  podiumBar3: {
    height: 40,
    backgroundColor: '#CD7F3240',
    borderWidth: 1,
    borderColor: '#CD7F3260',
    borderBottomWidth: 0,
  },

  // ── Player List ──
  listCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.surfaceLight,
  },
  playerRowHighlight: {
    backgroundColor: 'rgba(0,229,204,0.08)',
    borderLeftWidth: 3,
    borderLeftColor: colors.brand.primary,
  },
  medalBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  medalText: {
    color: colors.bg.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extrabold,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rankText: {
    color: colors.text.secondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  playerMeta: {
    color: colors.text.muted,
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  pointsValue: {
    color: colors.gold,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  pointsLabel: {
    color: colors.text.muted,
    fontSize: 10,
  },

});
