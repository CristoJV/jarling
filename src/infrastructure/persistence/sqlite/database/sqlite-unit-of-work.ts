import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import type { UnitOfWork } from '@/application/ports/unit-of-work';

export class SQLiteUnitOfWork implements UnitOfWork {
  private pending: Promise<void> = Promise.resolve();
  private activeTransaction: SQLiteDatabase | null = null;
  readonly connection: SQLiteDatabase;

  constructor(private readonly database: SQLiteDatabase) {
    this.connection = new Proxy(database, {
      get: (_target, property) => {
        const connection = this.activeTransaction ?? this.database;
        const value = Reflect.get(connection, property, connection) as unknown;
        return typeof value === 'function' ? value.bind(connection) : value;
      },
    });
  }

  run<T>(task: () => Promise<T>): Promise<T> {
    const operation = this.pending.then(async () => {
      let result: T | undefined;

      if (Platform.OS === 'web') {
        await this.database.withTransactionAsync(async () => {
          result = await task();
        });
      } else {
        await this.database.withExclusiveTransactionAsync(
          async (transaction) => {
            this.activeTransaction = transaction;
            try {
              result = await task();
            } finally {
              this.activeTransaction = null;
            }
          },
        );
      }

      return result as T;
    });

    this.pending = operation.then(
      () => undefined,
      () => undefined,
    );

    return operation;
  }
}
