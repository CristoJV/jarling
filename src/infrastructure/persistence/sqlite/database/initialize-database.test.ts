import type { SQLiteDatabase } from 'expo-sqlite';

import { initializeDatabase } from './initialize-database';
import { currentSchema } from '../schema/current-schema';

function createDatabaseMock(initialVersions: readonly number[]) {
  const versions = [...initialVersions];
  const execAsync = jest.fn(async (_sql: string) => undefined);
  const transactionExecAsync = jest.fn(async (_sql: string) => undefined);
  const getAllAsync = jest.fn(async (_sql: string) =>
    versions.map((version) => ({ version })),
  );
  const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 }));
  const transactionRunAsync = jest.fn(async (_sql: string, version: number) => {
    versions.push(version);
    return { changes: 1, lastInsertRowId: 1 };
  });
  const transaction = {
    execAsync: transactionExecAsync,
    runAsync: transactionRunAsync,
  } as unknown as SQLiteDatabase;
  const withExclusiveTransactionAsync = jest.fn(
    async (task: (connection: SQLiteDatabase) => Promise<void>) =>
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
    transactionRunAsync,
    withExclusiveTransactionAsync,
  };
}

describe('initializeDatabase', () => {
  it('installs the current schema directly for a fresh database', async () => {
    const {
      database,
      transactionExecAsync,
      transactionRunAsync,
      withExclusiveTransactionAsync,
    } = createDatabaseMock([]);

    await initializeDatabase(database);

    expect(transactionExecAsync).toHaveBeenCalledWith(currentSchema.up);
    expect(transactionRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO schema_migrations'),
      currentSchema.version,
      currentSchema.name,
      expect.any(String),
    );
    expect(withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
  });

  it('does not rebuild a database already carrying the release baseline', async () => {
    const { database, transactionExecAsync, withExclusiveTransactionAsync } =
      createDatabaseMock([currentSchema.version]);

    await initializeDatabase(database);

    expect(transactionExecAsync).not.toHaveBeenCalled();
    expect(withExclusiveTransactionAsync).not.toHaveBeenCalled();
  });

  it('upgrades an existing version 1 database without reinstalling it', async () => {
    const { database, transactionExecAsync, transactionRunAsync } =
      createDatabaseMock([1]);

    await initializeDatabase(database);

    expect(transactionExecAsync).toHaveBeenCalledWith(
      expect.stringContaining('include_previous_weeks'),
    );
    expect(transactionRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO schema_migrations'),
      2,
      'target_monthly_schedule',
      expect.any(String),
    );
  });

  it('refuses an unknown schema version instead of guessing', async () => {
    const { database } = createDatabaseMock([999]);

    await expect(initializeDatabase(database)).rejects.toThrow(
      'Database contains unknown migration version 999.',
    );
  });
});
