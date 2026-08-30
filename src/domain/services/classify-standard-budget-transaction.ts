import {
  supportsCategoryInflows,
  type Account,
} from '@/domain/entities/account';
import type { Transaction } from '@/domain/entities/transaction';

export type StandardBudgetTransactionRole =
  | 'ready-to-assign-inflow'
  | 'category-inflow'
  | 'category-expense'
  | 'uncategorized-expense';

export function classifyStandardBudgetTransaction(
  transaction: Transaction,
  account: Account | undefined,
): StandardBudgetTransactionRole | null {
  if (
    transaction.kind !== 'standard' ||
    !account ||
    !supportsCategoryInflows(account)
  ) {
    return null;
  }

  if (transaction.amount.cents > 0) {
    return transaction.categoryId
      ? 'category-inflow'
      : 'ready-to-assign-inflow';
  }

  if (transaction.amount.cents < 0) {
    return transaction.categoryId
      ? 'category-expense'
      : 'uncategorized-expense';
  }

  return null;
}
