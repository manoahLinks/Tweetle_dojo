// Tweetle Design Tokens — Teal/Navy theme
// Single source of truth — matches tweetle_skills design spec

export const colors = {
  // Brand
  brand: {
    primary: '#00E5CC',
    primaryAlpha: '#00E5CCB2',
    secondary: '#0E1A20',
    secondaryAlpha: '#0E1A20E5',
    accent: '#E8A530',
    accentAlpha: '#E8A53080',
  },

  // Backgrounds
  bg: {
    primary: '#0E1A20',
    surface: '#14232B',
    surfaceLight: '#1A2D36',
  },

  // Tile states
  tile: {
    correct: '#1B8E47',
    present: '#FFD93D',
    absent: 'rgba(12,141,138,0.32)',
    empty: '#14232B',
    border: '#1E4A5A',
    activeBorder: '#00E5CCB2',
  },

  // Splash
  splash: {
    sky: '#66E1DE',
    skyLight: '#EDFFFF',
    skyDark: '#07BAB5',
    grass: '#5CB338',
    earth: '#C5961B',
    nest: '#E8A530',
    banner: '#B2E5DC',
  },

  // UI feedback
  success: '#1B8E47',
  warning: '#EAB308',
  error: '#EF4444',
  info: '#00E5CC',
  gold: '#D4A017',
  silver: '#9CA3AF',

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#8BA8B8',
    accent: '#00E5CC',
    muted: '#4A6A7A',
    onTile: '#FFFFFF',
  },
} as const;

export const gradients = {
  splash: ['#EDFFFF', '#EDFFFF', '#66E1DE', '#07BAB5'] as const,
  splashLocations: [0, 0.15, 0.5, 1] as const,
  header: ['#0E1A20', '#14232B'] as const,
  gold: ['#E8A530', '#D4941A'] as const,
} as const;

export const fontFamily = {
  display: 'Bungee',
  heading: 'FredokaOne',
  body: 'Inter',
  bodyMedium: 'Inter-Medium',
  bodySemiBold: 'Inter-SemiBold',
  bodyBold: 'Inter-Bold',
  mono: 'JetBrainsMono',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

// Use RN-compatible fontWeight literal types
export const fontWeight = {
  normal: 'normal',
  medium: '500',
  semibold: '600',
  bold: 'bold',
  extrabold: '800',
} as const satisfies Record<string, import('react-native').TextStyle['fontWeight']>;

// Game grid
export const grid = {
  cols: 5,
  rows: 6,
  tileSize: 52,
  tileGap: 4,
  keyHeight: 52,
  keyGap: 4,
} as const;
