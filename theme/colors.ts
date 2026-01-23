// تایپ‌های پایه برای رنگ‌ها
export type ColorToken = string;
export type ColorShade =
  | 50
  | 100
  | 200
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900;

// تایپ‌های خاص برای هر دسته رنگ
export type PrimaryColors = Record<ColorShade, ColorToken>;
export type SystemColors = {
  red: ColorToken;
  orange: ColorToken;
  yellow: ColorToken;
  green: ColorToken;
  mint: ColorToken;
  teal: ColorToken;
  cyan: ColorToken;
  blue: ColorToken;
  indigo: ColorToken;
  purple: ColorToken;
  pink: ColorToken;
  brown: ColorToken;
  black: ColorToken;
  gray: ColorToken;
  gray2: ColorToken;
  gray3: ColorToken;
  gray4: ColorToken;
  gray5: ColorToken;
  gray6: ColorToken;
  white: ColorToken;
};

export type LabelColors = {
  primary: ColorToken;
  secondary: ColorToken;
  tertiary: ColorToken;
  quaternary: ColorToken;
};

export type DarkColors = {
  background: ColorToken;
  surface: ColorToken;
  text: ColorToken;
  'text-secondary': ColorToken;
  border: ColorToken;
};

// تعریف کامل رنگ‌ها
export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  } as const satisfies PrimaryColors,

  background: '#ffffff' as const,
  surface: '#f8fafc' as const,
  text: '#1f2937' as const,
  'text-secondary': '#6b7280' as const,
  border: '#e5e7eb' as const,

  dark: {
    background: '#18181b',
    surface: '#27272a',
    text: '#f4f4f5',
    'text-secondary': '#a1a1aa',
    border: '#3f3f46',
  } as const satisfies DarkColors,

  labels: {
    primary: '#000000',
    secondary: 'rgba(60, 60, 67, 0.60)',
    tertiary: 'rgba(60, 60, 67, 0.30)',
    quaternary: 'rgba(60, 60, 67, 0.18)',
  } as const satisfies LabelColors,

  'labels-dark': {
    primary: '#ffffff',
    secondary: 'rgba(235, 235, 245, 0.60)',
    tertiary: 'rgba(235, 235, 245, 0.30)',
    quaternary: 'rgba(235, 235, 245, 0.18)',
  } as const satisfies LabelColors,

  system: {
    red: '#FF3B30',
    orange: '#FF9500',
    yellow: '#FC0',
    green: '#34C759',
    mint: '#00C7BE',
    teal: '#30B0C7',
    cyan: '#32ADE6',
    blue: '#007AFF',
    indigo: '#5856D6',
    purple: '#AF52DE',
    pink: '#FF2D55',
    brown: '#A2845E',
    black: '#000',
    gray: '#8E8E93',
    gray2: '#AEAEB2',
    gray3: '#C7C7CC',
    gray4: '#D1D1D6',
    gray5: '#E5E5EA',
    gray6: '#F2F2F7',
    white: '#ffffff',
  } as const satisfies SystemColors,

  'system-dark': {
    red: '#FF453A',
    orange: '#FF9F0A',
    yellow: '#FFD60A',
    green: '#30D158',
    mint: '#63E6E2',
    teal: '#40CBE0',
    cyan: '#64D2FF',
    blue: '#0A84FF',
    indigo: '#5E5CE6',
    purple: '#BF5AF2',
    pink: '#FF375F',
    brown: '#AC8E68',
    black: '#000',
    gray: '#8E8E93',
    gray2: '#636366',
    gray3: '#48484A',
    gray4: '#3A3A3C',
    gray5: '#2C2C2E',
    gray6: '#1C1C1E',
    white: '#ffffff',
  } as const satisfies SystemColors,
} as const;

// تایپ کامل رنگ‌ها
export type Colors = typeof colors;

// Helper functions برای دسترسی آسان‌تر
export const getColor = (path: string): ColorToken => {
  const keys = path.split('.');
  let value: unknown = colors;

  for (const key of keys) {
    if (typeof value === 'object' && value !== null && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      throw new Error(`Color not found: ${path}`);
    }
    if (value === undefined) {
      throw new Error(`Color not found: ${path}`);
    }
  }

  return value as ColorToken;
};

export const getPrimaryColor = (shade: ColorShade): ColorToken => {
  return colors.primary[shade];
};

export const getSystemColor = (name: keyof SystemColors): ColorToken => {
  return colors.system[name];
};

export const getDarkSystemColor = (name: keyof SystemColors): ColorToken => {
  return colors['system-dark'][name];
};

export default colors;
