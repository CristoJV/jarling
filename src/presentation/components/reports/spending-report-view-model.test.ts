import type { SpendingReport } from '@/domain/services/calculate-spending-report';
import { Money } from '@/domain/value-objects/money';

import {
  activeSpendingIntervalKey,
  buildSpendingReportViewModel,
} from './spending-report-view-model';

const food = {
  categoryId: 'food',
  categoryName: 'Food',
  groupName: 'Needs',
  total: Money.fromCents(15_000),
  average: Money.fromCents(5_000),
  spendingByInterval: [
    Money.fromCents(10_000),
    Money.fromCents(-5_000),
    Money.fromCents(10_000),
  ],
  percentageOfTotal: 1,
  lowestInterval: {
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    spending: Money.fromCents(-5_000),
  },
  highestInterval: {
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    spending: Money.fromCents(10_000),
  },
} as const;

const report: SpendingReport = {
  interval: 'month',
  intervalCount: 3,
  total: Money.fromCents(15_000),
  average: Money.fromCents(5_000),
  categories: [food],
  intervals: [
    {
      key: '2026-08-01',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      spending: Money.fromCents(10_000),
      categories: [
        {
          categoryId: 'food',
          spending: Money.fromCents(10_000),
          percentageOfInterval: 1,
        },
      ],
    },
    {
      key: '2026-09-01',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      spending: Money.fromCents(-5_000),
      categories: [
        {
          categoryId: 'food',
          spending: Money.fromCents(-5_000),
          percentageOfInterval: 0,
        },
      ],
    },
    {
      key: '2026-10-01',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      spending: Money.fromCents(10_000),
      categories: [
        {
          categoryId: 'food',
          spending: Money.fromCents(10_000),
          percentageOfInterval: 1,
        },
      ],
    },
  ],
};

describe('spending report view model', () => {
  it('defaults to the current interval and falls back when a selection is stale', () => {
    expect(activeSpendingIntervalKey(report)).toBe('2026-10-01');
    expect(activeSpendingIntervalKey(report, 'missing')).toBe('2026-10-01');
  });

  it('selects an earlier interval and separates net credits', () => {
    const view = buildSpendingReportViewModel(report, '2026-09-01');

    expect(view.activeInterval.key).toBe('2026-09-01');
    expect(view.isCurrentInterval).toBe(false);
    expect(view.spendingCategories).toEqual([]);
    expect(view.netCreditCategories[0]).toMatchObject({
      category: { categoryId: 'food' },
      spending: Money.fromCents(-5_000),
    });
  });

  it('uses positive intervals for period shares and the largest bar scale', () => {
    const view = buildSpendingReportViewModel(report);

    expect(view.maximumIntervalSpendingCents).toBe(10_000);
    expect(
      view.intervalRows.map(({ interval, percentageOfWindow }) => ({
        key: interval.key,
        percentageOfWindow,
      })),
    ).toEqual([
      { key: '2026-10-01', percentageOfWindow: 0.5 },
      { key: '2026-09-01', percentageOfWindow: 0 },
      { key: '2026-08-01', percentageOfWindow: 0.5 },
    ]);
  });

  it('uses the selected category for detail, average and interval bars', () => {
    const transport = {
      ...food,
      categoryId: 'transport',
      categoryName: 'Transport',
      total: Money.fromCents(6_000),
      average: Money.fromCents(2_000),
      spendingByInterval: [
        Money.fromCents(2_000),
        Money.fromCents(4_000),
        Money.zero(),
      ],
    };
    const view = buildSpendingReportViewModel(
      { ...report, categories: [food, transport] },
      '2026-09-01',
      'transport',
    );

    expect(view.selectedCategory?.categoryId).toBe('transport');
    expect(view.activeSpending).toEqual(Money.fromCents(4_000));
    expect(view.windowTotal).toEqual(Money.fromCents(6_000));
    expect(view.windowAverage).toEqual(Money.fromCents(2_000));
    expect(view.maximumIntervalSpendingCents).toBe(10_000);
    expect(
      view.intervalRows.map(({ spending, percentageOfWindow }) => ({
        spending: spending.cents,
        percentageOfWindow,
      })),
    ).toEqual([
      { spending: 0, percentageOfWindow: 0 },
      { spending: 4_000, percentageOfWindow: 2 / 3 },
      { spending: 2_000, percentageOfWindow: 1 / 3 },
    ]);
  });

  it('keeps zero net activity distinct from an empty interval', () => {
    const zeroCategory = {
      ...food,
      categoryId: 'transport',
      categoryName: 'Transport',
      total: Money.zero(),
      average: Money.zero(),
      spendingByInterval: [Money.zero(), Money.zero(), Money.zero()],
      percentageOfTotal: 0,
    };
    const zeroReport: SpendingReport = {
      ...report,
      categories: [food, zeroCategory],
      intervals: [
        report.intervals[0]!,
        report.intervals[1]!,
        {
          ...report.intervals[2]!,
          categories: [
            ...report.intervals[2]!.categories,
            {
              categoryId: zeroCategory.categoryId,
              spending: Money.zero(),
              percentageOfInterval: 0,
            },
          ],
        },
      ],
    };

    expect(buildSpendingReportViewModel(zeroReport).zeroNetCategories).toEqual([
      expect.objectContaining({
        category: expect.objectContaining({ categoryId: 'transport' }),
        hasActivity: true,
        spending: Money.zero(),
      }),
    ]);
  });

  it('keeps categories without activity in the selected interval selectable at zero percent', () => {
    const transport = {
      ...food,
      categoryId: 'transport',
      categoryName: 'Transport',
      total: Money.fromCents(2_000),
      average: Money.fromCents(667),
      spendingByInterval: [Money.fromCents(2_000), Money.zero(), Money.zero()],
      percentageOfTotal: 2 / 17,
    };

    const view = buildSpendingReportViewModel({
      ...report,
      categories: [food, transport],
    });

    expect(view.noSpendingCategories).toEqual([
      expect.objectContaining({
        category: expect.objectContaining({ categoryId: 'transport' }),
        hasActivity: false,
        spending: Money.zero(),
        percentageOfInterval: 0,
      }),
    ]);
  });
});
