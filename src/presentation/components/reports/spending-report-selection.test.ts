import type { SpendingReport } from '@/domain/services/calculate-spending-report';
import { Money } from '@/domain/value-objects/money';

import {
  categorySelectionMetrics,
  formatReportPeriod,
  intervalSelectionMetrics,
} from './spending-report-selection';

const category = {
  categoryId: 'food',
  categoryName: 'Food',
  groupName: 'Needs',
  total: Money.fromCents(30_000),
  average: Money.fromCents(15_000),
  spendingByInterval: [Money.fromCents(10_000), Money.fromCents(20_000)],
  percentageOfTotal: 0.5,
  lowestInterval: {
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    spending: Money.fromCents(10_000),
  },
  highestInterval: {
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    spending: Money.fromCents(20_000),
  },
} as const;

const report: SpendingReport = {
  interval: 'month',
  intervalCount: 2,
  total: Money.fromCents(60_000),
  average: Money.fromCents(30_000),
  categories: [category],
  intervals: [
    {
      key: '2026-07-01',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      spending: Money.fromCents(25_000),
      categories: [
        {
          categoryId: 'food',
          spending: Money.fromCents(10_000),
          percentageOfInterval: 0.4,
        },
      ],
    },
    {
      key: '2026-08-01',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      spending: Money.fromCents(35_000),
      categories: [
        {
          categoryId: 'food',
          spending: Money.fromCents(20_000),
          percentageOfInterval: 4 / 7,
        },
      ],
    },
  ],
};

describe('spending report selections', () => {
  it('uses full-period category values without an interval selection', () => {
    expect(categorySelectionMetrics(report, category)).toEqual({
      spending: Money.fromCents(30_000),
      percentage: 0.5,
    });
  });

  it('compares selected-interval category spending with that interval total', () => {
    expect(categorySelectionMetrics(report, category, '2026-08-01')).toEqual({
      spending: Money.fromCents(20_000),
      percentage: 4 / 7,
    });
  });

  it('compares a global interval with the full report period', () => {
    expect(intervalSelectionMetrics(report, report.intervals[0]!)).toEqual({
      spending: Money.fromCents(25_000),
      percentage: 5 / 12,
    });
  });

  it('keeps interval context when a category is selected', () => {
    expect(
      intervalSelectionMetrics(report, report.intervals[0]!, 'food'),
    ).toEqual({ spending: Money.fromCents(10_000), percentage: 0.4 });
  });

  it('preserves a selected net credit without producing a negative percentage', () => {
    const creditCategory = {
      ...category,
      categoryId: 'clothing',
      total: Money.fromCents(-5_000),
      average: Money.fromCents(-2_500),
      spendingByInterval: [Money.zero(), Money.fromCents(-5_000)],
      percentageOfTotal: 0,
    };
    const creditReport: SpendingReport = {
      ...report,
      total: Money.fromCents(55_000),
      categories: [category, creditCategory],
      intervals: [
        report.intervals[0]!,
        {
          ...report.intervals[1]!,
          spending: Money.fromCents(30_000),
          categories: [
            ...report.intervals[1]!.categories,
            {
              categoryId: creditCategory.categoryId,
              spending: Money.fromCents(-5_000),
              percentageOfInterval: 0,
            },
          ],
        },
      ],
    };

    expect(
      categorySelectionMetrics(creditReport, creditCategory, '2026-08-01'),
    ).toEqual({ spending: Money.fromCents(-5_000), percentage: 0 });
    expect(
      intervalSelectionMetrics(
        creditReport,
        creditReport.intervals[1]!,
        creditCategory.categoryId,
      ),
    ).toEqual({ spending: Money.fromCents(-5_000), percentage: 0 });
  });

  it('formats the complete analysed period from its outer boundaries', () => {
    expect(formatReportPeriod(report, 'en')).toBe('Jul 2026 – Aug 2026');
  });
});
