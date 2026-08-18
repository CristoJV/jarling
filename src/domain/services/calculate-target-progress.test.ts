import type { CategoryTarget } from '@/domain/entities/category-target';
import { Money } from '@/domain/value-objects/money';

import { calculateTargetProgress } from './calculate-target-progress';

const base = {
  id: 'target-1',
  categoryId: 'category-1',
  amount: Money.fromCents(30_000),
  createdAt: '2026-08-18T10:00:00.000Z',
  updatedAt: '2026-08-18T10:00:00.000Z',
} as const;

function calculate(
  target: CategoryTarget,
  availableCents: number,
  assignedCents = 0,
  month = '2026-08',
) {
  return calculateTargetProgress({
    target,
    assigned: Money.fromCents(assignedCents),
    available: Money.fromCents(availableCents),
    month,
    today: '2026-08-18',
  });
}

describe('calculateTargetProgress', () => {
  it('refills a monthly target from Available', () => {
    const target: CategoryTarget = {
      ...base,
      kind: 'monthly',
      dayOfMonth: 0,
      fundingMode: 'refill_up_to',
    };

    expect(calculate(target, 10_000)).toEqual({
      goal: Money.fromCents(30_000),
      funded: Money.fromCents(10_000),
      recommended: Money.fromCents(20_000),
      progress: 1 / 3,
      status: 'underfunded',
    });
  });

  it('sets aside a monthly target from Assigned', () => {
    const target: CategoryTarget = {
      ...base,
      kind: 'monthly',
      dayOfMonth: 0,
      fundingMode: 'set_aside',
    };

    expect(calculate(target, 25_000, 5_000).recommended).toEqual(
      Money.fromCents(25_000),
    );
  });

  it('distinguishes weekly set-aside from refill-up-to', () => {
    const common = {
      ...base,
      kind: 'weekly' as const,
      amount: Money.fromCents(10_000),
      dayOfWeek: 5 as const,
    };
    const setAside: CategoryTarget = {
      ...common,
      fundingMode: 'set_aside',
    };
    const refill: CategoryTarget = {
      ...common,
      fundingMode: 'refill_up_to',
    };

    expect(calculate(setAside, 30_000, 10_000).recommended).toEqual(
      Money.fromCents(30_000),
    );
    expect(calculate(refill, 30_000, 10_000).recommended).toEqual(
      Money.fromCents(10_000),
    );
  });

  it('counts five selected weekdays when present', () => {
    const target: CategoryTarget = {
      ...base,
      kind: 'weekly',
      amount: Money.fromCents(10_000),
      dayOfWeek: 1,
      fundingMode: 'refill_up_to',
    };
    expect(calculate(target, 0).goal).toEqual(Money.fromCents(50_000));
  });

  it('splits a yearly target across months until its recurring date', () => {
    const target: CategoryTarget = {
      ...base,
      kind: 'yearly',
      amount: Money.fromCents(50_000),
      targetDate: '2026-10-31',
      fundingMode: 'set_aside',
    };

    expect(calculate(target, 10_000, 10_000).recommended).toEqual(
      Money.fromCents(6_667),
    );
    expect(calculate(target, 10_000, 0, '2026-11').recommended).toEqual(
      Money.fromCents(3_334),
    );
  });

  it('reports only the missing contribution for the current month', () => {
    const target: CategoryTarget = {
      ...base,
      kind: 'yearly',
      amount: Money.fromCents(100_000),
      targetDate: '2026-09-30',
      fundingMode: 'set_aside',
    };

    expect(calculate(target, 40_000, 40_000).recommended).toEqual(
      Money.fromCents(10_000),
    );
  });

  it('uses Assigned for custom set-aside and Available for balance modes', () => {
    const setAside: CategoryTarget = {
      ...base,
      kind: 'custom',
      customFundingMode: 'set_aside',
    };
    const balance: CategoryTarget = {
      ...base,
      kind: 'custom',
      customFundingMode: 'balance',
    };

    expect(calculate(setAside, 25_000, 5_000).recommended).toEqual(
      Money.fromCents(25_000),
    );
    expect(calculate(balance, 25_000, 5_000).recommended).toEqual(
      Money.fromCents(5_000),
    );
  });

  it('marks a missed monthly deadline overdue and clamps progress', () => {
    const target: CategoryTarget = {
      ...base,
      kind: 'monthly',
      dayOfMonth: 1,
      fundingMode: 'refill_up_to',
    };
    expect(calculate(target, -2_000)).toEqual(
      expect.objectContaining({ status: 'overdue', progress: 0 }),
    );
    expect(calculate(target, 40_000)).toEqual(
      expect.objectContaining({ status: 'complete', progress: 1 }),
    );
  });
});
