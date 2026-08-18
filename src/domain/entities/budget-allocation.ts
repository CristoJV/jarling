import { InvalidBudgetMonthError } from '@/domain/errors/invalid-budget-month-error';
import type { Money } from '@/domain/value-objects/money';

export type BudgetAllocation = Readonly<{
  id: string;
  categoryId: string;
  month: string;
  amount: Money;
  createdAt: string;
  updatedAt: string;
}>;

export function isValidBudgetMonth(month: string): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  return Boolean(match && Number(match[2]) >= 1 && Number(match[2]) <= 12);
}

export function assertValidBudgetMonth(month: string): void {
  if (!isValidBudgetMonth(month)) {
    throw new InvalidBudgetMonthError();
  }
}

export function createBudgetAllocation(
  allocation: BudgetAllocation,
): BudgetAllocation {
  assertValidBudgetMonth(allocation.month);
  return allocation;
}
