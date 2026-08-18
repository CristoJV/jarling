import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  createTransaction,
  type Transaction,
} from '@/domain/entities/transaction';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';

import {
  prepareTransactionInput,
  type TransactionInput,
} from './transaction-input';

export class CreateTransaction {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: TransactionInput): Promise<Transaction> {
    const prepared = await prepareTransactionInput(
      input,
      this.accounts,
      this.categories,
    );
    const { instant } = this.clock.now();
    const transaction = createTransaction({
      id: this.ids.next(),
      ...prepared,
      createdAt: instant,
      updatedAt: instant,
    });

    return this.unitOfWork.run(async () => {
      await this.transactions.save(transaction);
      return transaction;
    });
  }
}
