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
  spendingTransactions: readonly Money[];
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

type CreditFunding = Readonly<{
  totalByAccount: ReadonlyMap<string, number>;
  currentByAccount: ReadonlyMap<string, number>;
}>;

function creditFunding(input: CalculateBudgetMonthInput): CreditFunding {
  const accountById = new Map(
    input.accounts.map((account) => [account.id, account] as const),
  );
  const paymentCategoryIds = new Set(
    input.categories
      .filter(({ linkedAccountId }) => linkedAccountId !== undefined)
      .map(({ id }) => id),
  );
  const totalByAccount = new Map<string, number>();
  const currentByAccount = new Map<string, number>();

  for (const category of input.categories.filter(
    ({ id, linkedAccountId }) =>
      linkedAccountId === undefined && !paymentCategoryIds.has(id),
  )) {
    const events = [
      ...input.allocations
        .filter(
          (allocation) =>
            allocation.categoryId === category.id &&
            allocation.month <= input.month,
        )
        .map((allocation) => ({
          order: `${allocation.month}-00:${allocation.createdAt}`,
          month: allocation.month,
          amount: allocation.amount.cents,
          accountId: undefined,
        })),
      ...input.transactions
        .filter(
          (transaction) =>
            transaction.categoryId === category.id &&
            transaction.kind === 'standard' &&
            transaction.date.slice(0, 7) <= input.month,
        )
        .map((transaction) => ({
          order: `${transaction.date}:${transaction.createdAt}`,
          month: transaction.date.slice(0, 7),
          amount: transaction.amount.cents,
          accountId: transaction.accountId,
        })),
    ].sort((left, right) => left.order.localeCompare(right.order));
    let available = 0;
    const fundedByAccount = new Map<string, number>();
    const debtByAccount = new Map<string, number>();

    const addFunding = (accountId: string, cents: number, month: string) => {
      totalByAccount.set(
        accountId,
        (totalByAccount.get(accountId) ?? 0) + cents,
      );
      if (month === input.month) {
        currentByAccount.set(
          accountId,
          (currentByAccount.get(accountId) ?? 0) + cents,
        );
      }
    };

    for (const event of events) {
      if (!event.accountId) {
        let remaining = Math.max(0, event.amount);
        for (const [accountId, debt] of debtByAccount) {
          const covered = Math.min(debt, remaining);
          if (covered <= 0) continue;
          debtByAccount.set(accountId, debt - covered);
          fundedByAccount.set(
            accountId,
            (fundedByAccount.get(accountId) ?? 0) + covered,
          );
          addFunding(accountId, covered, event.month);
          remaining -= covered;
        }
        available += event.amount;
        continue;
      }

      const account = accountById.get(event.accountId);
      if (account?.type !== 'credit_card') {
        available += event.amount;
        continue;
      }

      if (event.amount < 0) {
        const expense = Math.abs(event.amount);
        const covered = Math.min(expense, Math.max(0, available));
        const uncovered = expense - covered;
        if (covered > 0) {
          fundedByAccount.set(
            account.id,
            (fundedByAccount.get(account.id) ?? 0) + covered,
          );
          addFunding(account.id, covered, event.month);
        }
        if (uncovered > 0) {
          debtByAccount.set(
            account.id,
            (debtByAccount.get(account.id) ?? 0) + uncovered,
          );
        }
      } else if (event.amount > 0) {
        let refund = event.amount;
        const debt = debtByAccount.get(account.id) ?? 0;
        const debtReduction = Math.min(debt, refund);
        debtByAccount.set(account.id, debt - debtReduction);
        refund -= debtReduction;
        const funded = fundedByAccount.get(account.id) ?? 0;
        const fundingReduction = Math.min(funded, refund);
        if (fundingReduction > 0) {
          fundedByAccount.set(account.id, funded - fundingReduction);
          addFunding(account.id, -fundingReduction, event.month);
        }
      }
      available += event.amount;
    }
  }

  return { totalByAccount, currentByAccount };
}

export function calculateBudgetMonth(
  input: CalculateBudgetMonthInput,
): BudgetMonthValues {
  assertValidBudgetMonth(input.month);
  const onBudgetAccountIds = new Set(
    input.accounts
      .filter((account) => account.onBudget)
      .map((account) => account.id),
  );
  const accountById = new Map(
    input.accounts.map((account) => [account.id, account] as const),
  );
  const transactions = input.transactions.filter(
    (transaction) =>
      transaction.date.slice(0, 7) <= input.month &&
      onBudgetAccountIds.has(transaction.accountId),
  );
  const allocations = input.allocations.filter(
    (allocation) => allocation.month <= input.month,
  );
  const cardFunding = creditFunding(input);
  const assignedTotal = allocations.reduce(
    (sum, allocation) => sum + allocation.amount.cents,
    0,
  );
  const unassignedCash = transactions
    .filter(
      (transaction) =>
        !transaction.categoryId &&
        accountById.get(transaction.accountId)?.type !== 'credit_card',
    )
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
            const currentMonthTransactions = categoryTransactions.filter(
              (transaction) => transaction.date.slice(0, 7) === input.month,
            );
            const creditCardActivity = category.linkedAccountId
              ? (cardFunding.totalByAccount.get(category.linkedAccountId) ?? 0)
              : 0;
            const currentCreditCardActivity = category.linkedAccountId
              ? (cardFunding.currentByAccount.get(category.linkedAccountId) ??
                0)
              : 0;

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
            };
          }),
      })),
  };
}
