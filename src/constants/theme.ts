/**
 * Design tokens voor de Studiemaat-app.
 *
 * Kleuren komen 1:1 uit de website (studypro/src/app/globals.css): groen (brand), zonnegeel (highlights),
 * warme achtergrond. Gebruik ze via `useTheme()` — nooit een hex in een component.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#17302A',
    background: '#F7F4EE',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F1EDE5',
    textSecondary: '#5F706B',

    primary: '#18775B',
    primaryForeground: '#FFFFFF',
    secondary: '#FFC53D',
    secondaryForeground: '#17302A',

    success: '#23955A',
    successSoft: '#EAF7EF',
    successForeground: '#FFFFFF',
    warning: '#E0901A',
    warningSoft: '#FFF7E6',
    destructive: '#E04B33',
    destructiveSoft: '#FFF0EC',
    destructiveForeground: '#FFFFFF',

    border: '#E6E0D5',
    input: '#E6E0D5',
    muted: '#F1EDE5',
    mutedForeground: '#5F706B',
    accent: '#ECF8F3',
    accentForeground: '#155F4A',

    /** ==highlight== in uittreksels */
    mark: '#FFE38A',
    markText: '#17302A',

    link: '#18775B',
    logo: '#18775B',
  },
  dark: {
    text: '#E9F0ED',
    background: '#0E1614',
    backgroundElement: '#15201D',
    backgroundSelected: '#1B2824',
    textSecondary: '#94A6A0',

    primary: '#45AE8A',
    primaryForeground: '#0E1614',
    secondary: '#FFC53D',
    secondaryForeground: '#0E1614',

    success: '#3FAE70',
    successSoft: '#144D31',
    successForeground: '#0E1614',
    warning: '#F0A92E',
    warningSoft: '#523212',
    destructive: '#F2684D',
    destructiveSoft: '#5B211A',
    destructiveForeground: '#0E1614',

    border: '#253430',
    input: '#253430',
    muted: '#1B2824',
    mutedForeground: '#94A6A0',
    accent: '#134C3D',
    accentForeground: '#D3F0E3',

    mark: '#5A4A17',
    markText: '#FFF4CC',

    link: '#74C9AA',
    logo: '#FFFFFF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Mirrors --radius from bieden/ (0.75rem = 12) */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

// Tab bar height + home-indicator safe area on modern iOS = ~83px;
// Android nav-bar varies (48-56px) so we keep a generous buffer too.
// Screens add this to their scroll's paddingBottom so the last content
// row doesn't get hidden behind the floating tab bar.
export const BottomTabInset = Platform.select({ ios: 90, android: 90 }) ?? 0;
export const MaxContentWidth = 800;
