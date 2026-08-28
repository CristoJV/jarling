import type { SQLiteDatabase } from 'expo-sqlite';

import { SQLiteCategoryTargetSnoozeRepository } from './sqlite-category-target-snooze-repository';

function databaseMock() {
  const getAllAsync = jest.fn(async () => [
    { category_id: 'category-1', month: '2026-08' },
  ]);
  const getFirstAsync = jest.fn(async () => ({ found: 1 }));
  const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 }));
  return {
    database: {
      getAllAsync,
      getFirstAsync,
      runAsync,
    } as unknown as SQLiteDatabase,
    getAllAsync,
    getFirstAsync,
    runAsync,
  };
}

describe('SQLiteCategoryTargetSnoozeRepository', () => {
  it('reads the selected month and checks the composite identity', async () => {
    const { database, getAllAsync, getFirstAsync } = databaseMock();
    const repository = new SQLiteCategoryTargetSnoozeRepository(database);

    await expect(repository.findByMonth('2026-08')).resolves.toEqual([
      { categoryId: 'category-1', month: '2026-08' },
    ]);
    await expect(repository.exists('category-1', '2026-08')).resolves.toBe(
      true,
    );
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE month = ?'),
      '2026-08',
    );
    expect(getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('category_id = ? AND month = ?'),
      'category-1',
      '2026-08',
    );
  });

  it('uses an idempotent composite upsert and scoped deletes', async () => {
    const { database, runAsync } = databaseMock();
    const repository = new SQLiteCategoryTargetSnoozeRepository(database);
    await repository.save({ categoryId: 'category-1', month: '2026-08' });
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT(category_id, month) DO NOTHING'),
      'category-1',
      '2026-08',
    );
    await repository.delete('category-1', '2026-08');
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('category_id = ? AND month = ?'),
      'category-1',
      '2026-08',
    );
    await repository.deleteByCategory('category-1');
    expect(runAsync).toHaveBeenLastCalledWith(
      'DELETE FROM category_target_snoozes WHERE category_id = ?',
      'category-1',
    );
  });
});
