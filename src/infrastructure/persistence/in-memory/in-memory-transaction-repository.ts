import type { Transaction } from '@/domain/entities/transaction';
import type {
  TransactionFilters,
  TransactionRepository,
} from '@/domain/repositories/transaction-repository';

export class InMemoryTransactionRepository implements TransactionRepository {
  private readonly transactions = new Map<string, Transaction>();

  async findAll(
    filters: TransactionFilters = {},
  ): Promise<readonly Transaction[]> {
    const search = filters.search?.trim().toLocaleLowerCase();
    const payee = filters.payee?.trim().toLocaleLowerCase();
    const memo = filters.memo?.trim().toLocaleLowerCase();

    return [...this.transactions.values()]
      .filter(
        (transaction) =>
          !filters.accountId || transaction.accountId === filters.accountId,
      )
      .filter(
        (transaction) =>
          !payee || transaction.payee?.toLocaleLowerCase().includes(payee),
      )
      .filter(
        (transaction) =>
          !memo || transaction.notes?.toLocaleLowerCase().includes(memo),
      )
      .filter(
        (transaction) =>
          !filters.categoryId || transaction.categoryId === filters.categoryId,
      )
      .filter(
        (transaction) =>
          !filters.dateFrom || transaction.date >= filters.dateFrom,
      )
      .filter(
        (transaction) => !filters.dateTo || transaction.date <= filters.dateTo,
      )
      .filter(
        (transaction) =>
          !search ||
          transaction.payee?.toLocaleLowerCase().includes(search) ||
          transaction.notes?.toLocaleLowerCase().includes(search),
      )
      .sort(
        (left, right) =>
          right.date.localeCompare(left.date) ||
          right.createdAt.localeCompare(left.createdAt),
      );
  }

  async findByAccount(accountId: string): Promise<readonly Transaction[]> {
    return this.findAll({ accountId });
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.transactions.get(id) ?? null;
  }

  async findByGroup(groupId: string): Promise<readonly Transaction[]> {
    return [...this.transactions.values()].filter(
      ({ transactionGroupId }) => transactionGroupId === groupId,
    );
  }

  async save(transaction: Transaction): Promise<void> {
    this.transactions.set(transaction.id, transaction);
  }

  async deleteById(id: string): Promise<void> {
    this.transactions.delete(id);
  }

  async deleteByGroup(groupId: string): Promise<void> {
    for (const transaction of await this.findByGroup(groupId)) {
      this.transactions.delete(transaction.id);
    }
  }
}
