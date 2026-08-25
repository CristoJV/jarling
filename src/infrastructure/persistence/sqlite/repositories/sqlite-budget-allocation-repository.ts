import type { SQLiteDatabase } from 'expo-sqlite';

import type { BudgetAllocation } from '@/domain/entities/budget-allocation';
import type { BudgetAllocationRepository } from '@/domain/repositories/budget-allocation-repository';
import { Money } from '@/domain/value-objects/money';

export type BudgetAllocationRow = {
  id: string;
  category_id: string;
  month: string;
  amount: number;
  created_at: string;
  updated_at: string;
};

export function budgetAllocationFromRow(
  row: BudgetAllocationRow,
): BudgetAllocation {
  return {
    id: row.id,
    categoryId: row.category_id,
    month: row.month,
    amount: Money.fromCents(row.amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SQLiteBudgetAllocationRepository implements BudgetAllocationRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async findByCategoryAndMonth(
    categoryId: string,
    month: string,
  ): Promise<BudgetAllocation | null> {
    const row = await this.database.getFirstAsync<BudgetAllocationRow>(
      `SELECT id, category_id, month, amount, created_at, updated_at
       FROM budget_allocations
       WHERE category_id = ? AND month = ?`,
      categoryId,
      month,
    );

    return row ? budgetAllocationFromRow(row) : null;
  }

  async findThroughMonth(month: string): Promise<readonly BudgetAllocation[]> {
    const rows = await this.database.getAllAsync<BudgetAllocationRow>(
      `SELECT id, category_id, month, amount, created_at, updated_at
       FROM budget_allocations
       WHERE month <= ?
       ORDER BY month ASC, category_id ASC`,
      month,
    );

    return rows.map(budgetAllocationFromRow);
  }

  async findByCategory(
    categoryId: string,
  ): Promise<readonly BudgetAllocation[]> {
    const rows = await this.database.getAllAsync<BudgetAllocationRow>(
      `SELECT id, category_id, month, amount, created_at, updated_at
       FROM budget_allocations
       WHERE category_id = ?
       ORDER BY month ASC`,
      categoryId,
    );
    return rows.map(budgetAllocationFromRow);
  }

  async save(allocation: BudgetAllocation): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO budget_allocations (
         id, category_id, month, amount, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(category_id, month) DO UPDATE SET
         amount = excluded.amount,
         updated_at = excluded.updated_at`,
      allocation.id,
      allocation.categoryId,
      allocation.month,
      allocation.amount.cents,
      allocation.createdAt,
      allocation.updatedAt,
    );
  }

  async reassignCategory(
    sourceCategoryId: string,
    destinationCategoryId: string,
    updatedAt: string,
  ): Promise<void> {
    await this.database.runAsync(
      `UPDATE budget_allocations AS destination
       SET amount = amount + (
         SELECT source.amount
         FROM budget_allocations AS source
         WHERE source.category_id = ? AND source.month = destination.month
       ), updated_at = ?
       WHERE destination.category_id = ?
         AND EXISTS (
           SELECT 1 FROM budget_allocations AS source
           WHERE source.category_id = ? AND source.month = destination.month
         )`,
      sourceCategoryId,
      updatedAt,
      destinationCategoryId,
      sourceCategoryId,
    );
    await this.database.runAsync(
      `DELETE FROM budget_allocations
       WHERE category_id = ?
         AND EXISTS (
           SELECT 1 FROM budget_allocations AS destination
           WHERE destination.category_id = ?
             AND destination.month = budget_allocations.month
         )`,
      sourceCategoryId,
      destinationCategoryId,
    );
    await this.database.runAsync(
      `UPDATE budget_allocations
       SET category_id = ?, updated_at = ?
       WHERE category_id = ?`,
      destinationCategoryId,
      updatedAt,
      sourceCategoryId,
    );
  }

  async deleteByCategory(categoryId: string): Promise<void> {
    await this.database.runAsync(
      'DELETE FROM budget_allocations WHERE category_id = ?',
      categoryId,
    );
  }
}
