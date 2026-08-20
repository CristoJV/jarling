import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import type {
  Transaction,
  TransactionKind,
  TransactionStatus,
} from '@/domain/entities/transaction';
import { createTransaction } from '@/domain/entities/transaction';
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
  const base = {
    id: row.id,
    accountId: row.account_id,
    ...(row.category_id ? { categoryId: row.category_id } : {}),
    ...(row.payee ? { payee: row.payee } : {}),
    amount: Money.fromCents(row.amount),
    date: row.date,
    ...(row.notes ? { notes: row.notes } : {}),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.kind === 'transfer') {
    if (!row.transaction_group_id) {
      throw new Error('Stored transfer is missing its group identifier.');
    }
    return createTransaction({
      ...base,
      kind: 'transfer',
      transactionGroupId: row.transaction_group_id,
    });
  }
  if (row.transaction_group_id) {
    throw new Error('Stored non-transfer unexpectedly owns a transfer group.');
  }
  return createTransaction({ ...base, kind: row.kind });
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

    if (filters.before) {
      conditions.push(`(
        date < ? OR
        (date = ? AND created_at < ?) OR
        (date = ? AND created_at = ? AND id < ?)
      )`);
      values.push(
        filters.before.date,
        filters.before.date,
        filters.before.createdAt,
        filters.before.date,
        filters.before.createdAt,
        filters.before.id,
      );
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
    const pagination = limit !== undefined ? 'LIMIT ?' : '';
    if (limit !== undefined) values.push(limit);
    const rows = await this.database.getAllAsync<TransactionRow>(
      `SELECT
         id, account_id, category_id, payee, amount, date, notes, status,
         kind, transaction_group_id, created_at, updated_at
       FROM transactions
       ${where}
       ORDER BY date DESC, created_at DESC, id DESC
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

  async findBalancesByAccount(): Promise<ReadonlyMap<string, Money>> {
    const rows = await this.database.getAllAsync<{
      account_id: string;
      balance: number;
    }>(
      `SELECT account_id, coalesce(sum(amount), 0) AS balance
       FROM transactions
       GROUP BY account_id`,
    );
    return new Map(
      rows.map(({ account_id, balance }) => [
        account_id,
        Money.fromCents(balance),
      ]),
    );
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
