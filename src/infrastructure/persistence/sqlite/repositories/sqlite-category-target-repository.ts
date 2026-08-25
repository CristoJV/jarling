import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createCategoryTarget,
  type CategoryTarget,
  type CustomFundingMode,
  type IsoDayOfWeek,
  type TargetKind,
  type RecurringFundingMode,
} from '@/domain/entities/category-target';
import type { CategoryTargetRepository } from '@/domain/repositories/category-target-repository';
import { Money } from '@/domain/value-objects/money';

export type CategoryTargetRow = {
  id: string;
  category_id: string;
  kind: TargetKind;
  amount: number;
  starts_on: string;
  day_of_week: number | null;
  include_previous_weeks: number | null;
  funding_mode: RecurringFundingMode | null;
  day_of_month: number | null;
  target_date: string | null;
  custom_funding_mode: CustomFundingMode | null;
  created_at: string;
  updated_at: string;
};

export function categoryTargetFromRow(row: CategoryTargetRow): CategoryTarget {
  return createCategoryTarget({
    id: row.id,
    categoryId: row.category_id,
    kind: row.kind,
    amount: Money.fromCents(row.amount),
    startsOn: row.starts_on,
    ...(row.day_of_week !== null
      ? { dayOfWeek: row.day_of_week as IsoDayOfWeek }
      : {}),
    ...(row.include_previous_weeks !== null
      ? { includePreviousWeeks: row.include_previous_weeks === 1 }
      : {}),
    ...(row.funding_mode !== null ? { fundingMode: row.funding_mode } : {}),
    ...(row.day_of_month !== null ? { dayOfMonth: row.day_of_month } : {}),
    ...(row.target_date !== null ? { targetDate: row.target_date } : {}),
    ...(row.custom_funding_mode !== null
      ? { customFundingMode: row.custom_funding_mode }
      : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

const columns = `
  id, category_id, kind, amount, starts_on, day_of_week, include_previous_weeks, funding_mode,
  day_of_month, target_date, custom_funding_mode, created_at, updated_at
`;

export class SQLiteCategoryTargetRepository implements CategoryTargetRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async findAll(): Promise<readonly CategoryTarget[]> {
    const rows = await this.database.getAllAsync<CategoryTargetRow>(
      `SELECT ${columns} FROM category_targets ORDER BY category_id ASC`,
    );
    return rows.map(categoryTargetFromRow);
  }

  async findByCategory(categoryId: string): Promise<CategoryTarget | null> {
    const row = await this.database.getFirstAsync<CategoryTargetRow>(
      `SELECT ${columns} FROM category_targets WHERE category_id = ?`,
      categoryId,
    );
    return row ? categoryTargetFromRow(row) : null;
  }

  async save(target: CategoryTarget): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO category_targets (
         id, category_id, kind, amount, starts_on, day_of_week, include_previous_weeks, funding_mode,
         day_of_month, target_date, custom_funding_mode, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(category_id) DO UPDATE SET
         kind = excluded.kind,
         amount = excluded.amount,
         starts_on = excluded.starts_on,
         day_of_week = excluded.day_of_week,
         include_previous_weeks = excluded.include_previous_weeks,
         funding_mode = excluded.funding_mode,
         day_of_month = excluded.day_of_month,
         target_date = excluded.target_date,
         custom_funding_mode = excluded.custom_funding_mode,
         updated_at = excluded.updated_at`,
      target.id,
      target.categoryId,
      target.kind,
      target.amount.cents,
      target.startsOn,
      target.dayOfWeek ?? null,
      target.includePreviousWeeks === undefined
        ? null
        : Number(target.includePreviousWeeks),
      target.fundingMode ?? null,
      target.dayOfMonth ?? null,
      target.targetDate ?? null,
      target.customFundingMode ?? null,
      target.createdAt,
      target.updatedAt,
    );
  }

  async deleteByCategory(categoryId: string): Promise<void> {
    await this.database.runAsync(
      'DELETE FROM category_targets WHERE category_id = ?',
      categoryId,
    );
  }
}
