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
  assignedSinceTargetStarted?: Money;
  spentSinceTargetStarted?: Money;
  month: string;
  today: string;
}>;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weeklyOccurrences(
  month: string,
  dayOfWeek: number,
  notBefore?: string,
): number {
  const [year, monthNumber] = month.split('-').map(Number);
  let count = 0;
  for (let day = 1; day <= daysInMonth(year ?? 0, monthNumber ?? 0); day += 1) {
    const candidate = `${month}-${String(day).padStart(2, '0')}`;
    if (notBefore && candidate < notBefore) continue;
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
  return yearlyDueDate(month, targetDate).slice(0, 7);
}

function yearlyDueDate(month: string, targetDate: string): string {
  const currentYear = Number(month.slice(0, 4));
  const currentMonth = Number(month.slice(5, 7));
  const targetMonth = Number(targetDate.slice(5, 7));
  const targetDay = Number(targetDate.slice(8, 10));
  const dueYear = targetMonth < currentMonth ? currentYear + 1 : currentYear;
  const dueDay = Math.min(targetDay, daysInMonth(dueYear, targetMonth));
  return `${dueYear}-${String(targetMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
}

function addMonths(month: string, amount: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(
    Date.UTC(year ?? 0, (monthNumber ?? 1) - 1 + amount, 1),
  );
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function targetFundingPeriodStartMonth(
  target: CategoryTarget,
  month: string,
): string {
  const createdMonth = target.createdAt.slice(0, 7);
  if (target.kind === 'weekly' || target.kind === 'monthly') return month;
  if (target.kind === 'yearly' && target.targetDate) {
    const dueMonth = yearlyDueMonth(month, target.targetDate);
    const recurringStart = addMonths(dueMonth, -11);
    return recurringStart > createdMonth ? recurringStart : createdMonth;
  }
  return createdMonth;
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
  assignedSinceTargetStarted: Money,
  spentSinceTargetStarted: Money,
): Money {
  const recurringSetAside =
    (target.kind === 'weekly' || target.kind === 'monthly') &&
    target.fundingMode === 'set_aside';
  if (recurringSetAside) return assigned;
  const datedSetAside =
    (target.kind === 'yearly' && target.fundingMode === 'set_aside') ||
    (target.kind === 'custom' && target.customFundingMode === 'set_aside');
  if (datedSetAside) return assignedSinceTargetStarted;

  const spendingCountsTowardFunding =
    ((target.kind === 'weekly' || target.kind === 'monthly') &&
      target.fundingMode === 'refill_up_to') ||
    target.kind === 'yearly' ||
    (target.kind === 'custom' && target.customFundingMode === 'fill_up_to');

  return spendingCountsTowardFunding
    ? Money.fromCents(
        available.cents +
          (target.kind === 'yearly' || target.kind === 'custom'
            ? spentSinceTargetStarted.cents
            : spent.cents),
      )
    : available;
}

export function calculateTargetProgress({
  target,
  assigned,
  available,
  spent,
  assignedSinceTargetStarted = assigned,
  spentSinceTargetStarted = spent,
  month,
  today,
}: CalculateTargetProgressInput): TargetProgress {
  assertValidBudgetMonth(month);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    throw new InvalidCategoryTargetError('today must use YYYY-MM-DD');
  }

  const createdDate = target.createdAt.slice(0, 10);
  const createdMonth = createdDate.slice(0, 7);
  if (month < createdMonth) {
    return {
      goal: Money.zero(),
      funded: Money.zero(),
      recommended: Money.zero(),
      progress: 1,
      status: 'complete',
    };
  }

  const funded = targetFunding(
    target,
    assigned,
    available,
    spent,
    assignedSinceTargetStarted,
    spentSinceTargetStarted,
  );
  let goalCents = target.amount.cents;
  let remainingMonths = 1;
  let overdue = false;

  if (target.kind === 'weekly') {
    goalCents *= weeklyOccurrences(
      month,
      target.dayOfWeek ?? 1,
      month === createdMonth ? createdDate : undefined,
    );
  } else if (target.kind === 'monthly') {
    const dueDate = monthlyDueDate(month, target.dayOfMonth ?? 0);
    overdue =
      month < today.slice(0, 7) ||
      (month === today.slice(0, 7) && today > dueDate);
  } else if (target.kind === 'yearly') {
    const dueDate = yearlyDueDate(month, target.targetDate ?? today);
    const dueMonth = dueDate.slice(0, 7);
    remainingMonths = Math.max(1, inclusiveMonths(month, dueMonth));
    overdue = today > dueDate;
  } else if (target.kind === 'custom' && target.targetDate) {
    const dueMonth = target.targetDate.slice(0, 7);
    remainingMonths = Math.max(1, inclusiveMonths(month, dueMonth));
    overdue = month >= dueMonth && today > target.targetDate;
  }

  const remaining = Math.max(0, goalCents - funded.cents);
  const recommendedCents =
    target.kind === 'yearly' ||
    (target.kind === 'custom' && target.targetDate !== undefined)
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
