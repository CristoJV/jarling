import type { Clock } from '@/application/ports/clock';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  updateTransaction as applyChanges,
  type Transaction,
} from '@/domain/entities/transaction';
import { CannotModifyReconciledTransactionError } from '@/domain/errors/cannot-modify-reconciled-transaction-error';
import { TransactionNotFoundError } from '@/domain/errors/transaction-not-found-error';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';

import {
  prepareTransactionInput,
  type TransactionInput,
} from './transaction-input';

export type UpdateTransactionInput = TransactionInput &
  Readonly<{ id: string }>;

export class UpdateTransaction {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateTransactionInput): Promise<Transaction> {
    const current = await this.transactions.findById(input.id);

    if (!current) {
      throw new TransactionNotFoundError(input.id);
    }

    if (current.status === 'reconciled') {
      throw new CannotModifyReconciledTransactionError();
    }

    const prepared = await prepareTransactionInput(
      input,
      this.accounts,
      this.categories,
    );
    const updated = applyChanges(current, {
      ...prepared,
      updatedAt: this.clock.now().instant,
    });

    return this.unitOfWork.run(async () => {
      await this.transactions.save(updated);
      return updated;
    });
  }
}
