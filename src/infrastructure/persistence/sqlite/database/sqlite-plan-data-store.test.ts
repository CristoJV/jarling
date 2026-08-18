import type { SQLiteDatabase } from 'expo-sqlite';

import { SQLitePlanDataStore } from './sqlite-plan-data-store';

describe('SQLitePlanDataStore', () => {
  it('deletes dependent plan records in a single transaction', async () => {
    const executedSql: string[] = [];
    const execAsync = jest.fn(async (sql: string) => {
      executedSql.push(sql);
    });
    const withTransactionAsync = jest.fn(async (task: () => Promise<void>) =>
      task(),
    );
    const database = {
      execAsync,
      withTransactionAsync,
    } as unknown as SQLiteDatabase;

    await new SQLitePlanDataStore(database).deleteAll();

    expect(withTransactionAsync).toHaveBeenCalledTimes(1);
    const sql = executedSql[0] ?? '';
    expect(sql.indexOf('DELETE FROM transactions')).toBeLessThan(
      sql.indexOf('DELETE FROM accounts'),
    );
    expect(sql).toContain('DELETE FROM category_targets');
  });
});
