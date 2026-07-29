export const THEME_COLOR_OPTIONS: string[] = [
  '#EAAFB3',
  '#f1aba7',
  '#A8D5C2',
  '#a7c7e7',
  '#d9b8a7',
  '#8B3A42',
  '#111111',
  '#495057',
];

export const DEFAULT_THEME_COLOR = THEME_COLOR_OPTIONS[0];

export function getContrastColor(hex: string): '#FFFFFF' | '#2D2D2D' {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#2D2D2D' : '#FFFFFF';
}

export const COLORS = {
  background: '#faf9f7',
  card: '#FFFFFF',
  textPrimary: '#2D2D2D',
  textSecondary: '#9A9A9A',
  border: '#F0E2E3',
  error: '#E03131',
};

export const SPACING = {
  horizontal: 16,
  verticalSmall: 10,
  verticalMedium: 12,
  verticalLarge: 16,
};

export const RADIUS = {
  card: 12,
  large: 18,
  pill: 24,
};

export const SHADOW = {
  card: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
};

export const TYPE_SCALE = {
  caption: 12,
  small: 14,
  body: 16,
  subtitle: 20,
  title: 24,
};
