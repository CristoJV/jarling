import { isCreditAccountType, type Account } from '@/domain/entities/account';
import type { BudgetAllocation } from '@/domain/entities/budget-allocation';
import type { Category } from '@/domain/entities/category';
import type { Transaction } from '@/domain/entities/transaction';

export type CreditCardPaymentState = Readonly<{
  totalByAccount: ReadonlyMap<string, number>;
  currentByAccount: ReadonlyMap<string, number>;
}>;

type Input = Readonly<{
  month: string;
  accounts: readonly Account[];
  allocations: readonly BudgetAllocation[];
  categories: readonly Category[];
  transactions: readonly Transaction[];
}>;

export function calculateCreditCardPaymentState(
  input: Input,
): CreditCardPaymentState {
  const accountById = new Map(
    input.accounts.map((account) => [account.id, account] as const),
  );
  const totalByAccount = new Map<string, number>();
  const currentByAccount = new Map<string, number>();
  const allocationsByCategory = new Map<string, BudgetAllocation[]>();
  const transactionsByCategory = new Map<string, Transaction[]>();
  for (const allocation of input.allocations) {
    if (allocation.month > input.month) continue;
    const values = allocationsByCategory.get(allocation.categoryId) ?? [];
    values.push(allocation);
    allocationsByCategory.set(allocation.categoryId, values);
  }
  for (const transaction of input.transactions) {
    if (
      !transaction.categoryId ||
      transaction.kind !== 'standard' ||
      transaction.date.slice(0, 7) > input.month
    ) {
      continue;
    }
    const values = transactionsByCategory.get(transaction.categoryId) ?? [];
    values.push(transaction);
    transactionsByCategory.set(transaction.categoryId, values);
  }

  for (const category of input.categories) {
    if (category.linkedAccountId) continue;
    const events = [
      ...(allocationsByCategory.get(category.id) ?? []).map((allocation) => ({
        order: `${allocation.month}-00:${allocation.createdAt}`,
        month: allocation.month,
        amount: allocation.amount.cents,
        accountId: undefined,
      })),
      ...(transactionsByCategory.get(category.id) ?? []).map((transaction) => ({
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
      if (!account || !isCreditAccountType(account.type)) {
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
