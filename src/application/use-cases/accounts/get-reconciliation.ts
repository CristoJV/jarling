import type { Clock } from '@/application/ports/clock';
import type { Account } from '@/domain/entities/account';
import { AccountNotFoundError } from '@/domain/errors/account-not-found-error';
import { ClosedAccountError } from '@/domain/errors/closed-account-error';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
import { Money } from '@/domain/value-objects/money';

export type ReconciliationPreview = Readonly<{
  account: Account;
  throughDate: string;
  clearedBalance: Money;
  workingBalance: Money;
  clearedCount: number;
  unclearedCount: number;
}>;

export class GetReconciliation {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly transactions: TransactionRepository,
    private readonly clock: Clock,
  ) {}

  async execute(accountId: string): Promise<ReconciliationPreview> {
    const account = await this.accounts.findById(accountId);
    if (!account) throw new AccountNotFoundError(accountId);
    if (account.closed) throw new ClosedAccountError(accountId);

    const throughDate = this.clock.now().date;
    const transactions = await this.transactions.findAll({
      accountId,
      dateTo: throughDate,
    });
    const cleared = transactions.filter(({ status }) => status !== 'uncleared');

    return {
      account,
      throughDate,
      clearedBalance: Money.fromCents(
        cleared.reduce((sum, transaction) => sum + transaction.amount.cents, 0),
      ),
      workingBalance: Money.fromCents(
        transactions.reduce(
          (sum, transaction) => sum + transaction.amount.cents,
          0,
        ),
      ),
      clearedCount: cleared.length,
      unclearedCount: transactions.length - cleared.length,
    };
  }
}
