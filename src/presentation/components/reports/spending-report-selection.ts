import type {
  SpendingCategoryReport,
  SpendingInterval,
  SpendingReport,
} from '@/domain/services/calculate-spending-report';
import { Money } from '@/domain/value-objects/money';
import type { SupportedLanguage } from '@/presentation/localization/translator';

export type SpendingSelectionMetrics = Readonly<{
  spending: Money;
  percentage: number;
}>;

export function categorySelectionMetrics(
  report: SpendingReport,
  category: SpendingCategoryReport,
  selectedIntervalKey?: string,
): SpendingSelectionMetrics {
  const intervalIndex = report.intervals.findIndex(
    ({ key }) => key === selectedIntervalKey,
  );
  const interval = report.intervals[intervalIndex];
  if (!interval) {
    return {
      spending: category.total,
      percentage: category.percentageOfTotal,
    };
  }

  const spending = category.spendingByInterval[intervalIndex] ?? Money.zero();
  return {
    spending,
    percentage:
      interval.spending.cents > 0
        ? spending.cents / interval.spending.cents
        : 0,
  };
}

export function intervalSelectionMetrics(
  report: SpendingReport,
  interval: SpendingInterval,
  selectedCategoryId?: string,
): SpendingSelectionMetrics {
  if (!selectedCategoryId) {
    return {
      spending: interval.spending,
      percentage:
        report.total.cents > 0
          ? interval.spending.cents / report.total.cents
          : 0,
    };
  }

  const spending =
    interval.categories.find(
      ({ categoryId }) => categoryId === selectedCategoryId,
    )?.spending ?? Money.zero();
  return {
    spending,
    percentage:
      interval.spending.cents > 0
        ? spending.cents / interval.spending.cents
        : 0,
  };
}

export function formatReportPeriod(
  report: Pick<SpendingReport, 'interval' | 'intervals'>,
  language: SupportedLanguage,
) {
  const first = report.intervals[0];
  const last = report.intervals.at(-1);
  if (!first || !last) return '';
  const start = new Date(`${first.startDate}T12:00:00Z`);
  const end = new Date(`${last.endDate}T12:00:00Z`);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const monthYear = new Intl.DateTimeFormat(language, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  if (report.interval === 'year') {
    return `${start.getUTCFullYear()} – ${end.getUTCFullYear()}`;
  }
  if (report.interval === 'month') {
    return `${monthYear.format(start)} – ${monthYear.format(end)}`;
  }
  const dayMonth = new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' as const }),
    timeZone: 'UTC',
  });
  return `${dayMonth.format(start)} – ${dayMonth.format(end)}`;
}
