import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { DatabaseProvider } from '@/bootstrap/providers/database-provider';
import { AppLockGate } from '@/presentation/components/security/app-lock-gate';
import { LocalizationProvider } from '@/presentation/localization/localization-provider';
import { PreferencesProvider } from '@/presentation/preferences/preferences-provider';
import {
  ThemeProvider,
  useAppTheme,
} from '@/presentation/theme/theme-provider';

export default function RootLayout() {
  return (
    <PreferencesProvider>
      <ThemeProvider>
        <LocalizationProvider>
          <AppLockGate>
            <DatabaseProvider>
              <ThemedRoot />
            </DatabaseProvider>
          </AppLockGate>
        </LocalizationProvider>
      </ThemeProvider>
    </PreferencesProvider>
  );
}

function ThemedRoot() {
  const theme = useAppTheme();
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: theme.colors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="transaction" />
        <Stack.Screen name="account" />
        <Stack.Screen name="category" />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}
