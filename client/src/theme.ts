// Tweetle Design Tokens
// Single source of truth — matches tokens/design-tokens.md

export const colors = {
  // Brand
  brand: {
    primary: '#F646E4',
    primaryAlpha: '#F646E4B2',
    secondary: '#371C5F',
    secondaryAlpha: '#371C5FE5',
  },

  // Backgrounds
  bg: {
    primary: '#000000',
    surface: '#1A1A2E',
    surfaceLight: '#2A2A3E',
  },

  // Tile states
  tile: {
    correct: '#22C55E',
    present: '#CA8A04',
    absent: '#4B5563',
    empty: '#2A2A3E',
    border: '#4B5563',
    activeBorder: '#F646E4B2',
  },

  // UI feedback
  success: '#22C55E',
  warning: '#EAB308',
  error: '#EF4444',
  info: '#3B82F6',
  gold: '#D4A017',
  silver: '#9CA3AF',

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#9CA3AF',
    accent: '#F646E4',
    muted: '#6B7280',
    onTile: '#FFFFFF',
  },
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
