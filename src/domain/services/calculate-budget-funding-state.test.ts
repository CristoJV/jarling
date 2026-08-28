import { Money } from '@/domain/value-objects/money';

import {
  calculateBudgetFundingState,
  type BudgetFundingMonth,
} from './calculate-budget-funding-state';

const month = (
  value: string,
  balanceCents: number,
  assignedCents = 0,
): BudgetFundingMonth => ({
  month: value,
  balance: Money.fromCents(balanceCents),
  assigned: Money.fromCents(assignedCents),
});

describe('calculateBudgetFundingState', () => {
  it('exposes genuinely unassigned cash when future plans do not consume it', () => {
    expect(
      calculateBudgetFundingState({
        visibleMonth: '2026-08',
        months: [month('2026-08', 100_000), month('2026-09', 40_000, 60_000)],
      }),
    ).toEqual({
      status: 'ready-to-assign',
      readyToAssign: Money.fromCents(40_000),
      assignableNow: Money.fromCents(100_000),
      futureAssignmentsAvailable: Money.fromCents(60_000),
      futureAssignmentsUsed: Money.zero(),
      assignedTooMuch: Money.zero(),
    });
  });

  it('shows future assignments when all existing cash is already committed', () => {
    expect(
      calculateBudgetFundingState({
        visibleMonth: '2026-08',
        months: [month('2026-08', 100_000), month('2026-09', 0, 100_000)],
      }),
    ).toEqual({
      status: 'future-assignments',
      readyToAssign: Money.zero(),
      assignableNow: Money.fromCents(100_000),
      futureAssignmentsAvailable: Money.fromCents(100_000),
      futureAssignmentsUsed: Money.zero(),
      assignedTooMuch: Money.zero(),
    });
  });

  it('tracks partially consumed future assignments and the first real deficit', () => {
    expect(
      calculateBudgetFundingState({
        visibleMonth: '2026-08',
        months: [
          month('2026-08', 80_000, 20_000),
          month('2026-09', 20_000, 60_000),
          month('2026-10', 20_000),
          month('2026-11', -20_000, 40_000),
        ],
      }),
    ).toEqual({
      status: 'future-assignments',
      readyToAssign: Money.zero(),
      assignableNow: Money.fromCents(80_000),
      futureAssignmentsAvailable: Money.fromCents(80_000),
      futureAssignmentsUsed: Money.fromCents(20_000),
      assignedTooMuch: Money.zero(),
      firstDeficitMonth: '2026-11',
    });
  });

  it('supports consuming all future assignments', () => {
    const result = calculateBudgetFundingState({
      visibleMonth: '2026-08',
      months: [
        month('2026-08', 0, 100_000),
        month('2026-09', -100_000, 100_000),
      ],
    });

    expect(result.status).toBe('future-assignments');
    expect(result.futureAssignmentsAvailable).toEqual(Money.zero());
    expect(result.futureAssignmentsUsed).toEqual(Money.fromCents(100_000));
    expect(result.firstDeficitMonth).toBe('2026-09');
  });

  it('shows the visible deficit as a positive Assigned Too Much amount', () => {
    const result = calculateBudgetFundingState({
      visibleMonth: '2026-09',
      months: [month('2026-09', -20_000), month('2026-10', -20_000)],
    });

    expect(result.status).toBe('assigned-too-much');
    expect(result.readyToAssign).toEqual(Money.zero());
    expect(result.assignableNow).toEqual(Money.zero());
    expect(result.assignedTooMuch).toEqual(Money.fromCents(20_000));
  });

  it('reduces and clears a propagated deficit when later funds arrive', () => {
    const reduced = calculateBudgetFundingState({
      visibleMonth: '2026-09',
      months: [month('2026-09', -20_000), month('2026-10', -10_000)],
    });
    const cleared = calculateBudgetFundingState({
      visibleMonth: '2026-10',
      months: [month('2026-10', 0)],
    });

    expect(reduced.assignedTooMuch).toEqual(Money.fromCents(20_000));
    expect(cleared).toEqual({
      status: 'ready-to-assign',
      readyToAssign: Money.zero(),
      assignableNow: Money.zero(),
      futureAssignmentsAvailable: Money.zero(),
      futureAssignmentsUsed: Money.zero(),
      assignedTooMuch: Money.zero(),
    });
  });

  it('ignores future transactions when there are no future assignments', () => {
    const result = calculateBudgetFundingState({
      visibleMonth: '2026-08',
      months: [month('2026-08', 100_000), month('2026-09', 90_000)],
    });

    expect(result.status).toBe('ready-to-assign');
    expect(result.readyToAssign).toEqual(Money.fromCents(100_000));
    expect(result.futureAssignmentsAvailable).toEqual(Money.zero());
  });

  it('is independent of input order', () => {
    const result = calculateBudgetFundingState({
      visibleMonth: '2026-08',
      months: [month('2026-10', -10_000, 50_000), month('2026-08', 40_000)],
    });

    expect(result.firstDeficitMonth).toBe('2026-10');
  });

  it('rejects a timeline without the visible month', () => {
    expect(() =>
      calculateBudgetFundingState({
        visibleMonth: '2026-08',
        months: [month('2026-09', 0)],
      }),
    ).toThrow('Missing funding balance for 2026-08.');
  });
});
