import type { SQLiteDatabase } from 'expo-sqlite';

import { ExpoMigrationStore } from './expo-migration-store';
import type { Migration } from '../migrations/migration';

function createDatabaseMock(appliedVersions: readonly number[] = []) {
  const execAsync = jest.fn(async (_sql: string) => undefined);
  const transactionExecAsync = jest.fn(async (_sql: string) => undefined);
  const getAllAsync = jest.fn(async (_sql: string) =>
    appliedVersions.map((version) => ({ version })),
  );
  const runAsync = jest.fn(async (..._args: readonly unknown[]) => ({
    changes: 1,
    lastInsertRowId: 1,
  }));
  const transactionRunAsync = jest.fn(async (..._args: readonly unknown[]) => ({
    changes: 1,
    lastInsertRowId: 1,
  }));
  const transaction = {
    execAsync: transactionExecAsync,
    runAsync: transactionRunAsync,
  } as unknown as SQLiteDatabase;
  const withExclusiveTransactionAsync = jest.fn(
    async (task: (transaction: SQLiteDatabase) => Promise<void>) =>
      task(transaction),
  );

  const database = {
    execAsync,
    getAllAsync,
    runAsync,
    withExclusiveTransactionAsync,
  } as unknown as SQLiteDatabase;

  return {
    database,
    execAsync,
    transactionExecAsync,
    getAllAsync,
    runAsync,
    transactionRunAsync,
    withExclusiveTransactionAsync,
  };
}

describe('ExpoMigrationStore', () => {
  it('enables WAL and foreign keys and creates the migration ledger', async () => {
    const { database, execAsync } = createDatabaseMock();
    const store = new ExpoMigrationStore(database);

    await store.prepare();

    const sql = execAsync.mock.calls[0]?.[0] ?? '';
    expect(sql).toContain('PRAGMA journal_mode = WAL');
    expect(sql).toContain('PRAGMA foreign_keys = ON');
    expect(sql).toContain('PRAGMA busy_timeout = 5000');
    expect(sql).toContain('PRAGMA synchronous = NORMAL');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS schema_migrations');
  });

  it('returns applied migration versions in the database order', async () => {
    const { database } = createDatabaseMock([1, 2]);
    const store = new ExpoMigrationStore(database);

    await expect(store.getAppliedVersions()).resolves.toEqual([1, 2]);
  });

  it('records migration metadata with bound parameters', async () => {
    const { database, runAsync } = createDatabaseMock();
    const store = new ExpoMigrationStore(database);
    const migration: Migration = {
      version: 1,
      name: 'accounts',
      up: 'CREATE TABLE accounts (id TEXT PRIMARY KEY);',
    };

    await store.record(migration);

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO schema_migrations'),
      1,
      'accounts',
      expect.any(String),
    );
  });

  it('delegates transaction boundaries to SQLite', async () => {
    const {
      database,
      execAsync,
      transactionExecAsync,
      withExclusiveTransactionAsync,
    } = createDatabaseMock();
    const store = new ExpoMigrationStore(database);
    const task = jest.fn(async () => store.execute('CREATE TABLE example'));

    await store.transaction(task);

    expect(withExclusiveTransactionAsync).toHaveBeenCalledWith(
      expect.any(Function),
    );
    expect(task).toHaveBeenCalledTimes(1);
    expect(transactionExecAsync).toHaveBeenCalledWith('CREATE TABLE example');
    expect(execAsync).not.toHaveBeenCalled();
  });
});
