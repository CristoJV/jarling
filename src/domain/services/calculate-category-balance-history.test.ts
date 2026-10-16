import type { BudgetAllocationMovement } from '@/domain/entities/budget-allocation-movement';
import { Money } from '@/domain/value-objects/money';

import {
  calculateCategoryBalanceHistory,
  daysInBudgetMonth,
} from './calculate-category-balance-history';

function movement(
  id: string,
  amountCents: number,
  occurredOn?: string,
  direction: 'in' | 'out' = 'in',
): BudgetAllocationMovement {
  return {
    id,
    month: '2026-08',
    amount: Money.fromCents(amountCents),
    ...(direction === 'in'
      ? { destinationCategoryId: 'category-1' }
      : { sourceCategoryId: 'category-1' }),
    ...(occurredOn
      ? { occurredOn, occurredAt: `${occurredOn}T12:00:00.000Z` }
      : {}),
    provenance: occurredOn ? 'recorded' : 'migration_baseline',
    recordedAt: '2026-08-18T12:00:00.000Z',
  };
}

describe('category balance history', () => {
  it('starts with rollover and applies assignment before same-day Activity', () => {
    const result = calculateCategoryBalanceHistory({
      categoryId: 'category-1',
      month: '2026-08',
      today: '2026-09-01',
      openingAvailable: Money.fromCents(2_000),
      movements: [movement('assignment', 10_000, '2026-08-10')],
      activity: [
        { date: '2026-08-10', amount: Money.fromCents(-3_000) },
        { date: '2026-08-10', amount: Money.fromCents(-2_000) },
      ],
    });

    expect(result).toEqual([
      {
        day: 0,
        position: 0,
        amount: Money.fromCents(2_000),
        kind: 'opening',
        retroactive: false,
      },
      {
        day: 9,
        position: 9,
        amount: Money.fromCents(2_000),
        kind: 'closing',
        retroactive: false,
      },
      {
        day: 10,
        position: 9.65,
        amount: Money.fromCents(12_000),
        kind: 'assignment',
        retroactive: false,
      },
      {
        day: 10,
        position: 10,
        amount: Money.fromCents(7_000),
        kind: 'activity',
        retroactive: false,
      },
      {
        day: 31,
        position: 31,
        amount: Money.fromCents(7_000),
        kind: 'closing',
        retroactive: false,
      },
    ]);
  });

  it('places early baselines on day one and late corrections on the last day', () => {
    const result = calculateCategoryBalanceHistory({
      categoryId: 'category-1',
      month: '2026-08',
      today: '2026-09-01',
      openingAvailable: Money.zero(),
      movements: [
        movement('early', 4_000, '2026-07-20'),
        movement('late', 1_000, '2026-09-02', 'out'),
      ],
      activity: [],
    });

    expect(
      result.map(({ day, amount, retroactive }) => ({
        day,
        amount,
        retroactive,
      })),
    ).toEqual([
      { day: 0, amount: Money.zero(), retroactive: false },
      { day: 1, amount: Money.fromCents(4_000), retroactive: false },
      { day: 30, amount: Money.fromCents(4_000), retroactive: false },
      { day: 31, amount: Money.fromCents(3_000), retroactive: true },
    ]);
  });

  it('handles leap years and an empty flat month', () => {
    expect(daysInBudgetMonth('2024-02')).toBe(29);
    expect(daysInBudgetMonth('2100-02')).toBe(28);
    expect(
      calculateCategoryBalanceHistory({
        categoryId: 'category-1',
        month: '2024-02',
        today: '2024-03-01',
        openingAvailable: Money.fromCents(1_000),
        movements: [],
        activity: [],
      }),
    ).toEqual([
      {
        day: 0,
        position: 0,
        amount: Money.fromCents(1_000),
        kind: 'opening',
        retroactive: false,
      },
      {
        day: 29,
        position: 29,
        amount: Money.fromCents(1_000),
        kind: 'closing',
        retroactive: false,
      },
    ]);
  });

  it('stops the current month on today and excludes later dated activity', () => {
    const result = calculateCategoryBalanceHistory({
      categoryId: 'category-1',
      month: '2026-08',
      today: '2026-08-18',
      openingAvailable: Money.fromCents(1_000),
      movements: [
        movement('included', 2_000, '2026-08-10'),
        movement('future', 8_000, '2026-08-20'),
      ],
      activity: [
        { date: '2026-08-11', amount: Money.fromCents(-500) },
        { date: '2026-08-19', amount: Money.fromCents(-700) },
      ],
    });

    expect(result.at(-1)).toEqual({
      day: 18,
      position: 18,
      amount: Money.fromCents(2_500),
      kind: 'closing',
      retroactive: false,
    });
    expect(result.some(({ day }) => day > 18)).toBe(false);
  });
});
