import type { SQLiteDatabase } from 'expo-sqlite';

import type { BudgetAllocation } from '@/domain/entities/budget-allocation';
import { Money } from '@/domain/value-objects/money';

import {
  budgetAllocationFromRow,
  type BudgetAllocationRow,
  SQLiteBudgetAllocationRepository,
} from './sqlite-budget-allocation-repository';

const row: BudgetAllocationRow = {
  id: 'allocation-1',
  category_id: 'category-1',
  month: '2026-08',
  amount: 40_000,
  created_at: '2026-08-01T10:00:00.000Z',
  updated_at: '2026-08-01T10:00:00.000Z',
};
const allocation: BudgetAllocation = {
  id: 'allocation-1',
  categoryId: 'category-1',
  month: '2026-08',
  amount: Money.fromCents(40_000),
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

function databaseMock(options?: {
  firstRow?: unknown;
  allRows?: readonly unknown[];
}) {
  const getFirstAsync = jest.fn(async () => options?.firstRow ?? null);
  const getAllAsync = jest.fn(async () => [...(options?.allRows ?? [])]);
  const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 }));

  return {
    database: {
      getFirstAsync,
      getAllAsync,
      runAsync,
    } as unknown as SQLiteDatabase,
    getFirstAsync,
    getAllAsync,
    runAsync,
  };
}

describe('SQLiteBudgetAllocationRepository', () => {
  it('maps integer cents into Money', () => {
    expect(budgetAllocationFromRow(row)).toEqual(allocation);
  });

  it('finds an allocation by its category and month', async () => {
    const { database, getFirstAsync } = databaseMock({ firstRow: row });
    const repository = new SQLiteBudgetAllocationRepository(database);

    await expect(
      repository.findByCategoryAndMonth('category-1', '2026-08'),
    ).resolves.toEqual(allocation);
    expect(getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE category_id = ? AND month = ?'),
      'category-1',
      '2026-08',
    );
  });

  it('loads history through a month and persists using a unique upsert', async () => {
    const { database, getAllAsync, runAsync } = databaseMock({
      allRows: [row],
    });
    const repository = new SQLiteBudgetAllocationRepository(database);

    await expect(repository.findThroughMonth('2026-08')).resolves.toEqual([
      allocation,
    ]);
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE month <= ?'),
      '2026-08',
    );
    await repository.save(allocation);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT(category_id, month)'),
      'allocation-1',
      'category-1',
      '2026-08',
      40_000,
      '2026-08-01T10:00:00.000Z',
      '2026-08-01T10:00:00.000Z',
    );
  });
});
