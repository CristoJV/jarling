import type { Account } from '@/domain/entities/account';
import type { Category } from '@/domain/entities/category';
import type { CategoryGroup } from '@/domain/entities/category-group';
import { createTransaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

import {
  buildSpendingIntervals,
  calculateSpendingReport,
  type SpendingIntervalUnit,
} from './calculate-spending-report';

const accounts: readonly Account[] = [
  {
    id: 'cash',
    name: 'Cash',
    type: 'checking',
    onBudget: true,
    closed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tracking',
    name: 'Tracking',
    type: 'tracking',
    onBudget: false,
    closed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];
const groups: readonly CategoryGroup[] = [
  {
    id: 'needs',
    name: 'Needs',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];
const categories: readonly Category[] = [
  {
    id: 'food',
    groupId: 'needs',
    name: 'Groceries',
    hidden: false,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'transport',
    groupId: 'needs',
    name: 'Transport',
    hidden: false,
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

function expense(
  id: string,
  amountCents: number,
  date: string,
  categoryId: string,
  accountId = 'cash',
) {
  return createTransaction({
    id,
    accountId,
    categoryId,
    amount: Money.fromCents(-amountCents),
    date,
    status: 'cleared',
    kind: 'standard',
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  });
}

describe('buildSpendingIntervals', () => {
  it.each<
    readonly [
      SpendingIntervalUnit,
      string,
      number,
      readonly Readonly<{ startDate: string; endDate: string }>[],
    ]
  >([
    [
      'day',
      '2026-01-02',
      3,
      [
        { startDate: '2025-12-31', endDate: '2025-12-31' },
        { startDate: '2026-01-01', endDate: '2026-01-01' },
        { startDate: '2026-01-02', endDate: '2026-01-02' },
      ],
    ],
    [
      'week',
      '2026-08-20',
      2,
      [
        { startDate: '2026-08-10', endDate: '2026-08-16' },
        { startDate: '2026-08-17', endDate: '2026-08-23' },
      ],
    ],
    [
      'month',
      '2026-03-15',
      2,
      [
        { startDate: '2026-02-01', endDate: '2026-02-28' },
        { startDate: '2026-03-01', endDate: '2026-03-31' },
      ],
    ],
    [
      'year',
      '2026-08-20',
      2,
      [
        { startDate: '2025-01-01', endDate: '2025-12-31' },
        { startDate: '2026-01-01', endDate: '2026-12-31' },
      ],
    ],
  ])(
    'builds consecutive %s intervals',
    (interval, throughDate, count, expected) => {
      expect(
        buildSpendingIntervals({ interval, throughDate, intervalCount: count }),
      ).toEqual(expected.map((value) => ({ ...value, key: value.startDate })));
    },
  );

  it('rejects invalid dates and counts', () => {
    expect(() =>
      buildSpendingIntervals({
        interval: 'week',
        intervalCount: 0,
        throughDate: '2026-08-20',
      }),
    ).toThrow('intervalCount must be a positive integer');
    expect(() =>
      buildSpendingIntervals({
        interval: 'week',
        intervalCount: 8,
        throughDate: '2026-02-31',
      }),
    ).toThrow('throughDate must be a valid ISO date');
  });
});

describe('calculateSpendingReport', () => {
  it('returns zero-filled intervals when there is no spending', () => {
    const report = calculateSpendingReport({
      throughDate: '2026-08-26',
      interval: 'day',
      intervalCount: 3,
      accounts,
      categories,
      groups,
      transactions: [],
    });

    expect(report.total).toEqual(Money.zero());
    expect(report.average).toEqual(Money.zero());
    expect(report.categories).toEqual([]);
    expect(report.intervals.map(({ spending }) => spending)).toEqual([
      Money.zero(),
      Money.zero(),
      Money.zero(),
    ]);
  });

  it('uses the same weekly intervals for totals, averages and category extremes', () => {
    const report = calculateSpendingReport({
      throughDate: '2026-08-26',
      interval: 'week',
      intervalCount: 4,
      accounts,
      categories,
      groups,
      transactions: [
        expense('food-1', 10_000, '2026-08-03', 'food'),
        expense('food-2', 30_000, '2026-08-18', 'food'),
        expense('food-3', 20_000, '2026-08-25', 'food'),
        expense('future', 80_000, '2026-08-29', 'food'),
        expense('transport-1', 20_000, '2026-08-11', 'transport'),
        expense('transport-2', 10_000, '2026-08-25', 'transport'),
        expense('ignored-tracking', 99_000, '2026-08-25', 'food', 'tracking'),
      ],
    });

    expect(report.total).toEqual(Money.fromCents(90_000));
    expect(report.average).toEqual(Money.fromCents(22_500));
    expect(report.intervals.map(({ spending }) => spending.cents)).toEqual([
      10_000, 20_000, 30_000, 30_000,
    ]);
    expect(report.intervals[3]?.categories).toEqual([
      {
        categoryId: 'food',
        spending: Money.fromCents(20_000),
        percentageOfInterval: 2 / 3,
      },
      {
        categoryId: 'transport',
        spending: Money.fromCents(10_000),
        percentageOfInterval: 1 / 3,
      },
    ]);
    expect(report.categories[0]).toMatchObject({
      categoryId: 'food',
      total: Money.fromCents(60_000),
      average: Money.fromCents(15_000),
      spendingByInterval: [
        Money.fromCents(10_000),
        Money.zero(),
        Money.fromCents(30_000),
        Money.fromCents(20_000),
      ],
      percentageOfTotal: 2 / 3,
      lowestInterval: {
        startDate: '2026-08-10',
        endDate: '2026-08-16',
        spending: Money.zero(),
      },
      highestInterval: {
        startDate: '2026-08-17',
        endDate: '2026-08-23',
        spending: Money.fromCents(30_000),
      },
    });
    expect(report.categories[1]).toMatchObject({
      categoryId: 'transport',
      total: Money.fromCents(30_000),
      average: Money.fromCents(7_500),
      percentageOfTotal: 1 / 3,
    });
  });

  it('includes both boundaries and nets category refunds', () => {
    const refund = createTransaction({
      id: 'refund',
      accountId: 'cash',
      categoryId: 'food',
      amount: Money.fromCents(2_000),
      date: '2026-08-09',
      status: 'cleared',
      kind: 'standard',
      createdAt: '2026-08-09T00:00:00.000Z',
      updatedAt: '2026-08-09T00:00:00.000Z',
    });
    const report = calculateSpendingReport({
      throughDate: '2026-08-09',
      interval: 'week',
      intervalCount: 1,
      accounts,
      categories,
      groups,
      transactions: [
        expense('monday', 5_000, '2026-08-03', 'food'),
        expense('sunday', 5_000, '2026-08-09', 'food'),
        refund,
      ],
    });

    expect(report.total).toEqual(Money.fromCents(8_000));
    expect(report.intervals[0]?.spending).toEqual(Money.fromCents(8_000));
  });
});
