import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import { initializeDatabase } from './initialize-database';
import { SCHEMA_V3_FIXTURE } from './fixtures/schema-v3-fixture';

type Statement = Readonly<{
  all: (...values: readonly SQLiteBindValue[]) => readonly unknown[];
  get: (...values: readonly SQLiteBindValue[]) => unknown;
  run: (...values: readonly SQLiteBindValue[]) => Readonly<{
    changes: number;
    lastInsertRowid: number | bigint;
  }>;
}>;

type RealDatabase = Readonly<{
  close: () => void;
  exec: (sql: string) => void;
  prepare: (sql: string) => Statement;
}>;

const { DatabaseSync } = jest.requireActual('node:sqlite') as Readonly<{
  DatabaseSync: new (path: string) => RealDatabase;
}>;

function expoAdapter(database: RealDatabase): SQLiteDatabase {
  let adapter: SQLiteDatabase;
  adapter = {
    execAsync: async (sql: string) => database.exec(sql),
    getAllAsync: async <Row>(sql: string, ...values: SQLiteBindValue[]) =>
      database.prepare(sql).all(...values) as readonly Row[],
    getFirstAsync: async <Row>(sql: string, ...values: SQLiteBindValue[]) =>
      (database.prepare(sql).get(...values) as Row | undefined) ?? null,
    runAsync: async (sql: string, ...values: SQLiteBindValue[]) => {
      const result = database.prepare(sql).run(...values);
      return {
        changes: result.changes,
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    withExclusiveTransactionAsync: async (
      task: (transaction: SQLiteDatabase) => Promise<void>,
    ) => {
      database.exec('BEGIN EXCLUSIVE');
      try {
        await task(adapter);
        database.exec('COMMIT');
      } catch (cause) {
        database.exec('ROLLBACK');
        throw cause;
      }
    },
  } as unknown as SQLiteDatabase;
  return adapter;
}

function createRealDatabase() {
  const database = new DatabaseSync(':memory:');
  return { database, adapter: expoAdapter(database) };
}

function installVersion3(database: RealDatabase): void {
  database.exec(SCHEMA_V3_FIXTURE);
  database.exec(`
    CREATE TABLE schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
    INSERT INTO schema_migrations (version, name, applied_at)
    VALUES (3, 'schema_v3', '2026-01-01T00:00:00.000Z');
  `);
}

function seedVersion3(database: RealDatabase): void {
  database.exec(`
    INSERT INTO accounts (
      id, name, type, on_budget, closed, created_at, updated_at
    ) VALUES
      ('account-1', 'Current', 'checking', 1, 0,
       '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
    INSERT INTO category_groups (
      id, name, sort_order, created_at, updated_at
    ) VALUES
      ('group-1', 'Needs', 0,
       '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
    INSERT INTO categories (
      id, group_id, name, notes, hidden, linked_account_id, sort_order,
      created_at, updated_at
    ) VALUES
      ('positive', 'group-1', 'Positive', NULL, 0, NULL, 0,
       '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'),
      ('negative', 'group-1', 'Negative', NULL, 0, NULL, 1,
       '2026-01-01T00:00:00.000Z', '2026-01-03T00:00:00.000Z'),
      ('zero', 'group-1', 'Zero', NULL, 0, NULL, 2,
       '2026-01-01T00:00:00.000Z', '2026-01-04T00:00:00.000Z');
    INSERT INTO transactions (
      id, account_id, category_id, payee, amount, date, notes, status, kind,
      transaction_group_id, created_at, updated_at
    ) VALUES
      ('transaction-1', 'account-1', 'positive', 'Market', -1250,
       '2026-01-10', NULL, 'cleared', 'standard', NULL,
       '2026-01-10T10:00:00.000Z', '2026-01-10T10:00:00.000Z');
    INSERT INTO budget_allocations (
      id, category_id, month, amount, created_at, updated_at
    ) VALUES
      ('allocation-positive', 'positive', '2026-01', 5000,
       '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'),
      ('allocation-negative', 'negative', '2026-01', -700,
       '2026-01-01T00:00:00.000Z', '2026-01-03T00:00:00.000Z'),
      ('allocation-zero', 'zero', '2026-01', 0,
       '2026-01-01T00:00:00.000Z', '2026-01-04T00:00:00.000Z');
  `);
}

describe('initializeDatabase real SQLite integration', () => {
  it('installs a valid current schema into an empty real database', async () => {
    const { database, adapter } = createRealDatabase();
    try {
      await expect(initializeDatabase(adapter)).resolves.toEqual({
        created: true,
      });

      expect(
        database.prepare('SELECT version FROM schema_migrations').all(),
      ).toEqual([{ version: 4 }]);
      expect(
        database
          .prepare(
            `SELECT name FROM sqlite_master
             WHERE type = 'table' AND name IN ('tags', 'transaction_tags')
             ORDER BY name`,
          )
          .all(),
      ).toEqual([{ name: 'tags' }, { name: 'transaction_tags' }]);
      expect(database.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      expect(database.prepare('PRAGMA integrity_check').get()).toEqual({
        integrity_check: 'ok',
      });
    } finally {
      database.close();
    }
  });

  it('upgrades a populated version 3 database and remains idempotent', async () => {
    const { database, adapter } = createRealDatabase();
    try {
      installVersion3(database);
      seedVersion3(database);

      await expect(initializeDatabase(adapter)).resolves.toEqual({
        created: false,
      });

      expect(
        database
          .prepare('SELECT version FROM schema_migrations ORDER BY version')
          .all(),
      ).toEqual([{ version: 3 }, { version: 4 }]);
      expect(
        database
          .prepare(
            `SELECT id, amount, source_category_id, destination_category_id,
                    provenance, recorded_at
             FROM budget_allocation_movements ORDER BY id`,
          )
          .all(),
      ).toEqual([
        {
          id: 'allocation-baseline:allocation-negative',
          amount: 700,
          source_category_id: 'negative',
          destination_category_id: null,
          provenance: 'migration_baseline',
          recorded_at: '2026-01-03T00:00:00.000Z',
        },
        {
          id: 'allocation-baseline:allocation-positive',
          amount: 5000,
          source_category_id: null,
          destination_category_id: 'positive',
          provenance: 'migration_baseline',
          recorded_at: '2026-01-02T00:00:00.000Z',
        },
      ]);
      expect(
        database.prepare('SELECT count(*) AS count FROM tags').get(),
      ).toEqual({ count: 0 });
      expect(
        database
          .prepare('SELECT count(*) AS count FROM transaction_tags')
          .get(),
      ).toEqual({ count: 0 });
      expect(
        database.prepare('SELECT payee, amount FROM transactions').all(),
      ).toEqual([{ payee: 'Market', amount: -1250 }]);

      await expect(initializeDatabase(adapter)).resolves.toEqual({
        created: false,
      });
      expect(
        database
          .prepare('SELECT count(*) AS count FROM budget_allocation_movements')
          .get(),
      ).toEqual({ count: 2 });
      expect(database.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      expect(database.prepare('PRAGMA integrity_check').get()).toEqual({
        integrity_check: 'ok',
      });
    } finally {
      database.close();
    }
  });

  it('rolls back schema changes and metadata when migration 4 fails', async () => {
    const { database, adapter } = createRealDatabase();
    try {
      installVersion3(database);
      seedVersion3(database);
      database.exec('CREATE TABLE tags (id TEXT PRIMARY KEY NOT NULL);');

      await expect(initializeDatabase(adapter)).rejects.toThrow();

      expect(
        database
          .prepare('SELECT version FROM schema_migrations ORDER BY version')
          .all(),
      ).toEqual([{ version: 3 }]);
      expect(
        database
          .prepare(
            `SELECT count(*) AS count FROM sqlite_master
             WHERE type = 'table' AND name = 'budget_allocation_movements'`,
          )
          .get(),
      ).toEqual({ count: 0 });
      expect(
        database.prepare('SELECT count(*) AS count FROM tags').get(),
      ).toEqual({ count: 0 });
    } finally {
      database.close();
    }
  });
});
