import type { Money } from '@/domain/value-objects/money';
import { getLocales } from 'expo-localization';

const MONEY_INPUT_PATTERN = /^([+-]?)(\d+)(?:[.,](\d{1,2}))?$/;

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

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat(getLocales()[0]?.languageTag ?? 'en-US', {
    style: 'currency',
    currency: 'EUR',
  }).format(money.cents / 100);
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
