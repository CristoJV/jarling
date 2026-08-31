import type { CategoryTarget } from '@/domain/entities/category-target';
import { assertValidBudgetMonth } from '@/domain/entities/budget-allocation';
import { InvalidCategoryTargetError } from '@/domain/errors/invalid-category-target-error';
import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import { isValidIsoDate } from '@/domain/value-objects/iso-date';
import { Money } from '@/domain/value-objects/money';

export type TargetProgressStatus =
  'underfunded' | 'on_track' | 'complete' | 'overdue';

/**
 * Target progress deliberately separates the monthly recommendation from the
 * lifetime goal. Targets guide a monthly budget; they never create weekly or
 * yearly budget periods of their own.
 */
export type TargetProgress = Readonly<{
  totalTarget: Money;
  monthlyTarget: Money;
  fundedTowardTotal: Money;
  fundedThisMonth: Money;
  eligibleRollover: Money;
  recommended: Money;
  monthlyProgress: number;
  totalProgress: number;
  status: TargetProgressStatus;
  occurrenceCount?: number;
}>;

export type CalculateTargetProgressInput = Readonly<{
  target: CategoryTarget;
  assigned: Money;
  availableFromPreviousMonth?: Money;
  available: Money;
  spent: Money;
  assignedSinceTargetStarted?: Money;
  spentSinceTargetStarted?: Money;
  month: string;
  today: string;
}>;

const ZERO = Money.zero();

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day));
}

function monthDate(month: string): Date {
  return parseDate(`${month}-01`);
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function clampDay(year: number, monthIndex: number, day: number): number {
  return Math.min(day, daysInMonth(year, monthIndex));
}

function addMonths(date: Date, amount: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1),
  );
}

function monthsInclusive(from: Date, to: Date): number {
  return Math.max(
    1,
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
      to.getUTCMonth() -
      from.getUTCMonth() +
      1,
  );
}

function ceilDivide(dividend: number, divisor: number): number {
  return Math.ceil(dividend / Math.max(1, divisor));
}

function clampProgress(funded: number, goal: number): number {
  if (goal <= 0) return 1;
  return Math.max(0, Math.min(1, funded / goal));
}

function weeklyOccurrences(target: CategoryTarget, month: string): number {
  if (target.kind !== 'weekly' || target.dayOfWeek === undefined) return 0;
  const date = monthDate(month);
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const startMonth = target.startsOn.slice(0, 7);
  const minimumDay =
    month === startMonth && !target.includePreviousWeeks
      ? Number(target.startsOn.slice(8, 10))
      : 1;
  let count = 0;

  for (let day = minimumDay; day <= daysInMonth(year, monthIndex); day += 1) {
    const isoDay =
      ((new Date(Date.UTC(year, monthIndex, day)).getUTCDay() + 6) % 7) + 1;
    if (isoDay === target.dayOfWeek) count += 1;
  }
  return count;
}

function yearlyDueDate(target: CategoryTarget, month: string): Date {
  const budgetMonth = monthDate(month);
  const original = parseDate(target.targetDate!);
  let year = budgetMonth.getUTCFullYear();
  let due = new Date(
    Date.UTC(
      year,
      original.getUTCMonth(),
      clampDay(year, original.getUTCMonth(), original.getUTCDate()),
    ),
  );
  if (monthKey(due) < month) {
    year += 1;
    due = new Date(
      Date.UTC(
        year,
        original.getUTCMonth(),
        clampDay(year, original.getUTCMonth(), original.getUTCDate()),
      ),
    );
  }
  return due;
}

function datedDueDate(target: CategoryTarget, month: string): Date | undefined {
  if (target.kind === 'yearly') return yearlyDueDate(target, month);
  if (target.kind === 'custom' && target.targetDate) {
    return parseDate(target.targetDate);
  }
  return undefined;
}

function monthlyDueDate(
  target: CategoryTarget,
  month: string,
): Date | undefined {
  if (target.kind !== 'monthly' || target.dayOfMonth === undefined)
    return undefined;
  const date = monthDate(month);
  const day =
    target.dayOfMonth === 0
      ? daysInMonth(date.getUTCFullYear(), date.getUTCMonth())
      : clampDay(date.getUTCFullYear(), date.getUTCMonth(), target.dayOfMonth);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), day));
}

