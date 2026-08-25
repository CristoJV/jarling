import type { CategoryTarget } from '@/domain/entities/category-target';
import { Money } from '@/domain/value-objects/money';

import { calculateTargetProgress } from './calculate-target-progress';

const base = {
  id: 'target-1',
  categoryId: 'category-1',
  amount: Money.fromCents(30_000),
  startsOn: '2026-07-01',
  createdAt: '2026-07-01T10:00:00.000Z',
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
    spent: Money.zero(),
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

    expect(calculate(target, 10_000)).toEqual(
      expect.objectContaining({
        monthlyTarget: Money.fromCents(30_000),
        fundedThisMonth: Money.fromCents(10_000),
        recommended: Money.fromCents(20_000),
        monthlyProgress: 1 / 3,
        status: 'underfunded',
      }),
    );
  });

  it('keeps a refill target funded after spending from it', () => {
    const target: CategoryTarget = {
      ...base,
      kind: 'monthly',
      dayOfMonth: 0,
      fundingMode: 'refill_up_to',
    };

    const result = calculateTargetProgress({
      target,
      assigned: Money.fromCents(30_000),
      available: Money.fromCents(10_000),
      spent: Money.fromCents(20_000),
      month: '2026-08',
      today: '2026-08-18',
    });

    expect(result).toEqual(
      expect.objectContaining({
        fundedThisMonth: Money.fromCents(30_000),
        recommended: Money.zero(),
        status: 'complete',
      }),
    );
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
    expect(calculate(target, 0).monthlyTarget).toEqual(Money.fromCents(50_000));
  });

  it('counts only pending weekly occurrences in the creation month by default', () => {
    const target: CategoryTarget = {
      ...base,
      startsOn: '2026-08-18',
      kind: 'weekly',
      amount: Money.fromCents(10_000),
      dayOfWeek: 5,
      includePreviousWeeks: false,
      fundingMode: 'set_aside',
    };

    expect(calculate(target, 0)).toEqual(
      expect.objectContaining({
        monthlyTarget: Money.fromCents(20_000),
        occurrenceCount: 2,
      }),
    );
    expect(calculate(target, 0, 0, '2026-09')).toEqual(
      expect.objectContaining({
        monthlyTarget: Money.fromCents(40_000),
        occurrenceCount: 4,
      }),
    );
  });

  it('can include earlier weekly occurrences in the creation month', () => {
    const target: CategoryTarget = {
      ...base,
      startsOn: '2026-08-18',
      kind: 'weekly',
      amount: Money.fromCents(10_000),
      dayOfWeek: 5,
      includePreviousWeeks: true,
      fundingMode: 'set_aside',
    };

    expect(calculate(target, 0)).toEqual(
      expect.objectContaining({
        monthlyTarget: Money.fromCents(40_000),
        occurrenceCount: 4,
      }),
    );
  });

  it('applies rollover monthly only to refill-up-to targets', () => {
    const common: CategoryTarget = {
      ...base,
      kind: 'weekly',
      amount: Money.fromCents(10_000),
      dayOfWeek: 5,
      includePreviousWeeks: false,
      fundingMode: 'set_aside',
    };
    const input = {
      assigned: Money.zero(),
      availableFromPreviousMonth: Money.fromCents(7_000),
      available: Money.fromCents(7_000),
      spent: Money.zero(),
      month: '2026-08',
      today: '2026-08-18',
    } as const;

    expect(
      calculateTargetProgress({ target: common, ...input }).recommended,
    ).toEqual(Money.fromCents(40_000));
    expect(
      calculateTargetProgress({
        target: { ...common, fundingMode: 'refill_up_to' },
        ...input,
      }).recommended,
    ).toEqual(Money.fromCents(33_000));
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
    expect(
      calculateTargetProgress({
        target,
        assigned: Money.zero(),
        assignedSinceTargetStarted: Money.fromCents(10_000),
        available: Money.fromCents(10_000),
        spent: Money.zero(),
        month: '2026-11',
        today: '2026-11-18',
      }).recommended,
    ).toEqual(Money.fromCents(3_334));
  });

  it('recalculates a dated target from accumulated progress each month', () => {
    const target: CategoryTarget = {
      ...base,
      startsOn: '2026-08-01',
      kind: 'yearly',
      amount: Money.fromCents(100_000),
      targetDate: '2026-09-30',
      fundingMode: 'set_aside',
    };
    const august = calculateTargetProgress({
      target,
      assigned: Money.zero(),
      assignedSinceTargetStarted: Money.zero(),
      available: Money.zero(),
      spent: Money.zero(),
      month: '2026-08',
      today: '2026-08-18',
    });
    const september = calculateTargetProgress({
      target,
      assigned: Money.zero(),
      assignedSinceTargetStarted: Money.fromCents(40_000),
      available: Money.fromCents(40_000),
      spent: Money.zero(),
      month: '2026-09',
      today: '2026-09-01',
    });

    expect(august.monthlyTarget).toEqual(Money.fromCents(50_000));
    expect(september.monthlyTarget).toEqual(Money.fromCents(60_000));
    expect(september.recommended).toEqual(Money.fromCents(60_000));
  });

  it('honors yearly set-aside and refill strategies', () => {
    const common: CategoryTarget = {
      ...base,
      kind: 'yearly',
      amount: Money.fromCents(100_000),
      targetDate: '2026-09-30',
      fundingMode: 'set_aside',
    };
    const setAside = calculateTargetProgress({
      target: common,
      assigned: Money.fromCents(10_000),
      assignedSinceTargetStarted: Money.fromCents(40_000),
      available: Money.fromCents(20_000),
      spent: Money.fromCents(5_000),
      spentSinceTargetStarted: Money.fromCents(15_000),
      month: '2026-08',
      today: '2026-08-18',
    });
    const refill = calculateTargetProgress({
      target: { ...common, fundingMode: 'refill_up_to' },
      assigned: Money.fromCents(10_000),
      assignedSinceTargetStarted: Money.fromCents(40_000),
      available: Money.fromCents(20_000),
      spent: Money.fromCents(5_000),
      spentSinceTargetStarted: Money.fromCents(15_000),
      month: '2026-08',
      today: '2026-08-18',
    });

    expect(setAside.fundedTowardTotal).toEqual(Money.fromCents(40_000));
    expect(refill.fundedTowardTotal).toEqual(Money.fromCents(35_000));
  });

  it('clamps a leap-day yearly target in non-leap years', () => {
    const target: CategoryTarget = {
      ...base,
      kind: 'yearly',
      amount: Money.fromCents(10_000),
      targetDate: '2028-02-29',
      fundingMode: 'set_aside',
    };
    expect(
      calculateTargetProgress({
        target,
        assigned: Money.zero(),
        available: Money.zero(),
        spent: Money.zero(),
        month: '2027-02',
        today: '2027-03-01',
      }).status,
    ).toBe('overdue');
  });

  it('does not ask for funding before a target exists', () => {
    const target: CategoryTarget = {
      ...base,
      createdAt: '2026-08-18T10:00:00.000Z',
      startsOn: '2026-08-18',
      kind: 'monthly',
      dayOfMonth: 0,
      fundingMode: 'set_aside',
    };

    expect(calculate(target, 0, 0, '2026-07')).toEqual(
      expect.objectContaining({
        monthlyTarget: Money.zero(),
        fundedThisMonth: Money.zero(),
        recommended: Money.zero(),
        monthlyProgress: 1,
        status: 'complete',
      }),
    );
  });

  it('adapts a dated custom goal across its remaining months', () => {
    const target: CategoryTarget = {
      ...base,
      kind: 'custom',
      amount: Money.fromCents(100_000),
      customFundingMode: 'set_aside',
      targetDate: '2026-09-30',
    };

    expect(calculate(target, 40_000, 40_000).recommended).toEqual(
      Money.fromCents(10_000),
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

  it('keeps a custom fill-up goal on track after earlier spending', () => {
    const target: CategoryTarget = {
      ...base,
      kind: 'custom',
      customFundingMode: 'fill_up_to',
      targetDate: '2026-09-30',
    };
    const result = calculateTargetProgress({
      target,
      assigned: Money.zero(),
      assignedSinceTargetStarted: Money.fromCents(50_000),
      available: Money.fromCents(30_000),
      spent: Money.zero(),
      spentSinceTargetStarted: Money.fromCents(20_000),
      month: '2026-08',
      today: '2026-08-18',
    });

    expect(result.fundedTowardTotal).toEqual(Money.fromCents(50_000));
    expect(result.recommended).toEqual(Money.zero());
  });

  it('marks a missed monthly deadline overdue and clamps progress', () => {
    const target: CategoryTarget = {
      ...base,
      kind: 'monthly',
      dayOfMonth: 1,
      fundingMode: 'refill_up_to',
    };
    expect(calculate(target, -2_000)).toEqual(
      expect.objectContaining({ status: 'overdue', monthlyProgress: 0 }),
    );
    expect(calculate(target, 40_000)).toEqual(
      expect.objectContaining({ status: 'complete', monthlyProgress: 1 }),
    );
  });
});
