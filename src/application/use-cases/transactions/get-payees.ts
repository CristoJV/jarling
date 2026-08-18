import type { TransactionRepository } from '@/domain/repositories/transaction-repository';

export class GetPayees {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(): Promise<readonly string[]> {
    const transactions = await this.transactions.findAll();
    const payees = new Map<string, string>();
    for (const { payee, transactionGroupId } of transactions) {
      if (transactionGroupId) continue;
      const name = payee?.trim();
      if (name && !payees.has(name.toLocaleLowerCase())) {
        payees.set(name.toLocaleLowerCase(), name);
      }
    }
    return [...payees.values()].sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: 'base' }),
    );
  }
}
