import * as LocalAuthentication from 'expo-local-authentication';
import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/presentation/localization/localization-provider';
import { usePreferences } from '@/presentation/preferences/preferences-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

export function AppLockGate({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const {
    preferences,
    ready,
    sessionUnlocked,
    markSessionUnlocked,
    lockSession,
  } = usePreferences();
  const styles = useThemedStyles(createStyles);
  const authenticating = useRef(false);
  const initialPromptStarted = useRef(false);

  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('settings.lockPrompt'),
        promptDescription: t('settings.lockDescription'),
        fallbackLabel: t('settings.unlock'),
        disableDeviceFallback: false,
      });
      if (result.success) {
        markSessionUnlocked();
      }
    } catch {
      // The locked screen remains visible and lets the user try again.
    } finally {
      authenticating.current = false;
    }
  }, [markSessionUnlocked, t]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (!preferences.lockEnabled) return;
      if (nextState !== 'active') {
        lockSession();
      } else if (!sessionUnlocked) {
        void unlock();
      }
    });
    return () => subscription.remove();
  }, [lockSession, preferences.lockEnabled, sessionUnlocked, unlock]);

  if (!ready) return <View style={styles.loading} />;
  const shouldLock = preferences.lockEnabled && !sessionUnlocked;
  if (!shouldLock) return children;

  return (
    <SafeAreaView
      onLayout={() => {
        if (initialPromptStarted.current) return;
        initialPromptStarted.current = true;
        void unlock();
      }}
      style={styles.safeArea}
    >
      <View style={styles.lockCard}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.title}>{t('settings.locked')}</Text>
        <Pressable onPress={() => void unlock()} style={styles.unlockButton}>
          <Text style={styles.unlockText}>{t('settings.unlock')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    loading: { flex: 1, backgroundColor: theme.colors.background },
    safeArea: {
      flex: 1,
      padding: 24,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lockCard: {
      width: '100%',
      maxWidth: 420,
      padding: 28,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 24,
      borderWidth: 1,
      alignItems: 'center',
      gap: 14,
    },
    icon: { fontSize: 42 },
    title: { color: theme.colors.text, fontSize: 22, fontWeight: '800' },
    unlockButton: {
      width: '100%',
      minHeight: 52,
      marginTop: 8,
      backgroundColor: theme.colors.primary,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unlockText: {
      color: theme.colors.onPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
  });
