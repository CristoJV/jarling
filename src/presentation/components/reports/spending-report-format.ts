import type {
  SpendingInterval,
  SpendingIntervalUnit,
} from '@/domain/services/calculate-spending-report';
import type { TranslationKey } from '@/presentation/localization/translations';
import type {
  SupportedLanguage,
  TranslationParams,
} from '@/presentation/localization/translator';

type Translate = (key: TranslationKey, params?: TranslationParams) => string;

export function formatSpendingPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function spendingPeriodPhrase(
  count: number,
  interval: SpendingIntervalUnit,
  t: Translate,
): string {
  return count === 1
    ? t(`reports.lastOne.${interval}`)
    : t(`reports.last.${interval}`, { count });
}

export function spendingIntervalLabel(
  interval: Pick<SpendingInterval, 'startDate' | 'endDate'>,
  unit: SpendingIntervalUnit,
  language: SupportedLanguage,
  fullYear = false,
): string {
  const start = new Date(`${interval.startDate}T12:00:00Z`);
  const end = new Date(`${interval.endDate}T12:00:00Z`);
  const month = new Intl.DateTimeFormat(language, {
    month: 'short',
    timeZone: 'UTC',
  });
  switch (unit) {
    case 'day':
      return new Intl.DateTimeFormat(language, {
        day: 'numeric',
        month: 'short',
        ...(fullYear ? { year: 'numeric' as const } : {}),
        timeZone: 'UTC',
      }).format(start);
    case 'week': {
      const year = fullYear ? ` ${end.getUTCFullYear()}` : '';
      return start.getUTCMonth() === end.getUTCMonth()
        ? `${start.getUTCDate()}–${end.getUTCDate()} ${month.format(end)}${year}`
        : `${start.getUTCDate()} ${month.format(start)}–${end.getUTCDate()} ${month.format(end)}${year}`;
    }
    case 'month':
      return new Intl.DateTimeFormat(language, {
        month: 'short',
        year: fullYear ? 'numeric' : '2-digit',
        timeZone: 'UTC',
      }).format(start);
    case 'year':
      return String(start.getUTCFullYear());
  }
}
