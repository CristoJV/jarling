import type { SQLiteDatabase } from 'expo-sqlite';

import type { CategoryTarget } from '@/domain/entities/category-target';
import { Money } from '@/domain/value-objects/money';

import {
  categoryTargetFromRow,
  type CategoryTargetRow,
  SQLiteCategoryTargetRepository,
} from './sqlite-category-target-repository';

const row: CategoryTargetRow = {
  id: 'target-1',
  category_id: 'category-1',
  kind: 'weekly',
  amount: 10_000,
  starts_on: '2026-08-18',
  day_of_week: 6,
  include_previous_weeks: 0,
  funding_mode: 'set_aside',
  day_of_month: null,
  target_date: null,
  custom_funding_mode: null,
  created_at: '2026-08-18T10:00:00.000Z',
  updated_at: '2026-08-18T10:00:00.000Z',
};
const target: CategoryTarget = {
  id: 'target-1',
  categoryId: 'category-1',
  kind: 'weekly',
  amount: Money.fromCents(10_000),
  startsOn: '2026-08-18',
  dayOfWeek: 6,
  includePreviousWeeks: false,
  fundingMode: 'set_aside',
  createdAt: '2026-08-18T10:00:00.000Z',
  updatedAt: '2026-08-18T10:00:00.000Z',
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

describe('SQLiteCategoryTargetRepository', () => {
  it('maps nullable fields and integer cents', () => {
    expect(categoryTargetFromRow(row)).toEqual(target);
  });

  it('gets all targets and one target by category', async () => {
    const { database, getAllAsync, getFirstAsync } = databaseMock({
      allRows: [row],
      firstRow: row,
    });
    const repository = new SQLiteCategoryTargetRepository(database);

    await expect(repository.findAll()).resolves.toEqual([target]);
    await expect(repository.findByCategory('category-1')).resolves.toEqual(
      target,
    );
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY category_id ASC'),
    );
    expect(getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE category_id = ?'),
      'category-1',
    );
  });

  it('upserts and deletes by the category uniqueness boundary', async () => {
    const { database, runAsync } = databaseMock();
    const repository = new SQLiteCategoryTargetRepository(database);

    await repository.save(target);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT(category_id)'),
      'target-1',
      'category-1',
      'weekly',
      10_000,
      '2026-08-18',
      6,
      0,
      'set_aside',
      null,
      null,
      null,
      target.createdAt,
      target.updatedAt,
    );

    await repository.deleteByCategory('category-1');
    expect(runAsync).toHaveBeenLastCalledWith(
      'DELETE FROM category_targets WHERE category_id = ?',
      'category-1',
    );
  });
});
