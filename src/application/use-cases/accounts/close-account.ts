import type { Clock } from '@/application/ports/clock';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  closeAccount as closeAccountEntity,
  type Account,
} from '@/domain/entities/account';
import { AccountNotFoundError } from '@/domain/errors/account-not-found-error';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import { setCategoryHidden } from '@/domain/entities/category';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
import { calculateAccountBalance } from '@/domain/services/calculate-account-balance';
import { AccountBalanceNotZeroError } from '@/domain/errors/account-balance-not-zero-error';

export class CloseAccount {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(accountId: string): Promise<Account> {
    const account = await this.accounts.findById(accountId);

    if (!account) {
      throw new AccountNotFoundError(accountId);
    }

    const balance = calculateAccountBalance(
      await this.transactions.findByAccount(accountId),
    );
    if (balance.cents !== 0) throw new AccountBalanceNotZeroError();

    const updatedAt = this.clock.now().instant;
    const closedAccount = closeAccountEntity(account, updatedAt);
    const paymentCategory = (await this.categories.findAll()).find(
      ({ linkedAccountId }) => linkedAccountId === accountId,
    );

    return this.unitOfWork.run(async () => {
      await this.accounts.save(closedAccount);
      if (paymentCategory) {
        await this.categories.save(
          setCategoryHidden(paymentCategory, true, updatedAt),
        );
      }
      return closedAccount;
    });
  }
}
