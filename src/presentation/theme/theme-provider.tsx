import type { PropsWithChildren } from 'react';
import { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import { darkTheme, lightTheme, type AppTheme } from './theme';

const ThemeContext = createContext<AppTheme>(lightTheme);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const theme = systemScheme === 'dark' ? darkTheme : lightTheme;
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme(): AppTheme {
  return useContext(ThemeContext);
}

export function useThemedStyles<
  T extends Record<string, ViewStyle | TextStyle | ImageStyle>,
>(factory: (theme: AppTheme) => T): T {
  const theme = useAppTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
