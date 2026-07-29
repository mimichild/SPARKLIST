import {
  THEME_COLOR_OPTIONS,
  DEFAULT_THEME_COLOR,
  getContrastColor,
  COLORS,
  SPACING,
  RADIUS,
  SHADOW,
  TYPE_SCALE,
} from '../../constants/theme';

describe('theme constants', () => {
  it('主題色色票有 8 色，預設為珊瑚粉', () => {
    expect(THEME_COLOR_OPTIONS).toEqual([
      '#EAAFB3', '#f1aba7', '#A8D5C2', '#a7c7e7', '#d9b8a7', '#8B3A42', '#111111', '#495057',
    ]);
    expect(DEFAULT_THEME_COLOR).toBe('#EAAFB3');
  });

  it('固定色符合設計規格', () => {
    expect(COLORS).toEqual({
      background: '#faf9f7',
      card: '#FFFFFF',
      textPrimary: '#2D2D2D',
      textSecondary: '#9A9A9A',
      border: '#F0E2E3',
      error: '#E03131',
    });
  });

  it('間距/圓角/字級 tokens 符合設計規格', () => {
    expect(SPACING).toEqual({ horizontal: 16, verticalSmall: 10, verticalMedium: 12, verticalLarge: 16 });
    expect(RADIUS).toEqual({ card: 12, large: 18, pill: 24 });
    expect(TYPE_SCALE).toEqual({ caption: 12, small: 14, body: 16, subtitle: 20, title: 24 });
  });

  it('SHADOW.card 有固定的 offset/opacity/radius/elevation，不含 shadowColor', () => {
    expect(SHADOW.card).toEqual({
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    });
    expect(SHADOW.card).not.toHaveProperty('shadowColor');
  });
});

describe('getContrastColor', () => {
  it('淺色（高亮度）回傳深色文字', () => {
    expect(getContrastColor('#f1aba7')).toBe('#2D2D2D');
    expect(getContrastColor('#FFFFFF')).toBe('#2D2D2D');
  });

  it('深色（低亮度）回傳白色文字', () => {
    expect(getContrastColor('#111111')).toBe('#FFFFFF');
    expect(getContrastColor('#8B3A42')).toBe('#FFFFFF');
  });
});
