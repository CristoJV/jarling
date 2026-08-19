import type { TransactionRepository } from '@/domain/repositories/transaction-repository';

export class GetPayees {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(): Promise<readonly string[]> {
    return this.transactions.findDistinctPayees();
  }
}