function completeProgress(occurrenceCount?: number): TargetProgress {
  return {
    totalTarget: ZERO,
    monthlyTarget: ZERO,
    fundedTowardTotal: ZERO,
    fundedThisMonth: ZERO,
    eligibleRollover: ZERO,
    recommended: ZERO,
    monthlyProgress: 1,
    totalProgress: 1,
    status: 'complete',
    ...(occurrenceCount === undefined ? {} : { occurrenceCount }),
  };
}

function result(input: {
  totalTargetCents: number;
  monthlyTargetCents: number;
  fundedTowardTotalCents: number;
  fundedThisMonthCents: number;
  eligibleRolloverCents: number;
  recommendedCents: number;
  status: TargetProgressStatus;
  occurrenceCount?: number;
}): TargetProgress {
  const totalTarget = Money.fromCents(Math.max(0, input.totalTargetCents));
  const monthlyTarget = Money.fromCents(Math.max(0, input.monthlyTargetCents));
  const fundedTowardTotal = Money.fromCents(
    Math.max(0, input.fundedTowardTotalCents),
  );
  const fundedThisMonth = Money.fromCents(
    Math.max(0, input.fundedThisMonthCents),
  );
  const monthlyProgress = clampProgress(
    fundedThisMonth.cents,
    monthlyTarget.cents,
  );
  const totalProgress = clampProgress(
    fundedTowardTotal.cents,
    totalTarget.cents,
  );
  return {
    totalTarget,
    monthlyTarget,
    fundedTowardTotal,
    fundedThisMonth,
    eligibleRollover: Money.fromCents(Math.max(0, input.eligibleRolloverCents)),
    recommended: Money.fromCents(Math.max(0, input.recommendedCents)),
    monthlyProgress,
    totalProgress,
    status: input.status,
    ...(input.occurrenceCount === undefined
      ? {}
      : { occurrenceCount: input.occurrenceCount }),
  };
}

function previousMonthAvailable(input: CalculateTargetProgressInput): number {
  if (input.availableFromPreviousMonth) {
    return Math.max(0, input.availableFromPreviousMonth.cents);
  }
  // available = previous available + assigned - spending. This fallback keeps
  // the pure calculator convenient while production callers pass it directly.
  return Math.max(
    0,
    input.available.cents + input.spent.cents - input.assigned.cents,
  );
}

function recurringProgress(
  input: CalculateTargetProgressInput,
  monthlyTargetCents: number,
  occurrenceCount?: number,
): TargetProgress {
  const { target } = input;
  const isBalance =
    target.kind === 'custom' && target.customFundingMode === 'balance';
  const isRefill =
    target.fundingMode === 'refill_up_to' ||
    (target.kind === 'custom' && target.customFundingMode === 'fill_up_to');
  const eligibleRolloverCents = isRefill ? previousMonthAvailable(input) : 0;
  const fundedThisMonthCents = isBalance
    ? Math.max(0, input.available.cents)
    : Math.max(0, input.assigned.cents + eligibleRolloverCents);
  const recommendedCents = Math.max(
    0,
    monthlyTargetCents - fundedThisMonthCents,
  );
  const due = monthlyDueDate(target, input.month);
  const overdue =
    due !== undefined && parseDate(input.today).getTime() > due.getTime();
  const status: TargetProgressStatus =
    fundedThisMonthCents >= monthlyTargetCents
      ? 'complete'
      : overdue
        ? 'overdue'
        : 'underfunded';

  return result({
    totalTargetCents: monthlyTargetCents,
    monthlyTargetCents,
    fundedTowardTotalCents: fundedThisMonthCents,
    fundedThisMonthCents,
    eligibleRolloverCents,
    recommendedCents,
    status,
    occurrenceCount,
  });
}

