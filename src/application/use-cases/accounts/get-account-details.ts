import type { Clock } from '@/application/ports/clock';
import type { Account } from '@/domain/entities/account';
import { AccountNotFoundError } from '@/domain/errors/account-not-found-error';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
import { calculateAccountBalanceState } from '@/domain/services/calculate-account-balance';
import type { Money } from '@/domain/value-objects/money';

export type AccountDetails = Readonly<{
  account: Account;
  throughDate: string;
  workingBalance: Money;
  clearedBalance: Money;
  unclearedBalance: Money;
  clearedCount: number;
  unclearedCount: number;
}>;

export class GetAccountDetails {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly transactions: TransactionRepository,
    private readonly clock: Clock,
  ) {}

  async execute(accountId: string): Promise<AccountDetails> {
    const account = await this.accounts.findById(accountId);
    if (!account) throw new AccountNotFoundError(accountId);
    const throughDate = this.clock.now().date;
    const transactions = await this.transactions.findAll({
      accountId,
      dateTo: throughDate,
    });
    const balances = calculateAccountBalanceState(transactions);
    return {
      account,
      throughDate,
      workingBalance: balances.working,
      clearedBalance: balances.cleared,
      unclearedBalance: balances.uncleared,
      clearedCount: balances.clearedCount,
      unclearedCount: balances.unclearedCount,
    };
  }
}
