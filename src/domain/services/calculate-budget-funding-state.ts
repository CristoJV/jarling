import { Money } from '@/domain/value-objects/money';

export type BudgetFundingStatus =
  'ready-to-assign' | 'future-assignments' | 'assigned-too-much';

export type BudgetFundingMonth = Readonly<{
  month: string;
  balance: Money;
  assigned: Money;
}>;

export type BudgetFundingState = Readonly<{
  status: BudgetFundingStatus;
  readyToAssign: Money;
  assignableNow: Money;
  futureAssignmentsAvailable: Money;
  futureAssignmentsUsed: Money;
  assignedTooMuch: Money;
  firstDeficitMonth?: string;
}>;

type Input = Readonly<{
  visibleMonth: string;
  months: readonly BudgetFundingMonth[];
}>;

/**
 * Separates cash that is genuinely unassigned from cash already committed in
 * later budget months. Monthly balances are the ordinary chronological
 * Ready-to-Assign balances before future commitments are reserved.
 */
export function calculateBudgetFundingState(input: Input): BudgetFundingState {
  const months = [...input.months].sort((left, right) =>
    left.month.localeCompare(right.month),
  );
  const current = months.find(({ month }) => month === input.visibleMonth);
  if (!current) {
    throw new Error(`Missing funding balance for ${input.visibleMonth}.`);
  }

  const future = months.filter(({ month }) => month > input.visibleMonth);
  const futureAssignedCents = Math.max(
    0,
    future.reduce((sum, entry) => sum + entry.assigned.cents, 0),
  );
  const firstDeficit = future.find(({ balance }) => balance.cents < 0);
  const largestFutureDeficitCents = future.reduce(
    (largest, entry) => Math.max(largest, Math.max(0, -entry.balance.cents)),
    0,
  );
  const currentBalanceCents = current.balance.cents;
  const readyToAssignCents = Math.max(
    0,
    currentBalanceCents - futureAssignedCents,
  );
  const assignedTooMuchCents = Math.max(0, -currentBalanceCents);
  const futureAssignmentsUsedCents = Math.min(
    futureAssignedCents,
    largestFutureDeficitCents,
  );
  const futureAssignmentsAvailableCents = Math.min(
    Math.max(0, currentBalanceCents - readyToAssignCents),
    Math.max(0, futureAssignedCents - futureAssignmentsUsedCents),
  );

  const status: BudgetFundingStatus =
    assignedTooMuchCents > 0
      ? 'assigned-too-much'
      : readyToAssignCents > 0
        ? 'ready-to-assign'
        : futureAssignedCents > 0
          ? 'future-assignments'
          : 'ready-to-assign';

  return {
    status,
    readyToAssign: Money.fromCents(readyToAssignCents),
    assignableNow: Money.fromCents(Math.max(0, currentBalanceCents)),
    futureAssignmentsAvailable: Money.fromCents(
      futureAssignmentsAvailableCents,
    ),
    futureAssignmentsUsed: Money.fromCents(futureAssignmentsUsedCents),
    assignedTooMuch: Money.fromCents(assignedTooMuchCents),
    ...(firstDeficit ? { firstDeficitMonth: firstDeficit.month } : {}),
  };
}
