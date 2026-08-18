import type { SQLiteDatabase } from 'expo-sqlite';

import type { CategoryGroup } from '@/domain/entities/category-group';
import type { CategoryGroupRepository } from '@/domain/repositories/category-group-repository';

export type CategoryGroupRow = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function categoryGroupFromRow(row: CategoryGroupRow): CategoryGroup {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SQLiteCategoryGroupRepository implements CategoryGroupRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async findAll(): Promise<readonly CategoryGroup[]> {
    const rows = await this.database.getAllAsync<CategoryGroupRow>(
      `SELECT id, name, sort_order, created_at, updated_at
       FROM category_groups
       ORDER BY sort_order ASC`,
    );

    return rows.map(categoryGroupFromRow);
  }

  async findById(id: string): Promise<CategoryGroup | null> {
    const row = await this.database.getFirstAsync<CategoryGroupRow>(
      `SELECT id, name, sort_order, created_at, updated_at
       FROM category_groups
       WHERE id = ?`,
      id,
    );

    return row ? categoryGroupFromRow(row) : null;
  }

  async save(group: CategoryGroup): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO category_groups (
         id, name, sort_order, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         sort_order = excluded.sort_order,
         updated_at = excluded.updated_at`,
      group.id,
      group.name,
      group.sortOrder,
      group.createdAt,
      group.updatedAt,
    );
  }
}