function datedProgress(
  input: CalculateTargetProgressInput,
  due: Date,
): TargetProgress {
  const isBalance =
    input.target.kind === 'custom' &&
    input.target.customFundingMode === 'balance';
  const isRefill =
    input.target.fundingMode === 'refill_up_to' ||
    (input.target.kind === 'custom' &&
      input.target.customFundingMode === 'fill_up_to');
  const assignedToDate =
    input.assignedSinceTargetStarted?.cents ?? input.assigned.cents;
  const spentToDate = input.spentSinceTargetStarted?.cents ?? input.spent.cents;
  const fundedTowardTotalCents = isBalance
    ? Math.max(0, input.available.cents)
    : isRefill
      ? Math.max(0, input.available.cents + spentToDate)
      : Math.max(0, assignedToDate);
  const contributionThisMonth = Math.max(0, input.assigned.cents);
  const fundedBeforeMonth = Math.max(
    0,
    fundedTowardTotalCents - contributionThisMonth,
  );
  const remainingMonths = monthsInclusive(monthDate(input.month), due);
  const monthlyTargetCents = ceilDivide(
    Math.max(0, input.target.amount.cents - fundedBeforeMonth),
    remainingMonths,
  );
  const recommendedCents = Math.max(
    0,
    monthlyTargetCents - contributionThisMonth,
  );
  const complete = fundedTowardTotalCents >= input.target.amount.cents;
  const overdue = parseDate(input.today).getTime() > due.getTime();
  const status: TargetProgressStatus = complete
    ? 'complete'
    : overdue
      ? 'overdue'
      : recommendedCents === 0
        ? 'on_track'
        : 'underfunded';

  return result({
    totalTargetCents: input.target.amount.cents,
    monthlyTargetCents,
    fundedTowardTotalCents,
    fundedThisMonthCents: contributionThisMonth,
    eligibleRolloverCents: isRefill ? previousMonthAvailable(input) : 0,
    recommendedCents,
    status,
  });
}

export function calculateTargetProgress(
  input: CalculateTargetProgressInput,
): TargetProgress {
  assertValidBudgetMonth(input.month);
  if (!isValidIsoDate(input.today)) {
    throw new InvalidCategoryTargetError('today must use YYYY-MM-DD');
  }
  if (input.month < input.target.startsOn.slice(0, 7)) {
    return completeProgress(input.target.kind === 'weekly' ? 0 : undefined);
  }

  if (input.target.kind === 'weekly') {
    const occurrenceCount = weeklyOccurrences(input.target, input.month);
    return recurringProgress(
      input,
      input.target.amount.cents * occurrenceCount,
      occurrenceCount,
    );
  }
  if (input.target.kind === 'monthly') {
    return recurringProgress(input, input.target.amount.cents);
  }

  const due = datedDueDate(input.target, input.month);
  if (due) return datedProgress(input, due);
  return recurringProgress(input, input.target.amount.cents);
}

function recurringYearStart(target: CategoryTarget, month: string): string {
  const due = yearlyDueDate(target, month);
  return monthKey(addMonths(due, -11));
}

export function targetFundingPeriodStartMonth(
  target: CategoryTarget,
  month: string,
): string {
  const startsOnMonth = target.startsOn.slice(0, 7);
  if (target.kind !== 'yearly') return startsOnMonth;
  return [startsOnMonth, recurringYearStart(target, month)].sort().at(-1)!;
}

export function calculateBudgetCategoryTargetProgress(
  input: Readonly<{
    target: CategoryTarget;
    values: BudgetCategoryValues;
    month: string;
    today: string;
  }>,
): TargetProgress {
  const periodStart = targetFundingPeriodStartMonth(input.target, input.month);
  const assignedSinceTargetStarted = Money.fromCents(
    (input.values.assignedHistory ?? [])
      .filter(({ month }) => month >= periodStart && month <= input.month)
      .reduce((total, { amount }) => total + amount.cents, 0),
  );
  const spentSinceTargetStarted = Money.fromCents(
    (input.values.spendingHistory ?? [])
      .filter(({ month }) => month >= periodStart && month <= input.month)
      .reduce((total, { amount }) => total + amount.cents, 0),
  );
  const spent = Money.fromCents(
    input.values.spendingTransactions.reduce(
      (total, amount) => total + amount.cents,
      0,
    ),
  );

  return calculateTargetProgress({
    target: input.target,
    assigned: input.values.assigned,
    availableFromPreviousMonth: input.values.availableFromPreviousMonth,
    available: input.values.available,
    spent,
    assignedSinceTargetStarted,
    spentSinceTargetStarted,
    month: input.month,
    today: input.today,
  });
}
