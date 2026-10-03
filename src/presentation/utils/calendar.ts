import { assertValidBudgetMonth } from '@/domain/entities/budget-allocation';

export function localIsoDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function localBudgetMonth(date = new Date()): string {
  return localIsoDate(date).slice(0, 7);
}

export function formatBudgetMonth(
  month: string,
  language: string,
  options: Readonly<Intl.DateTimeFormatOptions> = {
    month: 'long',
    year: 'numeric',
  },
): string {
  assertValidBudgetMonth(month);
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(language, {
    ...options,
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year!, monthNumber! - 1, 1)));
}
