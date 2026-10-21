import type { SQLiteDatabase } from 'expo-sqlite';

import { SQLiteTagRepository } from './sqlite-tag-repository';

describe('SQLiteTagRepository', () => {
  it('keeps unchanged associations and diffs added and removed tags', async () => {
    const getAllAsync = jest
      .fn()
      .mockResolvedValueOnce([{ tag_id: 'keep' }, { tag_id: 'remove' }]);
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 }));
    const database = { getAllAsync, runAsync } as unknown as SQLiteDatabase;
    const repository = new SQLiteTagRepository(database);

    await repository.replaceTransactionTags(
      ['transaction-1'],
      ['keep', 'add'],
      '2026-10-16T10:00:00.000Z',
    );

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM transaction_tags'),
      'transaction-1',
      'remove',
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO transaction_tags'),
      'transaction-1',
      'add',
      '2026-10-16T10:00:00.000Z',
    );
    expect(runAsync).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO transaction_tags'),
      'transaction-1',
      'keep',
      expect.anything(),
    );
  });

  it('orders recent tags by association recency with a bounded limit', async () => {
    const getAllAsync = jest.fn(async () => []);
    const database = { getAllAsync } as unknown as SQLiteDatabase;

    await new SQLiteTagRepository(database).findRecent(3);

    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('max(tt.attached_at)'),
      3,
    );
  });

  it('rejects more than 20 associations before issuing SQL', async () => {
    const getAllAsync = jest.fn(async () => []);
    const runAsync = jest.fn();
    const database = { getAllAsync, runAsync } as unknown as SQLiteDatabase;

    await expect(
      new SQLiteTagRepository(database).replaceTransactionTags(
        ['transaction-1'],
        Array.from({ length: 21 }, (_, index) => `tag-${index}`),
        '2026-10-21T10:00:00.000Z',
      ),
    ).rejects.toThrow('more than 20 tags');
    expect(getAllAsync).not.toHaveBeenCalled();
    expect(runAsync).not.toHaveBeenCalled();
  });
});
