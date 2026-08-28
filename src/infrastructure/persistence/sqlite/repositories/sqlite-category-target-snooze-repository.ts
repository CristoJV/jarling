import type { SQLiteDatabase } from 'expo-sqlite';

import { createCategoryTargetSnooze } from '@/domain/entities/category-target-snooze';
import type { CategoryTargetSnoozeRepository } from '@/domain/repositories/category-target-snooze-repository';

type CategoryTargetSnoozeRow = Readonly<{
  category_id: string;
  month: string;
}>;

export class SQLiteCategoryTargetSnoozeRepository implements CategoryTargetSnoozeRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async findByMonth(month: string) {
    const rows = await this.database.getAllAsync<CategoryTargetSnoozeRow>(
      `SELECT category_id, month
       FROM category_target_snoozes
       WHERE month = ?
       ORDER BY category_id ASC`,
      month,
    );
    return rows.map((row) =>
      createCategoryTargetSnooze({
        categoryId: row.category_id,
        month: row.month,
      }),
    );
  }

  async exists(categoryId: string, month: string): Promise<boolean> {
    const row = await this.database.getFirstAsync<{ found: number }>(
      `SELECT 1 AS found
       FROM category_target_snoozes
       WHERE category_id = ? AND month = ?`,
      categoryId,
      month,
    );
    return row?.found === 1;
  }

  async save(snooze: Readonly<{ categoryId: string; month: string }>) {
    await this.database.runAsync(
      `INSERT INTO category_target_snoozes (category_id, month)
       VALUES (?, ?)
       ON CONFLICT(category_id, month) DO NOTHING`,
      snooze.categoryId,
      snooze.month,
    );
  }

  async delete(categoryId: string, month: string): Promise<void> {
    await this.database.runAsync(
      `DELETE FROM category_target_snoozes
       WHERE category_id = ? AND month = ?`,
      categoryId,
      month,
    );
  }

  async deleteByCategory(categoryId: string): Promise<void> {
    await this.database.runAsync(
      'DELETE FROM category_target_snoozes WHERE category_id = ?',
      categoryId,
    );
  }
}
