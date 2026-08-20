import type { SQLiteDatabase } from 'expo-sqlite';

import { SQLiteUnitOfWork } from './sqlite-unit-of-work';

function createDatabaseMock() {
  const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 }));
  const transactionRunAsync = jest.fn(async () => ({
    changes: 1,
    lastInsertRowId: 1,
  }));
  const transaction = {
    runAsync: transactionRunAsync,
  } as unknown as SQLiteDatabase;
  const withExclusiveTransactionAsync = jest.fn(
    async (task: (transaction: SQLiteDatabase) => Promise<void>) =>
      task(transaction),
  );
  return {
    database: {
      runAsync,
      withExclusiveTransactionAsync,
    } as unknown as SQLiteDatabase,
    runAsync,
    transactionRunAsync,
    withExclusiveTransactionAsync,
  };
}

describe('SQLiteUnitOfWork', () => {
  it('returns the task result inside a SQLite transaction', async () => {
    const { database, withExclusiveTransactionAsync } = createDatabaseMock();
    const unitOfWork = new SQLiteUnitOfWork(database);

    await expect(unitOfWork.run(async () => 'created')).resolves.toBe(
      'created',
    );
    expect(withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
  });

  it('routes repository calls through the exclusive transaction connection', async () => {
    const { database, runAsync, transactionRunAsync } = createDatabaseMock();
    const unitOfWork = new SQLiteUnitOfWork(database);

    await unitOfWork.run(async () => {
      await unitOfWork.connection.runAsync('INSERT INTO example VALUES (?)', 1);
    });

    expect(transactionRunAsync).toHaveBeenCalledWith(
      'INSERT INTO example VALUES (?)',
      1,
    );
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('restores the root connection after a transaction fails', async () => {
    const { database, runAsync } = createDatabaseMock();
    const unitOfWork = new SQLiteUnitOfWork(database);

    await expect(
      unitOfWork.run(async () => {
        throw new Error('write failed');
      }),
    ).rejects.toThrow('write failed');

    await unitOfWork.connection.runAsync('SELECT 1');
    expect(runAsync).toHaveBeenCalledWith('SELECT 1');
  });

  it('continues accepting work after a failed transaction', async () => {
    const { database } = createDatabaseMock();
    const unitOfWork = new SQLiteUnitOfWork(database);

    await expect(
      unitOfWork.run(async () => {
        throw new Error('write failed');
      }),
    ).rejects.toThrow('write failed');
    await expect(unitOfWork.run(async () => 'recovered')).resolves.toBe(
      'recovered',
    );
  });

  it('serializes application write transactions', async () => {
    const { database } = createDatabaseMock();
    const unitOfWork = new SQLiteUnitOfWork(database);
    const events: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = unitOfWork.run(async () => {
      events.push('first:start');
      await firstGate;
      events.push('first:end');
    });
    const second = unitOfWork.run(async () => {
      events.push('second');
    });

    await Promise.resolve();
    expect(events).toEqual(['first:start']);
    releaseFirst?.();
    await Promise.all([first, second]);
    expect(events).toEqual(['first:start', 'first:end', 'second']);
  });
});
