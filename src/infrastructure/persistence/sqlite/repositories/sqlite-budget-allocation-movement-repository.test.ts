import type { SQLiteDatabase } from 'expo-sqlite';

import type { BudgetAllocationMovement } from '@/domain/entities/budget-allocation-movement';
import { Money } from '@/domain/value-objects/money';

import { SQLiteBudgetAllocationMovementRepository } from './sqlite-budget-allocation-movement-repository';

const movement: BudgetAllocationMovement = {
  id: 'movement-1',
  month: '2026-08',
  amount: Money.fromCents(2_000),
  sourceCategoryId: 'source',
  destinationCategoryId: 'destination',
  occurredAt: '2026-08-18T12:00:00.000Z',
  occurredOn: '2026-08-18',
  provenance: 'recorded',
  recordedAt: '2026-08-18T12:00:00.000Z',
};

function databaseMock() {
  const getAllAsync = jest.fn(async () => [
    {
      id: 'movement-1',
      month: '2026-08',
      amount: 2_000,
      source_category_id: 'source',
      destination_category_id: 'destination',
      occurred_at: '2026-08-18T12:00:00.000Z',
      occurred_on: '2026-08-18',
      provenance: 'recorded',
      recorded_at: '2026-08-18T12:00:00.000Z',
    },
  ]);
  const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 }));
  return {
    database: { getAllAsync, runAsync } as unknown as SQLiteDatabase,
    getAllAsync,
    runAsync,
  };
}

describe('SQLiteBudgetAllocationMovementRepository', () => {
  it('loads and saves a complete category-to-category movement', async () => {
    const { database, getAllAsync, runAsync } = databaseMock();
    const repository = new SQLiteBudgetAllocationMovementRepository(database);

    await expect(
      repository.findByCategoryAndMonth('source', '2026-08'),
    ).resolves.toEqual([movement]);
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining(
        'source_category_id = ? OR destination_category_id = ?',
      ),
      '2026-08',
      'source',
      'source',
    );

    await repository.save(movement);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO budget_allocation_movements'),
      'movement-1',
      '2026-08',
      2_000,
      'source',
      'destination',
      '2026-08-18T12:00:00.000Z',
      '2026-08-18',
      'recorded',
      '2026-08-18T12:00:00.000Z',
    );
  });

  it('removes collapsed movements before replacing both endpoints', async () => {
    const { database, runAsync } = databaseMock();
    const repository = new SQLiteBudgetAllocationMovementRepository(database);

    await repository.replaceCategory('source', 'destination');

    expect(runAsync).toHaveBeenCalledTimes(3);
    expect(runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('DELETE FROM budget_allocation_movements'),
      'source',
      'destination',
      'destination',
      'source',
    );
    expect(runAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('SET source_category_id = ?'),
      'destination',
      'source',
    );
    expect(runAsync).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('SET destination_category_id = ?'),
      'destination',
      'source',
    );
  });
});
