import type { SQLiteDatabase } from 'expo-sqlite';

import type { UnitOfWork } from '@/application/ports/unit-of-work';

export class SQLiteUnitOfWork implements UnitOfWork {
  private pending: Promise<void> = Promise.resolve();

  constructor(private readonly database: SQLiteDatabase) {}

  run<T>(task: () => Promise<T>): Promise<T> {
    const operation = this.pending.then(async () => {
      let result: T | undefined;

      await this.database.withTransactionAsync(async () => {
        result = await task();
      });

      return result as T;
    });

    this.pending = operation.then(
      () => undefined,
      () => undefined,
    );

    return operation;
  }
}
