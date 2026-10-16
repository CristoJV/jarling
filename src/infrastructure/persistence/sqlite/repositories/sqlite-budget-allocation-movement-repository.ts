import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  BudgetAllocationMovement,
  BudgetAllocationMovementProvenance,
} from '@/domain/entities/budget-allocation-movement';
import type { BudgetAllocationMovementRepository } from '@/domain/repositories/budget-allocation-movement-repository';
import { Money } from '@/domain/value-objects/money';

export type BudgetAllocationMovementRow = {
  id: string;
  month: string;
  amount: number;
  source_category_id: string | null;
  destination_category_id: string | null;
  occurred_at: string | null;
  occurred_on: string | null;
  provenance: BudgetAllocationMovementProvenance;
  recorded_at: string;
};

function movementFromRow(
  row: BudgetAllocationMovementRow,
): BudgetAllocationMovement {
  return {
    id: row.id,
    month: row.month,
    amount: Money.fromCents(row.amount),
    ...(row.source_category_id
      ? { sourceCategoryId: row.source_category_id }
      : {}),
    ...(row.destination_category_id
      ? { destinationCategoryId: row.destination_category_id }
      : {}),
    ...(row.occurred_at ? { occurredAt: row.occurred_at } : {}),
    ...(row.occurred_on ? { occurredOn: row.occurred_on } : {}),
    provenance: row.provenance,
    recordedAt: row.recorded_at,
  };
}

export class SQLiteBudgetAllocationMovementRepository implements BudgetAllocationMovementRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async findByCategoryAndMonth(
    categoryId: string,
    month: string,
  ): Promise<readonly BudgetAllocationMovement[]> {
    const rows = await this.database.getAllAsync<BudgetAllocationMovementRow>(
      `SELECT id, month, amount, source_category_id, destination_category_id,
              occurred_at, occurred_on, provenance, recorded_at
       FROM budget_allocation_movements
       WHERE month = ?
         AND (source_category_id = ? OR destination_category_id = ?)
       ORDER BY occurred_at ASC, id ASC`,
      month,
      categoryId,
      categoryId,
    );
    return rows.map(movementFromRow);
  }

  async save(movement: BudgetAllocationMovement): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO budget_allocation_movements (
         id, month, amount, source_category_id, destination_category_id,
         occurred_at, occurred_on, provenance, recorded_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      movement.id,
      movement.month,
      movement.amount.cents,
      movement.sourceCategoryId ?? null,
      movement.destinationCategoryId ?? null,
      movement.occurredAt ?? null,
      movement.occurredOn ?? null,
      movement.provenance,
      movement.recordedAt,
    );
  }

  async replaceCategory(
    sourceCategoryId: string,
    destinationCategoryId?: string,
  ): Promise<void> {
    const destination = destinationCategoryId ?? null;
    await this.database.runAsync(
      `DELETE FROM budget_allocation_movements
       WHERE (source_category_id = ? AND destination_category_id IS ?)
          OR (source_category_id IS ? AND destination_category_id = ?)`,
      sourceCategoryId,
      destination,
      destination,
      sourceCategoryId,
    );
    await this.database.runAsync(
      `UPDATE budget_allocation_movements
       SET source_category_id = ?
       WHERE source_category_id = ?`,
      destination,
      sourceCategoryId,
    );
    await this.database.runAsync(
      `UPDATE budget_allocation_movements
       SET destination_category_id = ?
       WHERE destination_category_id = ?`,
      destination,
      sourceCategoryId,
    );
  }
}
