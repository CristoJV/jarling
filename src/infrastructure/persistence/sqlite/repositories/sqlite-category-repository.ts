import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category } from '@/domain/entities/category';
import type { CategoryRepository } from '@/domain/repositories/category-repository';

export type CategoryRow = {
  id: string;
  group_id: string;
  name: string;
  notes: string | null;
  linked_account_id: string | null;
  hidden: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function categoryFromRow(row: CategoryRow): Category {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    ...(row.notes !== null ? { notes: row.notes } : {}),
    ...(row.linked_account_id !== null
      ? { linkedAccountId: row.linked_account_id }
      : {}),
    hidden: row.hidden === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SQLiteCategoryRepository implements CategoryRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async findAll(): Promise<readonly Category[]> {
    const rows = await this.database.getAllAsync<CategoryRow>(
      `SELECT id, group_id, name, notes, linked_account_id, hidden, sort_order, created_at, updated_at
       FROM categories
       ORDER BY group_id ASC, sort_order ASC`,
    );

    return rows.map(categoryFromRow);
  }

  async findByGroup(groupId: string): Promise<readonly Category[]> {
    const rows = await this.database.getAllAsync<CategoryRow>(
      `SELECT id, group_id, name, notes, linked_account_id, hidden, sort_order, created_at, updated_at
       FROM categories
       WHERE group_id = ?
       ORDER BY sort_order ASC`,
      groupId,
    );

    return rows.map(categoryFromRow);
  }

  async findById(id: string): Promise<Category | null> {
    const row = await this.database.getFirstAsync<CategoryRow>(
      `SELECT id, group_id, name, notes, linked_account_id, hidden, sort_order, created_at, updated_at
       FROM categories
       WHERE id = ?`,
      id,
    );

    return row ? categoryFromRow(row) : null;
  }

  async save(category: Category): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO categories (
         id, group_id, name, notes, linked_account_id, hidden, sort_order, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         group_id = excluded.group_id,
         name = excluded.name,
         notes = excluded.notes,
         linked_account_id = excluded.linked_account_id,
         hidden = excluded.hidden,
         sort_order = excluded.sort_order,
         updated_at = excluded.updated_at`,
      category.id,
      category.groupId,
      category.name,
      category.notes ?? null,
      category.linkedAccountId ?? null,
      category.hidden ? 1 : 0,
      category.sortOrder,
      category.createdAt,
      category.updatedAt,
    );
  }

  async deleteById(id: string): Promise<void> {
    await this.database.runAsync('DELETE FROM categories WHERE id = ?', id);
  }
}
