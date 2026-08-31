import type {
  CategoryTarget,
  TargetKind,
} from '@/domain/entities/category-target';
import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import { Money } from '@/domain/value-objects/money';

import {
  calculateCategoryFundingState,
  calculateCategoryFundingStateForAssignedDraft,
} from './calculate-category-funding-state';

const instant = '2026-08-01T00:00:00.000Z';

function values(
  assignedCents: number,
  availableCents = assignedCents,
): BudgetCategoryValues {
  return {
    category: {
      id: 'category-1',
      groupId: 'group-1',
      name: 'Travel',
      hidden: false,
      sortOrder: 0,
      createdAt: instant,
      updatedAt: instant,
    },
    availableFromPreviousMonth: Money.zero(),
    assigned: Money.fromCents(assignedCents),
    activity: Money.fromCents(availableCents - assignedCents),
    available: Money.fromCents(availableCents),
    spendingTransactions:
      availableCents < assignedCents
        ? [Money.fromCents(assignedCents - availableCents)]
        : [],
  };
}

function target(kind: TargetKind): CategoryTarget {
  const base = {
    id: `target-${kind}`,
    categoryId: 'category-1',
    kind,
    amount: Money.fromCents(10_000),
    startsOn: '2026-08-01',
    createdAt: instant,
    updatedAt: instant,
  } as const;
  switch (kind) {
    case 'weekly':
      return {
        ...base,
        kind,
        dayOfWeek: 5,
        includePreviousWeeks: true,
        fundingMode: 'set_aside',
      };
    case 'monthly':
      return { ...base, kind, dayOfMonth: 31, fundingMode: 'set_aside' };
    case 'yearly':
      return {
        ...base,
        kind,
        targetDate: '2026-12-31',
        fundingMode: 'set_aside',
      };
    case 'custom':
      return { ...base, kind, customFundingMode: 'set_aside' };
  }
}

function calculate(
  categoryValues: BudgetCategoryValues,
  options: Readonly<{
    target?: CategoryTarget;
    targetSnoozed?: boolean;
  }> = {},
) {
  return calculateCategoryFundingState({
    values: categoryValues,
    ...options,
    month: '2026-08',
    today: '2026-08-20',
  });
}

