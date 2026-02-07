import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { NavigationContext } from '../../App';
import { colors, fontSize, fontWeight, spacing, radius } from '../theme';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 54 : 36;

type Tab = 'daily' | 'alltime';

interface PlayerEntry {
  rank: number;
  username: string;
  address: string;
  points: number;
  level: string;
  streak: number;
}

const MOCK_LEADERBOARD: PlayerEntry[] = [
  { rank: 1, username: 'CryptoOwl', address: '0x7a3F...e91D', points: 12450, level: 'Eagle', streak: 28 },
  { rank: 2, username: 'StarKnight', address: '0x4b1C...f3A2', points: 11200, level: 'Hawk', streak: 22 },
  { rank: 3, username: 'DojoMaster', address: '0x9e2D...c8B5', points: 9870, level: 'Hawk', streak: 19 },
  { rank: 4, username: 'WordSmith42', address: '0x1f4A...d7E3', points: 8540, level: 'Nightingale', streak: 15 },
  { rank: 5, username: 'PuzzleBird', address: '0x6c8B...a2F1', points: 7320, level: 'Nightingale', streak: 12 },
  { rank: 6, username: 'TweetleKing', address: '0x3d5E...b9C4', points: 6100, level: 'Songbird', streak: 10 },
  { rank: 7, username: 'BlockOwl', address: '0x8a2F...e1D7', points: 5480, level: 'Songbird', streak: 8 },
  { rank: 8, username: 'NightOwlX', address: '0x2b9C...f4A8', points: 4750, level: 'Fledgling', streak: 6 },
  { rank: 9, username: 'CairoFan', address: '0x5e1D...c7B2', points: 3920, level: 'Fledgling', streak: 5 },
  { rank: 10, username: 'StarkPlayer', address: '0xd4A8...a3E6', points: 3100, level: 'Hatchling', streak: 3 },
];

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']; // gold, silver, bronze

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

function PlayerRow({ player, isCurrentUser }: { player: PlayerEntry; isCurrentUser?: boolean }) {
  return (
    <View style={[styles.playerRow, isCurrentUser && styles.playerRowHighlight]}>
      <RankBadge rank={player.rank} />
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{player.username}</Text>
        <Text style={styles.playerMeta}>{player.level} · {player.streak}d streak</Text>
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
  const [activeTab, setActiveTab] = useState<Tab>('daily');

  const top3 = MOCK_LEADERBOARD.slice(0, 3);
  const rest = MOCK_LEADERBOARD.slice(3);

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

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'daily' && styles.tabPillActive]}
            onPress={() => setActiveTab('daily')}
          >
            <Text style={[styles.tabText, activeTab === 'daily' && styles.tabTextActive]}>
              Daily
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'alltime' && styles.tabPillActive]}
            onPress={() => setActiveTab('alltime')}
          >
            <Text style={[styles.tabText, activeTab === 'alltime' && styles.tabTextActive]}>
              All Time
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Podium — Top 3 */}
        <View style={styles.podium}>
          {/* 2nd place */}
          <View style={styles.podiumSlot}>
            <View style={[styles.podiumAvatar, { backgroundColor: MEDAL_COLORS[1] }]}>
              <Text style={styles.podiumAvatarText}>2</Text>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>{top3[1].username}</Text>
            <Text style={styles.podiumPoints}>{top3[1].points.toLocaleString()}</Text>
            <View style={[styles.podiumBar, styles.podiumBar2]} />
          </View>

          {/* 1st place */}
          <View style={styles.podiumSlot}>
            <Text style={styles.crownEmoji}>👑</Text>
            <View style={[styles.podiumAvatar, styles.podiumAvatarFirst, { backgroundColor: MEDAL_COLORS[0] }]}>
              <Text style={styles.podiumAvatarText}>1</Text>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>{top3[0].username}</Text>
            <Text style={styles.podiumPointsFirst}>{top3[0].points.toLocaleString()}</Text>
            <View style={[styles.podiumBar, styles.podiumBar1]} />
          </View>

          {/* 3rd place */}
          <View style={styles.podiumSlot}>
            <View style={[styles.podiumAvatar, { backgroundColor: MEDAL_COLORS[2] }]}>
              <Text style={styles.podiumAvatarText}>3</Text>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>{top3[2].username}</Text>
            <Text style={styles.podiumPoints}>{top3[2].points.toLocaleString()}</Text>
            <View style={[styles.podiumBar, styles.podiumBar3]} />
          </View>
        </View>

        {/* Remaining players */}
        <View style={styles.listCard}>
          {rest.map((player) => (
            <PlayerRow
              key={player.rank}
              player={player}
              isCurrentUser={player.username === 'TweetleKing'}
            />
          ))}
        </View>
      </ScrollView>

      {/* Bottom tab bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomTab} onPress={() => navigate('dashboard')}>
          <Text style={styles.bottomTabIcon}>🏠</Text>
          <Text style={styles.bottomTabLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomTab}>
          <Text style={styles.bottomTabIconActive}>📊</Text>
          <Text style={styles.bottomTabLabelActive}>Leaderboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomTab}>
          <Text style={styles.bottomTabIcon}>👥</Text>
          <Text style={styles.bottomTabLabel}>Friends</Text>
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
    paddingBottom: spacing.base,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
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
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.full,
    padding: 3,
  },
  tabPill: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  tabPillActive: {
    backgroundColor: colors.brand.primary,
  },
  tabText: {
    color: colors.text.muted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.text.primary,
    fontWeight: fontWeight.bold,
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
    backgroundColor: '#F646E412',
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

  // ── Bottom Bar ──
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: colors.bg.surfaceLight,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.base,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  bottomTabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  bottomTabIconActive: {
    fontSize: 20,
  },
  bottomTabLabel: {
    color: colors.text.muted,
    fontSize: fontSize.xs,
  },
  bottomTabLabelActive: {
    color: colors.text.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
