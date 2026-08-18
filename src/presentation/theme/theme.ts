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
    warning: string;
    warningMuted: string;
    negative: string;
    negativeMuted: string;
    onNegative: string;
    track: string;
    scrim: string;
    navigation: string;
  }>;
}>;

export const lightTheme: AppTheme = {
  mode: 'light',
  dark: false,
  colors: {
    background: '#f7f7f5',
    surface: '#ffffff',
    surfaceMuted: '#edf1ed',
    surfacePressed: '#f0f6f1',
    surfaceElevated: '#f4f6f3',
    text: '#18201a',
    textSecondary: '#4f5a52',
    textMuted: '#738077',
    border: '#dfe3dc',
    primary: '#294d36',
    onPrimary: '#ffffff',
    primaryMuted: '#d8ebd9',
    positive: '#2d6b40',
    positiveMuted: '#d8ebd9',
    warning: '#806200',
    warningMuted: '#fff0b8',
    negative: '#b42318',
    negativeMuted: '#fde4df',
    onNegative: '#ffffff',
    track: '#e2e7e2',
    scrim: 'rgba(18, 24, 20, 0.42)',
    navigation: '#ffffff',
  },
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  dark: true,
  colors: {
    background: '#080b09',
    surface: '#151a16',
    surfaceMuted: '#202720',
    surfacePressed: '#263128',
    surfaceElevated: '#1b211c',
    text: '#f3f6f3',
    textSecondary: '#c1cac2',
    textMuted: '#929d94',
    border: '#343c35',
    primary: '#8bc79a',
    onPrimary: '#102216',
    primaryMuted: '#243c2a',
    positive: '#86ca97',
    positiveMuted: '#203b28',
    warning: '#f1cb53',
    warningMuted: '#473b13',
    negative: '#ff8f86',
    negativeMuted: '#4a2523',
    onNegative: '#230704',
    track: '#343b35',
    scrim: 'rgba(0, 0, 0, 0.62)',
    navigation: '#111512',
  },
};
