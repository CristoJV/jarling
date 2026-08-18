import { getLocales } from 'expo-localization';
import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';

import type { TranslationKey } from './translations';
import {
  resolveLanguage,
  translate,
  type SupportedLanguage,
  type TranslationParams,
} from './translator';

type LocalizationContextValue = Readonly<{
  language: SupportedLanguage;
  t: (key: TranslationKey, params?: TranslationParams) => string;
}>;

const LocalizationContext = createContext<LocalizationContextValue | null>(
  null,
);

export function LocalizationProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState(() =>
    resolveLanguage(getLocales()[0]?.languageCode),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setLanguage(resolveLanguage(getLocales()[0]?.languageCode));
      }
    });
    return () => subscription.remove();
  }, []);
  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) =>
      translate(language, key, params),
    [language],
  );
  const value = useMemo(() => ({ language, t }), [language, t]);

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useTranslation(): LocalizationContextValue {
  const value = useContext(LocalizationContext);
  if (!value)
    throw new Error('useTranslation must be used inside LocalizationProvider');
  return value;
}
