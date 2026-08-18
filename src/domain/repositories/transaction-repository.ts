import type { Transaction } from '@/domain/entities/transaction';

export type TransactionFilters = Readonly<{
  accountId?: string;
  categoryId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}>;

export interface TransactionRepository {
  findAll(filters?: TransactionFilters): Promise<readonly Transaction[]>;
  findByAccount(accountId: string): Promise<readonly Transaction[]>;
  findById(id: string): Promise<Transaction | null>;
  save(transaction: Transaction): Promise<void>;
  deleteById(id: string): Promise<void>;
}
