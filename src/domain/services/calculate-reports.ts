import type { Account } from '@/domain/entities/account';
import { assertValidBudgetMonth } from '@/domain/entities/budget-allocation';
import type { Category } from '@/domain/entities/category';
import type { CategoryGroup } from '@/domain/entities/category-group';
import type { Transaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';
import {
  calculateSpendingReport,
  type SpendingIntervalUnit,
  type SpendingReport,
} from '@/domain/services/calculate-spending-report';

export type ReportMonth = Readonly<{
  month: string;
  income: Money;
  spending: Money;
  netIncome: Money;
  assets: Money;
  debt: Money;
  netWorth: Money;
}>;

export type ReportsSnapshot = Readonly<{
  months: readonly ReportMonth[];
  spending: SpendingReport;
}>;

type CalculateReportsInput = Readonly<{
  throughDate: string;
  spendingInterval: SpendingIntervalUnit;
  spendingIntervalCount: number;
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
  throughDate,
  spendingInterval,
  spendingIntervalCount,
  numberOfMonths = 6,
  accounts,
  categories,
  groups,
  transactions,
}: CalculateReportsInput): ReportsSnapshot {
  const throughMonth = throughDate.slice(0, 7);
  assertValidBudgetMonth(throughMonth);
  if (!Number.isSafeInteger(numberOfMonths) || numberOfMonths < 1) {
    throw new RangeError('numberOfMonths must be a positive integer');
  }

  const months = reportMonths(throughMonth, numberOfMonths);
  const firstMonth = months[0] ?? throughMonth;
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const reportMonthSet = new Set(months);
  const incomeByMonth = new Map<string, number>();
  const spendingByMonth = new Map<string, number>();
  const startingBalanceByAccount = new Map<string, number>();
  const balanceChangesByMonth = new Map<string, Map<string, number>>();

  for (const transaction of transactions) {
    if (transaction.date > throughDate) continue;
    const month = transaction.date.slice(0, 7);
    if (month > throughMonth) continue;
    const account = accountById.get(transaction.accountId);

    if (month < firstMonth) {
      startingBalanceByAccount.set(
        transaction.accountId,
        (startingBalanceByAccount.get(transaction.accountId) ?? 0) +
          transaction.amount.cents,
      );
      continue;
    }
    if (!reportMonthSet.has(month)) continue;

    const changes =
      balanceChangesByMonth.get(month) ?? new Map<string, number>();
    changes.set(
      transaction.accountId,
      (changes.get(transaction.accountId) ?? 0) + transaction.amount.cents,
    );
    balanceChangesByMonth.set(month, changes);

    if (transaction.kind !== 'standard' || account?.onBudget !== true) {
      continue;
    }
    if (!transaction.categoryId) {
      incomeByMonth.set(
        month,
        (incomeByMonth.get(month) ?? 0) + transaction.amount.cents,
      );
      continue;
    }
    spendingByMonth.set(
      month,
      (spendingByMonth.get(month) ?? 0) - transaction.amount.cents,
    );
  }

  const runningBalances = new Map(startingBalanceByAccount);
  const monthReports = months.map((month) => {
    for (const [accountId, change] of balanceChangesByMonth.get(month) ?? []) {
      runningBalances.set(
        accountId,
        (runningBalances.get(accountId) ?? 0) + change,
      );
    }
    const spendingCents = Math.max(0, spendingByMonth.get(month) ?? 0);
    const incomeCents = incomeByMonth.get(month) ?? 0;
    const balances = accounts.map(
      (account) => runningBalances.get(account.id) ?? 0,
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

  return {
    months: monthReports,
    spending: calculateSpendingReport({
      throughDate,
      interval: spendingInterval,
      intervalCount: spendingIntervalCount,
      accounts,
      categories,
      groups,
      transactions,
    }),
  };
}
