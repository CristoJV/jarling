import type { Account } from '@/domain/entities/account';
import type { BudgetAllocation } from '@/domain/entities/budget-allocation';
import { assertValidBudgetMonth } from '@/domain/entities/budget-allocation';
import type { Category } from '@/domain/entities/category';
import type { CategoryGroup } from '@/domain/entities/category-group';
import type { Transaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

export type BudgetCategoryValues = Readonly<{
  category: Category;
  assigned: Money;
  activity: Money;
  available: Money;
}>;

export type BudgetGroupValues = Readonly<{
  group: CategoryGroup;
  categories: readonly BudgetCategoryValues[];
}>;

export type BudgetMonthValues = Readonly<{
  month: string;
  readyToAssign: Money;
  groups: readonly BudgetGroupValues[];
}>;

export type CalculateBudgetMonthInput = Readonly<{
  month: string;
  accounts: readonly Account[];
  allocations: readonly BudgetAllocation[];
  categories: readonly Category[];
  groups: readonly CategoryGroup[];
  transactions: readonly Transaction[];
}>;

export function calculateBudgetMonth(
  input: CalculateBudgetMonthInput,
): BudgetMonthValues {
  assertValidBudgetMonth(input.month);
  const onBudgetAccountIds = new Set(
    input.accounts
      .filter((account) => account.onBudget)
      .map((account) => account.id),
  );
  const transactions = input.transactions.filter(
    (transaction) =>
      transaction.date.slice(0, 7) <= input.month &&
      onBudgetAccountIds.has(transaction.accountId),
  );
  const allocations = input.allocations.filter(
    (allocation) => allocation.month <= input.month,
  );
  const assignedTotal = allocations.reduce(
    (sum, allocation) => sum + allocation.amount.cents,
    0,
  );
  const unassignedCash = transactions
    .filter((transaction) => !transaction.categoryId)
    .reduce((sum, transaction) => sum + transaction.amount.cents, 0);

  return {
    month: input.month,
    readyToAssign: Money.fromCents(unassignedCash - assignedTotal),
    groups: [...input.groups]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((group) => ({
        group,
        categories: input.categories
          .filter((category) => category.groupId === group.id)
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((category) => {
            const categoryAllocations = allocations.filter(
              (allocation) => allocation.categoryId === category.id,
            );
            const categoryTransactions = transactions.filter(
              (transaction) => transaction.categoryId === category.id,
            );

            return {
              category,
              assigned: Money.fromCents(
                categoryAllocations
                  .filter((allocation) => allocation.month === input.month)
                  .reduce(
                    (sum, allocation) => sum + allocation.amount.cents,
                    0,
                  ),
              ),
              activity: Money.fromCents(
                categoryTransactions
                  .filter(
                    (transaction) =>
                      transaction.date.slice(0, 7) === input.month,
                  )
                  .reduce(
                    (sum, transaction) => sum + transaction.amount.cents,
                    0,
                  ),
              ),
              available: Money.fromCents(
                categoryAllocations.reduce(
                  (sum, allocation) => sum + allocation.amount.cents,
                  0,
                ) +
                  categoryTransactions.reduce(
                    (sum, transaction) => sum + transaction.amount.cents,
                    0,
                  ),
              ),
            };
          }),
      })),
  };
}
