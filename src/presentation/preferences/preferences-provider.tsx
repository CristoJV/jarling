import Storage from 'expo-sqlite/kv-store';
import * as SecureStore from 'expo-secure-store';
import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  type AppPreferences,
  type BudgetPreferences,
} from './preferences';
import { configureFormatting } from '@/presentation/utils/money';

const STORAGE_KEY = 'jarling.preferences.v2';
const LEGACY_STORAGE_KEY = 'jarling.preferences.v1';

async function getStoredPreferences(): Promise<string | null> {
  if (Platform.OS === 'web') return Storage.getItem(STORAGE_KEY);
  const secure = await SecureStore.getItemAsync(STORAGE_KEY);
  if (secure) return secure;
  const legacy = await Storage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    await SecureStore.setItemAsync(STORAGE_KEY, legacy, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await Storage.removeItem(LEGACY_STORAGE_KEY);
  }
  return legacy;
}

async function setStoredPreferences(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await Storage.setItem(STORAGE_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

type PreferencesContextValue = Readonly<{
  preferences: AppPreferences;
  ready: boolean;
  updatePreferences: (changes: Partial<AppPreferences>) => Promise<void>;
  resetBudgetPreferences: () => Promise<void>;
  sessionUnlocked: boolean;
  markSessionUnlocked: () => void;
  lockSession: () => void;
}>;

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);
  const [sessionUnlocked, setSessionUnlocked] = useState(false);

  useEffect(() => {
    let active = true;
    getStoredPreferences()
      .then((stored) => {
        if (!active) return;
        const next = parsePreferences(stored);
        configureFormatting(next);
        setPreferences(next);
      })
      .catch(() => {
        configureFormatting(DEFAULT_PREFERENCES);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const updatePreferences = useCallback(
    async (changes: Partial<AppPreferences>) => {
      const next = { ...preferences, ...changes };
      configureFormatting(next);
      setPreferences(next);
      try {
        await setStoredPreferences(JSON.stringify(next));
      } catch (cause) {
        configureFormatting(preferences);
        setPreferences(preferences);
        throw cause;
      }
    },
    [preferences],
  );

  const resetBudgetPreferences = useCallback(async () => {
    const budgetDefaults: BudgetPreferences = {
      budgetName: DEFAULT_PREFERENCES.budgetName,
      currency: DEFAULT_PREFERENCES.currency,
      numberFormat: DEFAULT_PREFERENCES.numberFormat,
      currencyPlacement: DEFAULT_PREFERENCES.currencyPlacement,
      dateFormat: DEFAULT_PREFERENCES.dateFormat,
    };
    await updatePreferences(budgetDefaults);
  }, [updatePreferences]);
  const markSessionUnlocked = useCallback(() => setSessionUnlocked(true), []);
  const lockSession = useCallback(() => setSessionUnlocked(false), []);

  const value = useMemo(
    () => ({
      preferences,
      ready,
      updatePreferences,
      resetBudgetPreferences,
      sessionUnlocked,
      markSessionUnlocked,
      lockSession,
    }),
    [
      lockSession,
      markSessionUnlocked,
      preferences,
      ready,
      resetBudgetPreferences,
      sessionUnlocked,
      updatePreferences,
    ],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences requires PreferencesProvider.');
  return value;
}
