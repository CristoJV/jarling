import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category } from '@/domain/entities/category';
import type { CategoryGroup } from '@/domain/entities/category-group';

import {
  categoryGroupFromRow,
  type CategoryGroupRow,
  SQLiteCategoryGroupRepository,
} from './sqlite-category-group-repository';
import {
  categoryFromRow,
  type CategoryRow,
  SQLiteCategoryRepository,
} from './sqlite-category-repository';

function databaseMock(options?: {
  allRows?: readonly unknown[];
  firstRow?: unknown;
}) {
  const getAllAsync = jest.fn(
    async (_sql: string, ..._params: readonly unknown[]) => [
      ...(options?.allRows ?? []),
    ],
  );
  const getFirstAsync = jest.fn(
    async (_sql: string, ..._params: readonly unknown[]) =>
      options?.firstRow === undefined ? null : options.firstRow,
  );
  const runAsync = jest.fn(async (..._args: readonly unknown[]) => ({
    changes: 1,
    lastInsertRowId: 1,
  }));

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

const groupRow: CategoryGroupRow = {
  id: 'group-1',
  name: 'Needs',
  sort_order: 0,
  created_at: '2026-08-18T10:00:00.000Z',
  updated_at: '2026-08-18T10:00:00.000Z',
};

const group: CategoryGroup = {
  id: 'group-1',
  name: 'Needs',
  sortOrder: 0,
  createdAt: '2026-08-18T10:00:00.000Z',
  updatedAt: '2026-08-18T10:00:00.000Z',
};

const categoryRow: CategoryRow = {
  id: 'category-1',
  group_id: 'group-1',
  name: 'Rent',
  notes: 'Renews in January',
  linked_account_id: null,
  hidden: 1,
  sort_order: 0,
  created_at: '2026-08-18T10:00:00.000Z',
  updated_at: '2026-08-18T10:00:00.000Z',
};

const category: Category = {
  id: 'category-1',
  groupId: 'group-1',
  name: 'Rent',
  notes: 'Renews in January',
  hidden: true,
  sortOrder: 0,
  createdAt: '2026-08-18T10:00:00.000Z',
  updatedAt: '2026-08-18T10:00:00.000Z',
};

describe('SQLite category repositories', () => {
  it('maps category group rows', () => {
    expect(categoryGroupFromRow(groupRow)).toEqual(group);
  });

  it('reads and saves category groups using bound values', async () => {
    const { database, runAsync } = databaseMock({ allRows: [groupRow] });
    const repository = new SQLiteCategoryGroupRepository(database);

    await expect(repository.findAll()).resolves.toEqual([group]);
    await repository.save(group);

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO category_groups'),
      'group-1',
      'Needs',
      0,
      '2026-08-18T10:00:00.000Z',
      '2026-08-18T10:00:00.000Z',
    );
  });

  it('maps category row booleans into domain booleans', () => {
    expect(categoryFromRow(categoryRow)).toEqual(category);
  });

  it('reads categories by group and saves hidden state as an integer', async () => {
    const { database, getAllAsync, runAsync } = databaseMock({
      allRows: [categoryRow],
    });
    const repository = new SQLiteCategoryRepository(database);

    await expect(repository.findByGroup('group-1')).resolves.toEqual([
      category,
    ]);
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE group_id = ?'),
      'group-1',
    );
    await repository.save(category);

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO categories'),
      'category-1',
      'group-1',
      'Rent',
      'Renews in January',
      null,
      1,
      0,
      '2026-08-18T10:00:00.000Z',
      '2026-08-18T10:00:00.000Z',
    );
  });

  it('returns null when a category or group does not exist', async () => {
    const { database } = databaseMock();

    await expect(
      new SQLiteCategoryGroupRepository(database).findById('missing'),
    ).resolves.toBeNull();
    await expect(
      new SQLiteCategoryRepository(database).findById('missing'),
    ).resolves.toBeNull();
  });
});
