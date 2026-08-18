import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { CannotModifyReconciledTransactionError } from '@/domain/errors/cannot-modify-reconciled-transaction-error';
import { TransactionNotFoundError } from '@/domain/errors/transaction-not-found-error';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';

export class DeleteTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(transactionId: string): Promise<void> {
    const transaction = await this.transactions.findById(transactionId);

    if (!transaction) {
      throw new TransactionNotFoundError(transactionId);
    }

    if (transaction.status === 'reconciled') {
      throw new CannotModifyReconciledTransactionError();
    }

    await this.unitOfWork.run(() =>
      this.transactions.deleteById(transactionId),
    );
  }
}
