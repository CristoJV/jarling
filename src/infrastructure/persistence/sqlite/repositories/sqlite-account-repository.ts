import type { SQLiteDatabase } from 'expo-sqlite';

import type { Account, AccountType } from '@/domain/entities/account';
import type { AccountRepository } from '@/domain/repositories/account-repository';

export type AccountRow = {
  id: string;
  name: string;
  type: AccountType;
  on_budget: number;
  closed: number;
  created_at: string;
  updated_at: string;
};

export function accountFromRow(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    onBudget: row.on_budget === 1,
    closed: row.closed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SQLiteAccountRepository implements AccountRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async findAll(): Promise<readonly Account[]> {
    const rows = await this.database.getAllAsync<AccountRow>(
      `SELECT id, name, type, on_budget, closed, created_at, updated_at
       FROM accounts
       ORDER BY closed ASC, created_at ASC`,
    );

    return rows.map(accountFromRow);
  }

  async findById(id: string): Promise<Account | null> {
    const row = await this.database.getFirstAsync<AccountRow>(
      `SELECT id, name, type, on_budget, closed, created_at, updated_at
       FROM accounts
       WHERE id = ?`,
      id,
    );

    return row ? accountFromRow(row) : null;
  }

  async save(account: Account): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO accounts (
         id, name, type, on_budget, closed, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         type = excluded.type,
         on_budget = excluded.on_budget,
         closed = excluded.closed,
         updated_at = excluded.updated_at`,
      account.id,
      account.name,
      account.type,
      account.onBudget ? 1 : 0,
      account.closed ? 1 : 0,
      account.createdAt,
      account.updatedAt,
    );
  }
}
