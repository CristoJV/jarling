import type { GetTransactionsInput } from '@/application/use-cases/transactions/get-transactions';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
import type { TransactionAmountSummary } from '@/domain/services/calculate-transaction-amount-summary';
import { assertTransactionTagLimit } from '@/domain/entities/tag';

export type GetTransactionAmountSummaryInput = Omit<
  GetTransactionsInput,
  'before' | 'limit'
>;

export class GetTransactionAmountSummary {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(
    input: GetTransactionAmountSummaryInput,
  ): Promise<TransactionAmountSummary> {
    assertTransactionTagLimit(input.tagIds ?? []);
    return this.transactions.summarizeAmounts(input);
  }
}
