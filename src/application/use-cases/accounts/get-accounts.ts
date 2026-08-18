import type { Account } from '@/domain/entities/account';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
import { calculateAccountBalance } from '@/domain/services/calculate-account-balance';
import { Money } from '@/domain/value-objects/money';

export type AccountSummary = Readonly<{
  account: Account;
  balance: Money;
}>;

export type AccountsOverview = Readonly<{
  accounts: readonly AccountSummary[];
  onBudgetTotal: Money;
}>;

export class GetAccounts {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly transactions: TransactionRepository,
  ) {}

  async execute(): Promise<AccountsOverview> {
    const accounts = await this.accounts.findAll();
    const summaries = await Promise.all(
      accounts.map(async (account) => {
        const transactions = await this.transactions.findByAccount(account.id);
        return {
          account,
          balance: calculateAccountBalance(transactions),
        };
      }),
    );

    const onBudgetTotal = summaries.reduce(
      (total, summary) =>
        summary.account.onBudget ? total.add(summary.balance) : total,
      Money.zero(),
    );

    return { accounts: summaries, onBudgetTotal };
  }
}
