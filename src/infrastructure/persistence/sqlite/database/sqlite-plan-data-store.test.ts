import type { SQLiteDatabase } from 'expo-sqlite';

import { SQLitePlanDataStore } from './sqlite-plan-data-store';

describe('SQLitePlanDataStore', () => {
  it('deletes dependent plan records in foreign-key order', async () => {
    const executedSql: string[] = [];
    const execAsync = jest.fn(async (sql: string) => {
      executedSql.push(sql);
    });
    const database = { execAsync } as unknown as SQLiteDatabase;

    await new SQLitePlanDataStore(database).deleteAll();

    expect(execAsync).toHaveBeenCalledTimes(1);
    const sql = executedSql[0] ?? '';
    expect(sql.indexOf('DELETE FROM transactions')).toBeLessThan(
      sql.indexOf('DELETE FROM accounts'),
    );
    expect(sql).toContain('DELETE FROM category_targets');
    expect(sql).toContain('DELETE FROM category_target_snoozes');
    expect(sql).toContain('DELETE FROM transaction_links');
  });
});
