import {
  updateTransaction,
  type Transaction,
} from '@/domain/entities/transaction';
import type {
  TransactionFilters,
  TransactionRepository,
} from '@/domain/repositories/transaction-repository';
import { Money } from '@/domain/value-objects/money';

export class InMemoryTransactionRepository implements TransactionRepository {
  private readonly transactions = new Map<string, Transaction>();

  async findAll(
    filters: TransactionFilters = {},
  ): Promise<readonly Transaction[]> {
    const search = filters.search?.trim().toLocaleLowerCase();
    const payee = filters.payee?.trim().toLocaleLowerCase();
    const memo = filters.memo?.trim().toLocaleLowerCase();

    const matching = [...this.transactions.values()]
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
          !filters.status || transaction.status === filters.status,
      )
      .filter(
        (transaction) =>
          !filters.uncategorized ||
          (transaction.kind === 'standard' &&
            transaction.amount.cents < 0 &&
            !transaction.categoryId),
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
          !filters.transactionGroupId ||
          transaction.transactionGroupId === filters.transactionGroupId,
      )
      .filter(
        (transaction) =>
          !search ||
          transaction.payee?.toLocaleLowerCase().includes(search) ||
          transaction.notes?.toLocaleLowerCase().includes(search),
      )
      .filter((transaction) => {
        if (!filters.before) return true;
        return (
          transaction.date < filters.before.date ||
          (transaction.date === filters.before.date &&
            transaction.createdAt < filters.before.createdAt) ||
          (transaction.date === filters.before.date &&
            transaction.createdAt === filters.before.createdAt &&
            transaction.id < filters.before.id)
        );
      })
      .sort(
        (left, right) =>
          right.date.localeCompare(left.date) ||
          right.createdAt.localeCompare(left.createdAt) ||
          right.id.localeCompare(left.id),
      );
    return filters.limit
      ? matching.slice(0, Math.max(1, Math.trunc(filters.limit)))
      : matching;
  }

  async findByAccount(accountId: string): Promise<readonly Transaction[]> {
    return this.findAll({ accountId });
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.transactions.get(id) ?? null;
  }

  async findByGroup(groupId: string): Promise<readonly Transaction[]> {
    return this.findAll({ transactionGroupId: groupId });
  }

  async findDistinctPayees(): Promise<readonly string[]> {
    const payees = new Map<string, string>();
    for (const {
      payee,
      transactionGroupId,
      kind,
    } of this.transactions.values()) {
      const normalized = payee?.trim();
      if (normalized && !transactionGroupId && kind === 'standard') {
        const key = normalized.toLocaleLowerCase();
        if (!payees.has(key)) payees.set(key, normalized);
      }
    }
    return [...payees.values()].sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: 'base' }),
    );
  }

  async findBalancesByAccount(): Promise<ReadonlyMap<string, Money>> {
    const cents = new Map<string, number>();
    for (const transaction of this.transactions.values()) {
      cents.set(
        transaction.accountId,
        (cents.get(transaction.accountId) ?? 0) + transaction.amount.cents,
      );
    }
    return new Map(
      [...cents].map(([accountId, balance]) => [
        accountId,
        Money.fromCents(balance),
      ]),
    );
  }

  async save(transaction: Transaction): Promise<void> {
    this.transactions.set(transaction.id, transaction);
  }

  async reassignCategory(
    sourceCategoryId: string,
    destinationCategoryId: string,
    updatedAt: string,
  ): Promise<void> {
    for (const transaction of await this.findAll({
      categoryId: sourceCategoryId,
    })) {
      this.transactions.set(
        transaction.id,
        updateTransaction(transaction, {
          ...transaction,
          categoryId: destinationCategoryId,
          updatedAt,
        }),
      );
    }
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
