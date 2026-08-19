import type { Account } from '@/domain/entities/account';
import { assertValidBudgetMonth } from '@/domain/entities/budget-allocation';
import type { Category } from '@/domain/entities/category';
import type { CategoryGroup } from '@/domain/entities/category-group';
import type { Transaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

export type ReportMonth = Readonly<{
  month: string;
  income: Money;
  spending: Money;
  netIncome: Money;
  assets: Money;
  debt: Money;
  netWorth: Money;
}>;

export type SpendingCategoryReport = Readonly<{
  categoryId: string;
  categoryName: string;
  groupId?: string;
  groupName: string;
  spending: Money;
  percentage: number;
}>;

export type ReportsSnapshot = Readonly<{
  months: readonly ReportMonth[];
  spending: Readonly<{
    total: Money;
    monthlyAverage: Money;
    categories: readonly SpendingCategoryReport[];
  }>;
}>;

type CalculateReportsInput = Readonly<{
  throughMonth: string;
  numberOfMonths?: number;
  accounts: readonly Account[];
  categories: readonly Category[];
  groups: readonly CategoryGroup[];
  transactions: readonly Transaction[];
}>;

function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(
    Date.UTC(year ?? 0, (monthNumber ?? 1) - 1 + offset, 1),
  );
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function reportMonths(throughMonth: string, count: number): readonly string[] {
  return Array.from({ length: count }, (_, index) =>
    shiftMonth(throughMonth, index - count + 1),
  );
}

export function calculateReports({
  throughMonth,
  numberOfMonths = 6,
  accounts,
  categories,
  groups,
  transactions,
}: CalculateReportsInput): ReportsSnapshot {
  assertValidBudgetMonth(throughMonth);
  if (!Number.isSafeInteger(numberOfMonths) || numberOfMonths < 1) {
    throw new RangeError('numberOfMonths must be a positive integer');
  }

  const months = reportMonths(throughMonth, numberOfMonths);
  const firstMonth = months[0] ?? throughMonth;
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const categorySpending = new Map<string, number>();

  const monthReports = months.map((month) => {
    const monthlyTransactions = transactions.filter(
      (transaction) => transaction.date.slice(0, 7) === month,
    );
    const categorized = monthlyTransactions.filter(
      (transaction) =>
        Boolean(transaction.categoryId) &&
        transaction.kind === 'standard' &&
        accountById.get(transaction.accountId)?.onBudget === true,
    );
    const spendingCents = Math.max(
      0,
      categorized.reduce(
        (sum, transaction) => sum - transaction.amount.cents,
        0,
      ),
    );
    const incomeCents = monthlyTransactions
      .filter(
        (transaction) =>
          accountById.get(transaction.accountId)?.onBudget === true &&
          !transaction.categoryId &&
          transaction.kind === 'standard',
      )
      .reduce((sum, transaction) => sum + transaction.amount.cents, 0);

    const balances = accounts.map((account) =>
      transactions
        .filter(
          (transaction) =>
            transaction.accountId === account.id &&
            transaction.date.slice(0, 7) <= month,
        )
        .reduce((sum, transaction) => sum + transaction.amount.cents, 0),
    );
    const assetsCents = balances
      .filter((balance) => balance > 0)
      .reduce((sum, balance) => sum + balance, 0);
    const debtCents = balances
      .filter((balance) => balance < 0)
      .reduce((sum, balance) => sum + Math.abs(balance), 0);

    return {
      month,
      income: Money.fromCents(incomeCents),
      spending: Money.fromCents(spendingCents),
      netIncome: Money.fromCents(incomeCents - spendingCents),
      assets: Money.fromCents(assetsCents),
      debt: Money.fromCents(debtCents),
      netWorth: Money.fromCents(assetsCents - debtCents),
    };
  });

  transactions
    .filter(
      (transaction) =>
        transaction.date.slice(0, 7) >= firstMonth &&
        transaction.date.slice(0, 7) <= throughMonth &&
        Boolean(transaction.categoryId) &&
        transaction.kind === 'standard' &&
        accountById.get(transaction.accountId)?.onBudget === true,
    )
    .forEach((transaction) => {
      const categoryId = transaction.categoryId;
      if (!categoryId) return;
      categorySpending.set(
        categoryId,
        (categorySpending.get(categoryId) ?? 0) - transaction.amount.cents,
      );
    });

  const categoryRows = [...categorySpending]
    .filter(([, cents]) => cents > 0)
    .map(([categoryId, cents]) => {
      const category = categoryById.get(categoryId);
      return {
        categoryId,
        categoryName: category?.name ?? 'Unknown category',
        ...(category ? { groupId: category.groupId } : {}),
        groupName: category
          ? (groupById.get(category.groupId)?.name ?? 'Other')
          : 'Other',
        spending: Money.fromCents(cents),
      };
    })
    .sort((left, right) => right.spending.cents - left.spending.cents);
  const totalCents = categoryRows.reduce(
    (sum, category) => sum + category.spending.cents,
    0,
  );

  return {
    months: monthReports,
    spending: {
      total: Money.fromCents(totalCents),
      monthlyAverage: Money.fromCents(Math.round(totalCents / numberOfMonths)),
      categories: categoryRows.map((category) => ({
        ...category,
        percentage: totalCents === 0 ? 0 : category.spending.cents / totalCents,
      })),
    },
  };
}
