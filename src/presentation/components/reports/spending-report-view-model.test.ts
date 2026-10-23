import type { SpendingReport } from '@/domain/services/calculate-spending-report';
import { Money } from '@/domain/value-objects/money';

import {
  activeSpendingIntervalKey,
  buildSpendingReportViewModel,
} from './spending-report-view-model';

const food = {
  categoryId: 'food',
  categoryName: 'Food',
  groupId: 'needs',
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
  it('defaults to the current interval and falls back from a stale selection', () => {
    expect(activeSpendingIntervalKey(report)).toBe('2026-10-01');
    expect(activeSpendingIntervalKey(report, 'missing')).toBe('2026-10-01');
  });

  it('aggregates categories by group for the active interval', () => {
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
    const view = buildSpendingReportViewModel({
      ...report,
      categories: [food, transport],
    });

    expect(view.groups).toHaveLength(1);
    expect(view.groups[0]).toMatchObject({
      group: { groupId: 'needs', total: Money.fromCents(21_000) },
      spending: Money.fromCents(10_000),
      percentageOfInterval: 1,
    });
    expect(view.groups[0]?.categories).toHaveLength(2);
  });

  it('uses a selected group for the center and period summary', () => {
    const view = buildSpendingReportViewModel(report, '2026-09-01', {
      kind: 'group',
      groupId: 'needs',
    });

    expect(view.selection).toMatchObject({
      id: 'needs',
      kind: 'group',
      spending: Money.fromCents(-5_000),
      percentageOfInterval: 0,
    });
    expect(view.activeSpending).toEqual(Money.fromCents(-5_000));
    expect(view.windowTotal).toEqual(Money.fromCents(15_000));
    expect(view.intervals.map(({ spending }) => spending.cents)).toEqual([
      10_000, -5_000, 10_000,
    ]);
  });

  it('keeps category selection across intervals with zero spending', () => {
    const transport = {
      ...food,
      categoryId: 'transport',
      categoryName: 'Transport',
      groupId: 'wants',
      groupName: 'Wants',
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
      '2026-10-01',
      { kind: 'category', categoryId: 'transport' },
    );

    expect(view.selection).toMatchObject({
      id: 'transport',
      kind: 'category',
      groupId: 'wants',
      spending: Money.zero(),
    });
    expect(view.activeSpending).toEqual(Money.zero());
    expect(view.windowTotal).toEqual(Money.fromCents(6_000));
    expect(view.windowAverage).toEqual(Money.fromCents(2_000));
    expect(view.intervals.map(({ spending }) => spending.cents)).toEqual([
      2_000, 4_000, 0,
    ]);
  });

  it('ignores stale entity selections without changing report totals', () => {
    const view = buildSpendingReportViewModel(report, undefined, {
      kind: 'category',
      categoryId: 'missing',
    });

    expect(view.selection).toBeUndefined();
    expect(view.activeSpending).toEqual(Money.fromCents(10_000));
    expect(view.windowTotal).toEqual(report.total);
  });
});
