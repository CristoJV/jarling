import type { GetTransactionsInput } from '@/application/use-cases/transactions/get-transactions';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
import {
  calculateTransactionAmountSummary,
  type TransactionAmountSummary,
} from '@/domain/services/calculate-transaction-amount-summary';

export type GetTransactionAmountSummaryInput = Omit<
  GetTransactionsInput,
  'before' | 'limit'
>;

export class GetTransactionAmountSummary {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(
    input: GetTransactionAmountSummaryInput,
  ): Promise<TransactionAmountSummary> {
    return calculateTransactionAmountSummary(
      await this.transactions.findAll(input),
    );
  }
}
