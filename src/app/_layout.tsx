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
import { motion } from '@/presentation/motion/motion';
import { useReducedMotion } from '@/presentation/motion/use-reduced-motion';

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
  const reducedMotion = useReducedMotion();
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          animation: reducedMotion ? 'fade' : 'slide_from_right',
          animationDuration: reducedMotion ? 50 : motion.routeEnter,
          contentStyle: { backgroundColor: theme.colors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen
          name="transaction/new"
          options={{
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
            gestureEnabled: false,
            presentation: 'transparentModal',
          }}
        />
        <Stack.Screen
          name="transaction/[id]"
          options={{
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
            gestureEnabled: false,
            presentation: 'transparentModal',
          }}
        />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}
