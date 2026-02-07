import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { useSession } from '../hooks/SessionContext';
import { NavigationContext } from '../../App';
import { colors, fontSize, fontWeight, spacing, radius } from '../theme';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 54 : 36;

const { width } = Dimensions.get('window');
const TILE_SIZE = (width - 120) / 7;

const LOGO_LETTERS = [
  { letter: 'T', color: '#F646E4' },
  { letter: 'W', color: '#9333EA' },
  { letter: 'E', color: '#F646E4' },
  { letter: 'E', color: '#9333EA' },
  { letter: 'T', color: '#F646E4' },
  { letter: 'L', color: '#9333EA' },
  { letter: 'E', color: '#F646E4' },
];

export function LandingScreen() {
  const { isLoading, error, connect } = useSession();
  const { navigate } = useContext(NavigationContext);

  const handleConnect = async () => {
    await connect();
    navigate('dashboard');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Mascot */}
        <Image
          source={require('../../assets/tweetle_mascot.png')}
          style={styles.mascotImage}
          resizeMode="contain"
        />

        {/* Logo tiles */}
        <View style={styles.logoRow}>
          {LOGO_LETTERS.map((item, i) => (
            <View
              key={i}
              style={[styles.logoTile, { backgroundColor: item.color }]}
            >
              <Text style={styles.logoLetter}>{item.letter}</Text>
            </View>
          ))}
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>Solve. Score. Win Rewards</Text>

        {/* Connect button */}
        <TouchableOpacity
          style={[styles.connectButton, isLoading && styles.buttonDisabled]}
          onPress={handleConnect}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.buttonInner}>
              <View style={styles.cartridgeIcon}>
                <Text style={styles.cartridgeIconText}>C</Text>
              </View>
              <Text style={styles.connectText}>Connect with Cartridge</Text>
            </View>
          )}
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by{' '}
          <Text style={styles.footerAccent}>⬡ Starknet</Text>
        </Text>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  mascotImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: spacing['2xl'],
  },
  logoRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.lg,
  },
  logoTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: colors.text.primary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extrabold,
    letterSpacing: 1,
  },
  tagline: {
    color: colors.text.secondary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    marginBottom: spacing['3xl'],
  },
  connectButton: {
    backgroundColor: colors.brand.secondary,
    borderRadius: radius.full,
    paddingVertical: 14,
    paddingHorizontal: spacing['2xl'],
    minWidth: 280,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.brand.primaryAlpha,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cartridgeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartridgeIconText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: fontWeight.bold,
  },
  connectText: {
    color: colors.text.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  error: {
    color: colors.error,
    marginTop: spacing.base,
    textAlign: 'center',
    fontSize: fontSize.sm,
  },
  footer: {
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    color: colors.text.muted,
    fontSize: fontSize.xs,
  },
  footerAccent: {
    color: colors.text.secondary,
    fontWeight: fontWeight.medium,
  },
});
