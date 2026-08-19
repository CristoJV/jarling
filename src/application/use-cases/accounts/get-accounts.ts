import type { Account } from '@/domain/entities/account';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
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
    const [accounts, balances] = await Promise.all([
      this.accounts.findAll(),
      this.transactions.findBalancesByAccount(),
    ]);
    const summaries = accounts.map((account) => ({
      account,
      balance: balances.get(account.id) ?? Money.zero(),
    }));

    const onBudgetTotal = summaries.reduce(
      (total, summary) =>
        summary.account.onBudget ? total.add(summary.balance) : total,
      Money.zero(),
    );

    return { accounts: summaries, onBudgetTotal };
  }
}
