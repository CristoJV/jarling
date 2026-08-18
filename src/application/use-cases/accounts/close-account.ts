import type { Clock } from '@/application/ports/clock';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  closeAccount as closeAccountEntity,
  type Account,
} from '@/domain/entities/account';
import { AccountNotFoundError } from '@/domain/errors/account-not-found-error';
import type { AccountRepository } from '@/domain/repositories/account-repository';

export class CloseAccount {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(accountId: string): Promise<Account> {
    const account = await this.accounts.findById(accountId);

    if (!account) {
      throw new AccountNotFoundError(accountId);
    }

    const closedAccount = closeAccountEntity(account, this.clock.now().instant);

    return this.unitOfWork.run(async () => {
      await this.accounts.save(closedAccount);
      return closedAccount;
    });
  }
}
