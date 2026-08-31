import { isCreditAccountType, type Account } from '@/domain/entities/account';
import type { BudgetAllocation } from '@/domain/entities/budget-allocation';
import { assertValidBudgetMonth } from '@/domain/entities/budget-allocation';
import type { Category } from '@/domain/entities/category';
import type { CategoryGroup } from '@/domain/entities/category-group';
import type { Transaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';
import {
  calculateCreditCardPaymentState,
  type CreditCardPaymentState,
} from '@/domain/services/calculate-credit-card-payment-state';
import {
  calculateBudgetFundingState,
  type BudgetFundingState,
} from '@/domain/services/calculate-budget-funding-state';
import { classifyStandardBudgetTransaction } from '@/domain/services/classify-standard-budget-transaction';

export type BudgetCategoryValues = Readonly<{
  category: Category;
  availableFromPreviousMonth: Money;
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
  funding: BudgetFundingState;
  uncategorized: Readonly<{
    amount: Money;
    transactionCount: number;
  }>;
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

export type CategoryPeriodUsage = Readonly<{
  startingAvailable: Money;
  netSpending: Money;
}>;

/**
 * Describes this month's category usage without persisting another balance.
 * Activity is signed, so an inflow reduces net spending and never becomes
 * starting budget capacity.
 */
export function calculateCategoryPeriodUsage(
  values: Pick<
    BudgetCategoryValues,
    'availableFromPreviousMonth' | 'assigned' | 'activity'
  >,
): CategoryPeriodUsage {
  return {
    startingAvailable: Money.fromCents(
      values.availableFromPreviousMonth.cents + values.assigned.cents,
    ),
    netSpending: Money.fromCents(-values.activity.cents),
  };
}

export function calculateBudgetMonth(
  input: CalculateBudgetMonthInput,
): BudgetMonthValues {
  const snapshot = calculateBudgetMonthSnapshot(input);
  const groupIds = new Set(input.groups.map(({ id }) => id));
  const categoryIds = new Set(
    input.categories
      .filter(({ groupId }) => groupIds.has(groupId))
      .map(({ id }) => id),
  );
  const relevantAllocations = input.allocations.filter(({ categoryId }) =>
    categoryIds.has(categoryId),
  );
  const futureAllocations = relevantAllocations.filter(
    ({ month }) => month > input.month,
  );
  const lastFutureAllocationMonth = futureAllocations.reduce(
    (latest, allocation) =>
      allocation.month > latest ? allocation.month : latest,
    input.month,
  );
  const timelineMonths = new Set<string>([
    input.month,
    ...futureAllocations.map(({ month }) => month),
    ...input.transactions
      .map(({ date }) => date.slice(0, 7))
      .filter(
        (month) => month > input.month && month <= lastFutureAllocationMonth,
      ),
  ]);
  const assignedByMonth = new Map<string, number>();
  for (const allocation of relevantAllocations) {
    assignedByMonth.set(
      allocation.month,
      (assignedByMonth.get(allocation.month) ?? 0) + allocation.amount.cents,
    );
  }
  const funding = calculateBudgetFundingState({
    visibleMonth: input.month,
    months: [...timelineMonths].map((month) => ({
      month,
      balance:
        month === input.month
          ? snapshot.readyToAssign
          : calculateBudgetMonthSnapshot({ ...input, month }).readyToAssign,
      assigned: Money.fromCents(assignedByMonth.get(month) ?? 0),
    })),
  });

  return {
    ...snapshot,
    readyToAssign: funding.readyToAssign,
    funding,
  };
}

type BudgetMonthSnapshot = Omit<BudgetMonthValues, 'funding'>;

function calculateCategoryValues(
  category: Category,
  month: string,
  allocations: readonly BudgetAllocation[],
  transactions: readonly Transaction[],
  cardFunding: CreditCardPaymentState,
): BudgetCategoryValues {
  const currentMonthTransactions = transactions.filter(
    (transaction) => transaction.date.slice(0, 7) === month,
  );
  const creditCardActivity = category.linkedAccountId
    ? (cardFunding.totalByAccount.get(category.linkedAccountId) ?? 0)
    : 0;
  const currentCreditCardActivity = category.linkedAccountId
    ? (cardFunding.currentByAccount.get(category.linkedAccountId) ?? 0)
    : 0;
  const assigned = Money.fromCents(
    allocations
      .filter((allocation) => allocation.month === month)
      .reduce((sum, allocation) => sum + allocation.amount.cents, 0),
  );
  const activity = Money.fromCents(
    currentMonthTransactions.reduce(
      (sum, transaction) => sum + transaction.amount.cents,
      0,
    ) + currentCreditCardActivity,
  );
  const available = Money.fromCents(
    allocations.reduce((sum, allocation) => sum + allocation.amount.cents, 0) +
      transactions.reduce(
        (sum, transaction) => sum + transaction.amount.cents,
        0,
      ) +
      creditCardActivity,
  );
  const spendingTransactions = currentMonthTransactions.filter(
    (transaction) => transaction.amount.cents < 0,
  );

  return {
    category,
    availableFromPreviousMonth: Money.fromCents(
      available.cents - assigned.cents - activity.cents,
    ),
    assigned,
    activity,
    available,
    spendingTransactions: category.linkedAccountId
      ? []
      : spendingTransactions.map((transaction) =>
          Money.fromCents(Math.abs(transaction.amount.cents)),
        ),
    assignedHistory: allocations.map((allocation) => ({
      month: allocation.month,
      amount: allocation.amount,
    })),
    spendingHistory: transactions
      .filter((transaction) => transaction.amount.cents < 0)
      .map((transaction) => ({
        month: transaction.date.slice(0, 7),
        amount: Money.fromCents(Math.abs(transaction.amount.cents)),
      })),
  };
}

function calculateBudgetableCash(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
): number {
  const balanceByAccount = new Map<string, number>();
  for (const transaction of transactions) {
    balanceByAccount.set(
      transaction.accountId,
      (balanceByAccount.get(transaction.accountId) ?? 0) +
        transaction.amount.cents,
    );
  }
  return accounts
    .filter(({ onBudget }) => onBudget)
    .reduce((sum, account) => {
      const balance = balanceByAccount.get(account.id) ?? 0;
      return (
        sum +
        (isCreditAccountType(account.type) ? Math.max(0, balance) : balance)
      );
    }, 0);
}

function calculateBudgetMonthSnapshot(
  input: CalculateBudgetMonthInput,
): BudgetMonthSnapshot {
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
        .map((category) =>
          calculateCategoryValues(
            category,
            input.month,
            allocationsByCategory.get(category.id) ?? [],
            transactionsByCategory.get(category.id) ?? [],
            cardFunding,
          ),
        ),
    }));

  // Ready to Assign is the residual of the accounting identity. A credit
  // account contributes only when it has a positive balance (money owed to the
  // user); debt never creates budgetable cash.
  const budgetableCash = calculateBudgetableCash(input.accounts, transactions);
  const envelopeBalances = groups.reduce(
    (groupSum, group) =>
      groupSum +
      group.categories.reduce(
        (categorySum, category) => categorySum + category.available.cents,
        0,
      ),
    0,
  );
  const uncategorizedTransactions = transactions.filter(
    (transaction) =>
      transaction.date.slice(0, 7) === input.month &&
      classifyStandardBudgetTransaction(
        transaction,
        accountById.get(transaction.accountId),
      ) === 'uncategorized-expense',
  );

  return {
    month: input.month,
    readyToAssign: Money.fromCents(budgetableCash - envelopeBalances),
    uncategorized: {
      amount: Money.fromCents(
        uncategorizedTransactions.reduce(
          (total, transaction) => total + transaction.amount.cents,
          0,
        ),
      ),
      transactionCount: uncategorizedTransactions.length,
    },
    groups,
  };
}
