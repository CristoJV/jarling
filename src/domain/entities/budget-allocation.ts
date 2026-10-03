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

export function shiftBudgetMonth(month: string, offset: number): string {
  assertValidBudgetMonth(month);
  if (!Number.isSafeInteger(offset)) throw new InvalidBudgetMonthError();
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year!, monthNumber! - 1 + offset, 1);
  const shiftedYear = date.getUTCFullYear();
  if (shiftedYear < 0 || shiftedYear > 9999) {
    throw new InvalidBudgetMonthError();
  }
  return `${String(shiftedYear).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function createBudgetAllocation(
  allocation: BudgetAllocation,
): BudgetAllocation {
  assertValidBudgetMonth(allocation.month);
  return allocation;
}