describe('calculateCategoryFundingState', () => {
  it('returns no smart action without a target or overspending', () => {
    const state = calculate(values(0));
    expect(state.requiredAssignment).toEqual(Money.zero());
    expect(state.assignmentReason).toBeNull();
    expect(state.canToggleSnooze).toBe(false);
  });

  it('covers overspending when there is no target', () => {
    const state = calculate(values(5_000, -2_000));
    expect(state.requiredAssignment).toEqual(Money.fromCents(2_000));
    expect(state.assignmentReason).toBe('overspending');
    expect(state.fundingStatus).toBe('overspent');
  });

  it('chooses the larger target shortfall and breaks ties in favor of overspending', () => {
    const monthly = target('monthly');
    expect(
      calculate(values(0, -2_000), { target: monthly }).assignmentReason,
    ).toBe('target');

    const tie = calculate(values(0, -10_000), { target: monthly });
    expect(tie.requiredAssignment).toEqual(Money.fromCents(10_000));
    expect(tie.assignmentReason).toBe('overspending');
  });

  it('uses a category inflow to reduce overspending without changing target Assigned', () => {
    const monthly = target('monthly');
    const beforeRefund = calculate(values(5_000, -5_000), {
      target: monthly,
    });
    const afterPartialRefund = calculate(values(5_000, -2_000), {
      target: monthly,
    });
    const afterFullRefund = calculate(values(5_000, 1_000), {
      target: monthly,
    });

    expect(beforeRefund.requiredForOverspending).toEqual(
      Money.fromCents(5_000),
    );
    expect(afterPartialRefund.requiredForOverspending).toEqual(
      Money.fromCents(2_000),
    );
    expect(afterFullRefund.requiredForOverspending).toEqual(Money.zero());
    expect(afterFullRefund.targetProgress?.fundedThisMonth).toEqual(
      Money.fromCents(5_000),
    );
  });

  it('lets a balance target observe real Available returned by an inflow', () => {
    const balanceTarget: CategoryTarget = {
      ...target('custom'),
      customFundingMode: 'balance',
    };
    const state = calculate(values(0, 10_000), { target: balanceTarget });

    expect(state.targetProgress?.fundedTowardTotal).toEqual(
      Money.fromCents(10_000),
    );
    expect(state.requiredForTarget).toEqual(Money.zero());
  });

  it('reports complete targets as funded and snoozed targets as funded for the month', () => {
    const monthly = target('monthly');
    const complete = calculate(values(10_000), { target: monthly });
    expect(complete.requiredAssignment).toEqual(Money.zero());
    expect(complete.fundingStatus).toBe('funded');

    const snoozed = calculate(values(0), {
      target: monthly,
      targetSnoozed: true,
    });
    expect(snoozed.requiredAssignment).toEqual(Money.zero());
    expect(snoozed.fundingStatus).toBe('funded');
    expect(snoozed.canToggleSnooze).toBe(true);
  });

  it.each(['weekly', 'monthly', 'yearly', 'custom'] as const)(
    'snoozes a %s target only for target funding while retaining overspending',
    (kind) => {
      const state = calculate(values(0, -2_500), {
        target: target(kind),
        targetSnoozed: true,
      });
      expect(state.targetSnoozed).toBe(true);
      expect(state.effectiveTarget).toBeUndefined();
      expect(state.requiredForTarget).toEqual(Money.zero());
      expect(state.requiredAssignment).toEqual(Money.fromCents(2_500));
      expect(state.assignmentReason).toBe('overspending');
    },
  );

  it('does not apply a snooze or target before its start month', () => {
    const future = { ...target('monthly'), startsOn: '2026-09-01' };
    const state = calculate(values(0), {
      target: future,
      targetSnoozed: true,
    });
    expect(state.targetSnoozed).toBe(false);
    expect(state.canToggleSnooze).toBe(false);
    expect(state.requiredAssignment).toEqual(Money.zero());
  });

  it('recalculates a target suggestion from the current assignment draft', () => {
    const monthly = target('monthly');
    const initial = values(4_000);

    const fromInitialDraft = calculateCategoryFundingStateForAssignedDraft({
      values: initial,
      assignedCents: 4_000,
      target: monthly,
      month: '2026-08',
      today: '2026-08-20',
    });
    const fromEditedDraft = calculateCategoryFundingStateForAssignedDraft({
      values: initial,
      assignedCents: 2_000,
      target: monthly,
      month: '2026-08',
      today: '2026-08-20',
    });
    const fromCompletedDraft = calculateCategoryFundingStateForAssignedDraft({
      values: initial,
      assignedCents: 10_000,
      target: monthly,
      month: '2026-08',
      today: '2026-08-20',
    });

    expect(fromInitialDraft.requiredAssignment).toEqual(Money.fromCents(6_000));
    expect(fromEditedDraft.requiredAssignment).toEqual(Money.fromCents(8_000));
    expect(fromCompletedDraft.requiredAssignment).toEqual(Money.zero());
  });

  it('recalculates overspending against the current assignment draft', () => {
    const initial = values(4_000, -2_000);

    const funding = calculateCategoryFundingStateForAssignedDraft({
      values: initial,
      assignedCents: 1_000,
      month: '2026-08',
      today: '2026-08-20',
    });

    expect(funding.requiredForOverspending).toEqual(Money.fromCents(5_000));
    expect(funding.requiredAssignment).toEqual(Money.fromCents(5_000));
  });

  it('replaces this month in assignment history for dated target drafts', () => {
    const dated: CategoryTarget = {
      ...target('custom'),
      amount: Money.fromCents(30_000),
      targetDate: '2026-09-30',
    };
    const initial: BudgetCategoryValues = {
      ...values(4_000),
      assignedHistory: [
        { month: '2026-07', amount: Money.fromCents(10_000) },
        { month: '2026-08', amount: Money.fromCents(4_000) },
      ],
      spendingHistory: [],
    };

    const funding = calculateCategoryFundingStateForAssignedDraft({
      values: initial,
      assignedCents: 15_000,
      target: dated,
      month: '2026-08',
      today: '2026-08-20',
    });

    expect(funding.targetProgress?.fundedThisMonth).toEqual(
      Money.fromCents(15_000),
    );
    expect(funding.requiredAssignment).toEqual(Money.zero());
  });
});
