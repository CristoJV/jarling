import {
  english,
  spanish,
  type TranslationDictionary,
  type TranslationKey,
} from './translations';

export type SupportedLanguage = 'en' | 'es';
export type TranslationParams = Readonly<Record<string, string | number>>;

export function resolveLanguage(
  languageCode?: string | null,
): SupportedLanguage {
  return languageCode?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function translate(
  language: SupportedLanguage,
  key: TranslationKey,
  params: TranslationParams = {},
): string {
  const dictionary: TranslationDictionary =
    language === 'es' ? spanish : english;
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
    dictionary[key],
  );
}
