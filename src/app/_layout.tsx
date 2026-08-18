import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { DatabaseProvider } from '@/bootstrap/providers/database-provider';
import { LocalizationProvider } from '@/presentation/localization/localization-provider';
import {
  ThemeProvider,
  useAppTheme,
} from '@/presentation/theme/theme-provider';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LocalizationProvider>
        <DatabaseProvider>
          <ThemedRoot />
        </DatabaseProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

function ThemedRoot() {
  const theme = useAppTheme();
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerShown: false,
        }}
      />
    </>
  );
}
