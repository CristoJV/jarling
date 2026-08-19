import { isCreditAccountType, type Account } from '@/domain/entities/account';
import type { BudgetAllocation } from '@/domain/entities/budget-allocation';
import { assertValidBudgetMonth } from '@/domain/entities/budget-allocation';
import type { Category } from '@/domain/entities/category';
import type { CategoryGroup } from '@/domain/entities/category-group';
import type { Transaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';
import { calculateCreditCardPaymentState } from '@/domain/services/calculate-credit-card-payment-state';

export type BudgetCategoryValues = Readonly<{
  category: Category;
  assigned: Money;
  activity: Money;
  available: Money;
  spendingTransactions: readonly Money[];
  assignedHistory?: readonly Readonly<{ month: string; amount: Money }>[];
  spendingHistory?: readonly Readonly<{ month: string; amount: Money }>[];
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
  const cardFunding = calculateCreditCardPaymentState(input);
  const allocationsByCategory = new Map<string, BudgetAllocation[]>();
  for (const allocation of allocations) {
    const values = allocationsByCategory.get(allocation.categoryId) ?? [];
    values.push(allocation);
    allocationsByCategory.set(allocation.categoryId, values);
  }
  const transactionsByCategory = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    if (!transaction.categoryId) continue;
    const values = transactionsByCategory.get(transaction.categoryId) ?? [];
    values.push(transaction);
    transactionsByCategory.set(transaction.categoryId, values);
  }
  const categoriesByGroup = new Map<string, Category[]>();
  for (const category of input.categories) {
    const values = categoriesByGroup.get(category.groupId) ?? [];
    values.push(category);
    categoriesByGroup.set(category.groupId, values);
  }

  const groups = [...input.groups]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((group) => ({
      group,
      categories: [...(categoriesByGroup.get(group.id) ?? [])]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((category) => {
          const categoryAllocations =
            allocationsByCategory.get(category.id) ?? [];
          const categoryTransactions =
            transactionsByCategory.get(category.id) ?? [];
          const currentMonthTransactions = categoryTransactions.filter(
            (transaction) => transaction.date.slice(0, 7) === input.month,
          );
          const creditCardActivity = category.linkedAccountId
            ? (cardFunding.totalByAccount.get(category.linkedAccountId) ?? 0)
            : 0;
          const currentCreditCardActivity = category.linkedAccountId
            ? (cardFunding.currentByAccount.get(category.linkedAccountId) ?? 0)
            : 0;

          return {
            category,
            assigned: Money.fromCents(
              categoryAllocations
                .filter((allocation) => allocation.month === input.month)
                .reduce((sum, allocation) => sum + allocation.amount.cents, 0),
            ),
            activity: Money.fromCents(
              currentMonthTransactions.reduce(
                (sum, transaction) => sum + transaction.amount.cents,
                0,
              ) + currentCreditCardActivity,
            ),
            available: Money.fromCents(
              categoryAllocations.reduce(
                (sum, allocation) => sum + allocation.amount.cents,
                0,
              ) +
                categoryTransactions.reduce(
                  (sum, transaction) => sum + transaction.amount.cents,
                  0,
                ) +
                creditCardActivity,
            ),
            spendingTransactions: category.linkedAccountId
              ? []
              : currentMonthTransactions
                  .filter((transaction) => transaction.amount.cents < 0)
                  .map((transaction) =>
                    Money.fromCents(Math.abs(transaction.amount.cents)),
                  ),
            assignedHistory: categoryAllocations.map((allocation) => ({
              month: allocation.month,
              amount: allocation.amount,
            })),
            spendingHistory: categoryTransactions
              .filter((transaction) => transaction.amount.cents < 0)
              .map((transaction) => ({
                month: transaction.date.slice(0, 7),
                amount: Money.fromCents(Math.abs(transaction.amount.cents)),
              })),
          };
        }),
    }));

  // Ready to Assign is the residual of the accounting identity. A credit
  // account contributes only when it has a positive balance (money owed to the
  // user); debt never creates budgetable cash.
  const balanceByAccount = new Map<string, number>();
  for (const transaction of transactions) {
    balanceByAccount.set(
      transaction.accountId,
      (balanceByAccount.get(transaction.accountId) ?? 0) +
        transaction.amount.cents,
    );
  }
  const budgetableCash = input.accounts
    .filter(({ onBudget }) => onBudget)
    .reduce((sum, account) => {
      const balance = balanceByAccount.get(account.id) ?? 0;
      return (
        sum +
        (isCreditAccountType(account.type) ? Math.max(0, balance) : balance)
      );
    }, 0);
  const envelopeBalances = groups.reduce(
    (groupSum, group) =>
      groupSum +
      group.categories.reduce(
        (categorySum, category) => categorySum + category.available.cents,
        0,
      ),
    0,
  );

  return {
    month: input.month,
    readyToAssign: Money.fromCents(budgetableCash - envelopeBalances),
    groups,
  };
}
