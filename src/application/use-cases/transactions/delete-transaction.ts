import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { CannotModifyReconciledTransactionError } from '@/domain/errors/cannot-modify-reconciled-transaction-error';
import { TransactionNotFoundError } from '@/domain/errors/transaction-not-found-error';
import { ProtectedTransactionError } from '@/domain/errors/protected-transaction-error';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
import { parseTransferPair } from '@/domain/services/transfer-pair';

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

    if (transaction.kind !== 'standard' && transaction.kind !== 'transfer') {
      throw new ProtectedTransactionError(transaction.kind);
    }

    const isTransfer = transaction.kind === 'transfer';
    const linked =
      isTransfer && transaction.transactionGroupId
        ? await this.transactions.findByGroup(transaction.transactionGroupId)
        : [transaction];

    if (
      isTransfer &&
      !parseTransferPair(linked, transaction.transactionGroupId)
    ) {
      throw new ProtectedTransactionError('invalid transfer');
    }

    if (linked.some(({ status }) => status === 'reconciled')) {
      throw new CannotModifyReconciledTransactionError();
    }

    await this.unitOfWork.run(() =>
      isTransfer && transaction.transactionGroupId
        ? this.transactions.deleteByGroup(transaction.transactionGroupId)
        : this.transactions.deleteById(transactionId),
    );
  }
}
