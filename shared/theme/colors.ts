export const palette = {
  white: '#ffffff',
  black: '#000000',

  ink950: '#0b0d1a',
  ink900: '#0f1222',
  ink850: '#151a2e',
  ink800: '#1c2236',
  ink700: '#2a3149',
  ink600: '#4b5166',
  ink500: '#5f6475',
  ink400: '#8a8fa0',
  ink300: '#b4b7c3',
  ink200: '#e3e5ec',
  ink150: '#eceef3',
  ink100: '#f1f2f6',
  ink50: '#f8f9fc',

  indigo50: '#f4f4fe',
  indigo100: '#efeefe',
  indigo200: '#dedffb',
  indigo300: '#b9b6f6',
  indigo400: '#7f78ee',
  indigo500: '#6159e8',
  indigo600: '#5048e5',
  indigo700: '#4038d0',
  indigo900: '#221f5e',
  indigo950: '#17153f',

  amber400: '#f4c02c',
  green500: '#3da84a',
  red100: '#fde7e8',
  red500: '#e53935',
  red600: '#d93a3a',
  red900: '#4a1518',
  sand100: '#f6f4ef',
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceSunken: string;
  surfaceHover: string;
  surfaceSelected: string;
  border: string;
  borderStrong: string;

  text: string;
  textMuted: string;
  textSubtle: string;

  primary: string;
  primaryHover: string;
  onPrimary: string;
  primarySoft: string;

  star: string;
  online: string;
  danger: string;
  dangerSoft: string;
  unread: string;
  focusRing: string;
  scrim: string;

  welcome: string;
  chatBackground: string;
  bubbleIn: string;
  bubbleOut: string;
  onBubbleOut: string;

  emailCanvas: string;
  emailText: string;
}

export const lightColors: ThemeColors = {
  background: palette.ink50,
  surface: palette.white,
  surfaceMuted: palette.ink50,
  surfaceSunken: palette.ink100,
  surfaceHover: palette.ink100,
  surfaceSelected: palette.indigo100,
  border: palette.ink150,
  borderStrong: palette.ink200,

  text: palette.ink900,
  textMuted: palette.ink500,
  textSubtle: palette.ink400,

  primary: palette.indigo600,
  primaryHover: palette.indigo700,
  onPrimary: palette.white,
  primarySoft: palette.indigo200,

  star: palette.amber400,
  online: palette.green500,
  danger: palette.red600,
  dangerSoft: palette.red100,
  unread: palette.indigo600,
  focusRing: palette.indigo400,
  scrim: 'rgba(15, 18, 34, 0.45)',

  welcome: palette.indigo50,
  chatBackground: palette.sand100,
  bubbleIn: palette.white,
  bubbleOut: palette.indigo600,
  onBubbleOut: palette.white,

  emailCanvas: palette.white,
  emailText: palette.ink900,
};

export const darkColors: ThemeColors = {
  background: palette.ink950,
  surface: palette.ink900,
  surfaceMuted: palette.ink850,
  surfaceSunken: palette.ink800,
  surfaceHover: palette.ink800,
  surfaceSelected: palette.indigo950,
  border: palette.ink800,
  borderStrong: palette.ink700,

  text: palette.ink100,
  textMuted: palette.ink300,
  textSubtle: palette.ink400,

  primary: palette.indigo500,
  primaryHover: palette.indigo400,
  onPrimary: palette.white,
  primarySoft: palette.indigo900,

  star: palette.amber400,
  online: palette.green500,
  danger: palette.red500,
  dangerSoft: palette.red900,
  unread: palette.indigo400,
  focusRing: palette.indigo300,
  scrim: 'rgba(0, 0, 0, 0.6)',

  welcome: palette.ink900,
  chatBackground: palette.ink950,
  bubbleIn: palette.ink800,
  bubbleOut: palette.indigo600,
  onBubbleOut: palette.white,

  emailCanvas: palette.white,
  emailText: palette.ink900,
};

export type ColorScheme = 'light' | 'dark';

export const themes: Record<ColorScheme, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};

export const labelColors = {
  green: '#5ac14e',
  yellow: '#f6c73b',
  red: '#ee4655',
  blue: '#5a98ef',
  teal: '#4cc6bb',
  purple: '#9b7bf0',
  orange: '#f59e4c',
  pink: '#e879b9',
} as const;
export type LabelColor = keyof typeof labelColors;

export const avatarColors = [
  '#c3caf8',
  '#e07dc0',
  '#6d65bb',
  '#f4cc74',
  '#75d0d1',
  '#f7937c',
  '#d5463e',
  '#94baf9',
  '#f37581',
  '#79d266',
] as const;

export const fileColors = {
  pdf: '#e53935',
  doc: '#4285f4',
  sheet: '#34a853',
  slides: '#f9ab00',
  image: '#9b7bf0',
  archive: '#8a8fa0',
  other: '#5f6475',
} as const;
export type FileKind = keyof typeof fileColors;

export function textOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.36 ? palette.ink900 : palette.white;
}
