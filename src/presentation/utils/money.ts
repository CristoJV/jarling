import type { Money } from '@/domain/value-objects/money';
import { getLocales } from 'expo-localization';
import {
  DEFAULT_PREFERENCES,
  type AppPreferences,
} from '@/presentation/preferences/preferences';

const MONEY_INPUT_PATTERN = /^([+-]?)(\d+)(?:[.,](\d{1,2}))?$/;
let formatting: AppPreferences = DEFAULT_PREFERENCES;

export function configureFormatting(preferences: AppPreferences): void {
  formatting = preferences;
}

function formattingLocale(preferences: AppPreferences): string {
  if (preferences.numberFormat === 'decimal-comma') return 'es-ES';
  if (preferences.numberFormat === 'decimal-point') return 'en-US';
  return getLocales()[0]?.languageTag ?? 'en-US';
}

export function parseMoneyInput(input: string): number | null {
  const match = MONEY_INPUT_PATTERN.exec(input.trim());

  if (!match) {
    return null;
  }

  const [, sign, wholePart, decimalPart = ''] = match;
  const absoluteCents =
    Number(wholePart) * 100 + Number(decimalPart.padEnd(2, '0'));
  const cents = sign === '-' ? -absoluteCents : absoluteCents;

  return Number.isSafeInteger(cents) ? cents : null;
}

export function formatMoney(
  money: Money,
  preferences: AppPreferences = formatting,
): string {
  const locale = formattingLocale(preferences);
  const amount = money.cents / 100;
  if (preferences.currencyPlacement === 'system') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: preferences.currency,
    }).format(amount);
  }

  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  const symbol =
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: preferences.currency,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find(({ type }) => type === 'currency')?.value ?? preferences.currency;
  return preferences.currencyPlacement === 'before'
    ? `${symbol}${number}`
    : `${number} ${symbol}`;
}

export function formatDate(
  value: string,
  language: string,
  preferences: AppPreferences = formatting,
): string {
  if (preferences.dateFormat === 'yyyy-mm-dd') return value;
  const [year, month, day] = value.split('-');
  if (preferences.dateFormat === 'dd/mm/yyyy') return `${day}/${month}/${year}`;
  if (preferences.dateFormat === 'mm/dd/yyyy') return `${month}/${day}/${year}`;
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

export function appendMoneyDigit(cents: number, digit: number): number {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) {
    return cents;
  }

  const sign = cents < 0 ? -1 : 1;
  const next = Math.abs(cents) * 10 + digit;
  return Number.isSafeInteger(next) ? next * sign : cents;
}

export function removeMoneyDigit(cents: number): number {
  return Math.trunc(cents / 10);
}

export function toggleMoneySign(cents: number): number {
  return cents === 0 ? 0 : -cents;
}
