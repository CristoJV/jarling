import type { CategoryTarget } from '@/domain/entities/category-target';
import { assertValidBudgetMonth } from '@/domain/entities/budget-allocation';
import { InvalidCategoryTargetError } from '@/domain/errors/invalid-category-target-error';
import { Money } from '@/domain/value-objects/money';

export type TargetProgressStatus = 'underfunded' | 'complete' | 'overdue';

export type TargetProgress = Readonly<{
  goal: Money;
  funded: Money;
  recommended: Money;
  progress: number;
  status: TargetProgressStatus;
}>;

type CalculateTargetProgressInput = Readonly<{
  target: CategoryTarget;
  assigned: Money;
  available: Money;
  spent: Money;
  month: string;
  today: string;
}>;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weeklyOccurrences(month: string, dayOfWeek: number): number {
  const [year, monthNumber] = month.split('-').map(Number);
  let count = 0;
  for (let day = 1; day <= daysInMonth(year ?? 0, monthNumber ?? 0); day += 1) {
    const jsDay = new Date(
      Date.UTC(year ?? 0, (monthNumber ?? 1) - 1, day),
    ).getUTCDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    if (isoDay === dayOfWeek) count += 1;
  }
  return count;
}

function inclusiveMonths(from: string, to: string): number {
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);
  return (
    (toYear ?? 0) * 12 +
    (toMonth ?? 0) -
    ((fromYear ?? 0) * 12 + (fromMonth ?? 0)) +
    1
  );
}

function yearlyDueMonth(month: string, targetDate: string): string {
  const year = Number(month.slice(0, 4));
  const monthAndDay = targetDate.slice(5);
  const candidate = `${year}-${monthAndDay}`;
  const dueDate =
    candidate.slice(0, 7) < month ? `${year + 1}-${monthAndDay}` : candidate;
  return dueDate.slice(0, 7);
}

function monthlyDueDate(month: string, dayOfMonth: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const last = daysInMonth(year ?? 0, monthNumber ?? 0);
  const day = dayOfMonth === 0 ? last : Math.min(dayOfMonth, last);
  return `${month}-${String(day).padStart(2, '0')}`;
}

function targetFunding(
  target: CategoryTarget,
  assigned: Money,
  available: Money,
  spent: Money,
): Money {
  const usesAssigned =
    ((target.kind === 'weekly' || target.kind === 'monthly') &&
      target.fundingMode === 'set_aside') ||
    (target.kind === 'custom' && target.customFundingMode === 'set_aside');
  if (usesAssigned) return assigned;

  const spendingCountsTowardFunding =
    ((target.kind === 'weekly' || target.kind === 'monthly') &&
      target.fundingMode === 'refill_up_to') ||
    (target.kind === 'custom' && target.customFundingMode === 'fill_up_to');

  return spendingCountsTowardFunding
    ? Money.fromCents(available.cents + spent.cents)
    : available;
}

export function calculateTargetProgress({
  target,
  assigned,
  available,
  spent,
  month,
  today,
}: CalculateTargetProgressInput): TargetProgress {
  assertValidBudgetMonth(month);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    throw new InvalidCategoryTargetError('today must use YYYY-MM-DD');
  }

  const funded = targetFunding(target, assigned, available, spent);
  let goalCents = target.amount.cents;
  let remainingMonths = 1;
  let overdue = false;

  if (target.kind === 'weekly') {
    goalCents *= weeklyOccurrences(month, target.dayOfWeek ?? 1);
  } else if (target.kind === 'monthly') {
    const dueDate = monthlyDueDate(month, target.dayOfMonth ?? 0);
    overdue =
      month < today.slice(0, 7) ||
      (month === today.slice(0, 7) && today > dueDate);
  } else if (target.kind === 'yearly') {
    const dueMonth = yearlyDueMonth(month, target.targetDate ?? today);
    remainingMonths = Math.max(1, inclusiveMonths(month, dueMonth));
    const dueDay = target.targetDate?.slice(8, 10) ?? '31';
    overdue =
      dueMonth === month &&
      month === today.slice(0, 7) &&
      today > `${dueMonth}-${dueDay}`;
  }

  const remaining = Math.max(0, goalCents - funded.cents);
  const recommendedCents =
    target.kind === 'yearly'
      ? yearlyContributionNeeded({
          goalCents,
          fundedCents: funded.cents,
          assignedCents: assigned.cents,
          remainingMonths,
        })
      : remaining;
  const complete = funded.cents >= goalCents;
  const rawProgress = goalCents === 0 ? 1 : funded.cents / goalCents;

  return {
    goal: Money.fromCents(goalCents),
    funded,
    recommended: Money.fromCents(recommendedCents),
    progress: Math.min(1, Math.max(0, rawProgress)),
    status: complete ? 'complete' : overdue ? 'overdue' : 'underfunded',
  };
}

function yearlyContributionNeeded(
  values: Readonly<{
    goalCents: number;
    fundedCents: number;
    assignedCents: number;
    remainingMonths: number;
  }>,
): number {
  const currentContribution = Math.max(0, values.assignedCents);
  const fundedBeforeMonth = Math.max(
    0,
    values.fundedCents - currentContribution,
  );
  const plannedContribution = Math.ceil(
    Math.max(0, values.goalCents - fundedBeforeMonth) / values.remainingMonths,
  );
  return Math.max(0, plannedContribution - currentContribution);
}
