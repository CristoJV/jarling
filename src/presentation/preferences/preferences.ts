export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY'] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const NUMBER_FORMATS = [
  'system',
  'decimal-comma',
  'decimal-point',
] as const;
export type NumberFormatPreference = (typeof NUMBER_FORMATS)[number];

export const CURRENCY_PLACEMENTS = ['system', 'before', 'after'] as const;
export type CurrencyPlacement = (typeof CURRENCY_PLACEMENTS)[number];

export const DATE_FORMATS = [
  'system',
  'dd/mm/yyyy',
  'mm/dd/yyyy',
  'yyyy-mm-dd',
] as const;
export type DateFormatPreference = (typeof DATE_FORMATS)[number];

export type AppPreferences = Readonly<{
  budgetName: string;
  currency: CurrencyCode;
  numberFormat: NumberFormatPreference;
  currencyPlacement: CurrencyPlacement;
  dateFormat: DateFormatPreference;
  theme: ThemePreference;
  lockEnabled: boolean;
}>;

export const DEFAULT_PREFERENCES: AppPreferences = {
  budgetName: 'Jarling',
  currency: 'EUR',
  numberFormat: 'system',
  currencyPlacement: 'system',
  dateFormat: 'system',
  theme: 'system',
  lockEnabled: false,
};

export type BudgetPreferences = Pick<
  AppPreferences,
  | 'budgetName'
  | 'currency'
  | 'numberFormat'
  | 'currencyPlacement'
  | 'dateFormat'
>;

export function parsePreferences(value: string | null): AppPreferences {
  if (!value) return DEFAULT_PREFERENCES;
  try {
    const stored: unknown = JSON.parse(value);
    if (!stored || typeof stored !== 'object') return DEFAULT_PREFERENCES;
    const candidate = stored as Partial<AppPreferences>;
    return {
      budgetName:
        typeof candidate.budgetName === 'string' && candidate.budgetName.trim()
          ? candidate.budgetName.trim()
          : DEFAULT_PREFERENCES.budgetName,
      currency: CURRENCIES.includes(candidate.currency as CurrencyCode)
        ? (candidate.currency as CurrencyCode)
        : DEFAULT_PREFERENCES.currency,
      numberFormat: NUMBER_FORMATS.includes(
        candidate.numberFormat as NumberFormatPreference,
      )
        ? (candidate.numberFormat as NumberFormatPreference)
        : DEFAULT_PREFERENCES.numberFormat,
      currencyPlacement: CURRENCY_PLACEMENTS.includes(
        candidate.currencyPlacement as CurrencyPlacement,
      )
        ? (candidate.currencyPlacement as CurrencyPlacement)
        : DEFAULT_PREFERENCES.currencyPlacement,
      dateFormat: DATE_FORMATS.includes(
        candidate.dateFormat as DateFormatPreference,
      )
        ? (candidate.dateFormat as DateFormatPreference)
        : DEFAULT_PREFERENCES.dateFormat,
      theme: THEME_PREFERENCES.includes(candidate.theme as ThemePreference)
        ? (candidate.theme as ThemePreference)
        : DEFAULT_PREFERENCES.theme,
      lockEnabled: candidate.lockEnabled === true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
