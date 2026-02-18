import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, fontSize, spacing, fontFamily } from '../theme';

type Tab = 'dashboard' | 'leaderboard' | 'profile';

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'dashboard', icon: '🏠', label: 'Home' },
  { key: 'leaderboard', icon: '🏆', label: 'Leaderboard' },
  { key: 'profile', icon: '👤', label: 'Profile' },
];

interface TabBarProps {
  activeTab: Tab;
  onNavigate: (tab: Tab) => void;
}

export function TabBar({ activeTab, onNavigate }: TabBarProps) {
  return (
    <View style={styles.tabBar}>
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onNavigate(tab.key)}
          >
            <Text style={isActive ? styles.tabIconActive : styles.tabIcon}>
              {tab.icon}
            </Text>
            <Text style={isActive ? styles.tabLabelActive : styles.tabLabel}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: colors.tile.border,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.base,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.4,
  },
  tabIconActive: {
    fontSize: 20,
  },
  tabLabel: {
    color: colors.text.muted,
    fontSize: fontSize.xs,
  },
  tabLabelActive: {
    color: colors.brand.primary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bodySemiBold,
  },
});
