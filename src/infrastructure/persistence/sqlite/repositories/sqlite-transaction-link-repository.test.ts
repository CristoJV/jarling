import type { SQLiteDatabase } from 'expo-sqlite';

import { SQLiteTransactionLinkRepository } from './sqlite-transaction-link-repository';

describe('SQLiteTransactionLinkRepository', () => {
  it('reads, saves and deletes links with bound parameters', async () => {
    const row = {
      id: 'link-1',
      source_transaction_id: 'transaction-a',
      target_transaction_id: 'transaction-b',
      link_type: 'bizum',
      created_at: '2026-08-19T10:00:00.000Z',
    } as const;
    const getAllAsync = jest.fn(async () => [row]);
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const repository = new SQLiteTransactionLinkRepository({
      getAllAsync,
      runAsync,
    } as unknown as SQLiteDatabase);

    const links = await repository.findByTransaction('transaction-a');
    expect(links).toEqual([
      {
        id: 'link-1',
        sourceTransactionId: 'transaction-a',
        targetTransactionId: 'transaction-b',
        type: 'bizum',
        createdAt: '2026-08-19T10:00:00.000Z',
      },
    ]);
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('source_transaction_id = ?'),
      'transaction-a',
      'transaction-a',
    );
    await repository.save(links[0]!);
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO transaction_links'),
      'link-1',
      'transaction-a',
      'transaction-b',
      'bizum',
      '2026-08-19T10:00:00.000Z',
    );
    await repository.delete('link-1');
    expect(runAsync).toHaveBeenLastCalledWith(
      'DELETE FROM transaction_links WHERE id = ?',
      'link-1',
    );
  });
});
