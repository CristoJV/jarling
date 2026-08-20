import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';

import type { TransactionSummary } from './get-transactions';

export class GetTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async execute(id: string): Promise<TransactionSummary | null> {
    const transaction = await this.transactions.findById(id);
    if (!transaction) return null;

    const [account, category] = await Promise.all([
      this.accounts.findById(transaction.accountId),
      transaction.categoryId
        ? this.categories.findById(transaction.categoryId)
        : null,
    ]);

    return {
      transaction,
      accountName: account?.name ?? 'Unknown account',
      ...(transaction.categoryId
        ? { categoryName: category?.name ?? 'Unknown category' }
        : {}),
    };
  }
}
