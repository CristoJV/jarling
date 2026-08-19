import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import type {
  Transaction,
  TransactionKind,
  TransactionStatus,
} from '@/domain/entities/transaction';
import type {
  TransactionFilters,
  TransactionRepository,
} from '@/domain/repositories/transaction-repository';
import { Money } from '@/domain/value-objects/money';

export type TransactionRow = {
  id: string;
  account_id: string;
  category_id: string | null;
  payee: string | null;
  amount: number;
  date: string;
  notes: string | null;
  status: TransactionStatus;
  kind: TransactionKind;
  transaction_group_id: string | null;
  created_at: string;
  updated_at: string;
};

export function transactionFromRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    ...(row.category_id ? { categoryId: row.category_id } : {}),
    ...(row.payee ? { payee: row.payee } : {}),
    amount: Money.fromCents(row.amount),
    date: row.date,
    ...(row.notes ? { notes: row.notes } : {}),
    status: row.status,
    kind: row.kind,
    ...(row.transaction_group_id
      ? { transactionGroupId: row.transaction_group_id }
      : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SQLiteTransactionRepository implements TransactionRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async findAll(
    filters: TransactionFilters = {},
  ): Promise<readonly Transaction[]> {
    const conditions: string[] = [];
    const values: SQLiteBindValue[] = [];

    if (filters.accountId) {
      conditions.push('account_id = ?');
      values.push(filters.accountId);
    }

    if (filters.categoryId) {
      conditions.push('category_id = ?');
      values.push(filters.categoryId);
    }

    if (filters.dateFrom) {
      conditions.push('date >= ?');
      values.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      conditions.push('date <= ?');
      values.push(filters.dateTo);
    }

    if (filters.transactionGroupId) {
      conditions.push('transaction_group_id = ?');
      values.push(filters.transactionGroupId);
    }

    const search = filters.search?.trim().toLocaleLowerCase();
    if (search) {
      conditions.push(
        "(lower(coalesce(payee, '')) LIKE ? OR lower(coalesce(notes, '')) LIKE ?)",
      );
      values.push(`%${search}%`, `%${search}%`);
    }

    const payee = filters.payee?.trim().toLocaleLowerCase();
    if (payee) {
      conditions.push("lower(coalesce(payee, '')) LIKE ?");
      values.push(`%${payee}%`);
    }

    const memo = filters.memo?.trim().toLocaleLowerCase();
    if (memo) {
      conditions.push("lower(coalesce(notes, '')) LIKE ?");
      values.push(`%${memo}%`);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit
      ? Math.min(200, Math.max(1, Math.trunc(filters.limit)))
      : undefined;
    const offset = Math.max(0, Math.trunc(filters.offset ?? 0));
    const pagination = limit !== undefined ? 'LIMIT ? OFFSET ?' : '';
    if (limit !== undefined) values.push(limit, offset);
    const rows = await this.database.getAllAsync<TransactionRow>(
      `SELECT
         id, account_id, category_id, payee, amount, date, notes, status,
         kind, transaction_group_id, created_at, updated_at
       FROM transactions
       ${where}
       ORDER BY date DESC, created_at DESC
       ${pagination}`,
      ...values,
    );

    return rows.map(transactionFromRow);
  }

  async findByAccount(accountId: string): Promise<readonly Transaction[]> {
    return this.findAll({ accountId });
  }

  async findById(id: string): Promise<Transaction | null> {
    const row = await this.database.getFirstAsync<TransactionRow>(
      `SELECT
         id, account_id, category_id, payee, amount, date, notes, status,
         kind, transaction_group_id, created_at, updated_at
       FROM transactions
       WHERE id = ?`,
      id,
    );

    return row ? transactionFromRow(row) : null;
  }

  async findByGroup(groupId: string): Promise<readonly Transaction[]> {
    return this.findAll({ transactionGroupId: groupId });
  }

  async findDistinctPayees(): Promise<readonly string[]> {
    const rows = await this.database.getAllAsync<{ payee: string }>(
      `SELECT trim(candidate.payee) AS payee
       FROM transactions AS candidate
       WHERE candidate.payee IS NOT NULL
         AND length(trim(candidate.payee)) > 0
         AND candidate.transaction_group_id IS NULL
         AND candidate.kind = 'standard'
         AND candidate.id = (
           SELECT first.id
           FROM transactions AS first
           WHERE lower(trim(first.payee)) = lower(trim(candidate.payee))
             AND first.transaction_group_id IS NULL
             AND first.kind = 'standard'
           ORDER BY first.created_at ASC, first.id ASC
           LIMIT 1
         )
       ORDER BY payee COLLATE NOCASE ASC`,
    );
    return rows.map(({ payee }) => payee);
  }

  async save(transaction: Transaction): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO transactions (
         id, account_id, category_id, payee, amount, date, notes, status,
         kind, transaction_group_id, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         account_id = excluded.account_id,
         category_id = excluded.category_id,
         payee = excluded.payee,
         amount = excluded.amount,
         date = excluded.date,
         notes = excluded.notes,
         status = excluded.status,
         kind = excluded.kind,
         transaction_group_id = excluded.transaction_group_id,
         updated_at = excluded.updated_at`,
      transaction.id,
      transaction.accountId,
      transaction.categoryId ?? null,
      transaction.payee ?? null,
      transaction.amount.cents,
      transaction.date,
      transaction.notes ?? null,
      transaction.status,
      transaction.kind,
      transaction.transactionGroupId ?? null,
      transaction.createdAt,
      transaction.updatedAt,
    );
  }

  async deleteById(id: string): Promise<void> {
    await this.database.runAsync('DELETE FROM transactions WHERE id = ?', id);
  }

  async deleteByGroup(groupId: string): Promise<void> {
    await this.database.runAsync(
      'DELETE FROM transactions WHERE transaction_group_id = ?',
      groupId,
    );
  }
}
