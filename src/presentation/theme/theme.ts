export type ThemeMode = 'light' | 'dark';

export type AppTheme = Readonly<{
  mode: ThemeMode;
  dark: boolean;
  colors: Readonly<{
    background: string;
    surface: string;
    surfaceMuted: string;
    surfacePressed: string;
    surfaceElevated: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    primary: string;
    onPrimary: string;
    primaryMuted: string;
    positive: string;
    positiveMuted: string;
    progressFunded: string;
    progressSpent: string;
    progressWarningFunded: string;
    progressWarningSpent: string;
    warning: string;
    warningMuted: string;
    negative: string;
    negativeMuted: string;
    onNegative: string;
    track: string;
    scrim: string;
    navigation: string;
  }>;
  spacing: Readonly<{ xs: 4; sm: 8; md: 12; lg: 16; xl: 24; xxl: 32 }>;
  radii: Readonly<{ sm: 8; md: 12; lg: 18; xl: 24; pill: 999 }>;
  typography: Readonly<{
    caption: 12;
    body: 15;
    title: 21;
    display: 32;
  }>;
  elevation: Readonly<{
    card: 2;
    floating: 7;
    modal: 12;
  }>;
}>;

const sharedTokens = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radii: { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 },
  typography: { caption: 12, body: 15, title: 21, display: 32 },
  elevation: { card: 2, floating: 7, modal: 12 },
} as const;

export const lightTheme: AppTheme = {
  mode: 'light',
  dark: false,
  colors: {
    background: '#f0f1f6',
    surface: '#ffffff',
    surfaceMuted: '#f7f7fb',
    surfacePressed: '#eeeefe',
    surfaceElevated: '#ffffff',
    text: '#181925',
    textSecondary: '#505164',
    textMuted: '#747589',
    border: '#ddddea',
    primary: '#5b54e8',
    onPrimary: '#ffffff',
    primaryMuted: '#e7e5ff',
    positive: '#2d6b40',
    positiveMuted: '#d8ebd9',
    progressFunded: '#66b77a',
    progressSpent: '#246138',
    progressWarningFunded: '#f0c94b',
    progressWarningSpent: '#9a7400',
    warning: '#806200',
    warningMuted: '#fff0b8',
    negative: '#b42318',
    negativeMuted: '#fde4df',
    onNegative: '#ffffff',
    track: '#e2e7e2',
    scrim: 'rgba(18, 24, 20, 0.42)',
    navigation: '#f8f8fc',
  },
  ...sharedTokens,
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  dark: true,
  colors: {
    background: '#080811',
    surface: '#151522',
    surfaceMuted: '#1d1d2c',
    surfacePressed: '#282741',
    surfaceElevated: '#202031',
    text: '#f5f4fb',
    textSecondary: '#c5c4d3',
    textMuted: '#9392a5',
    border: '#353447',
    primary: '#9b96ff',
    onPrimary: '#111022',
    primaryMuted: '#302e62',
    positive: '#86ca97',
    positiveMuted: '#203b28',
    progressFunded: '#75c98c',
    progressSpent: '#2f7445',
    progressWarningFunded: '#e7c754',
    progressWarningSpent: '#8e731b',
    warning: '#f1cb53',
    warningMuted: '#473b13',
    negative: '#ff8f86',
    negativeMuted: '#4a2523',
    onNegative: '#230704',
    track: '#353545',
    scrim: 'rgba(0, 0, 0, 0.62)',
    navigation: '#11111c',
  },
  ...sharedTokens,
};
