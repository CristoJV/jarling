import type { SQLiteDatabase } from 'expo-sqlite';

import type { Migration, MigrationStore } from '../migrations/migration';

type MigrationRow = {
  version: number;
};

export class ExpoMigrationStore implements MigrationStore {
  constructor(private readonly database: SQLiteDatabase) {}

  async prepare(): Promise<void> {
    await this.database.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);
  }

  async getAppliedVersions(): Promise<readonly number[]> {
    const rows = await this.database.getAllAsync<MigrationRow>(
      'SELECT version FROM schema_migrations ORDER BY version ASC',
    );

    return rows.map(({ version }) => version);
  }

  async execute(sql: string): Promise<void> {
    await this.database.execAsync(sql);
  }

  async record(migration: Migration): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO schema_migrations (version, name, applied_at)
       VALUES (?, ?, ?)`,
      migration.version,
      migration.name,
      new Date().toISOString(),
    );
  }

  async transaction(task: () => Promise<void>): Promise<void> {
    await this.database.withTransactionAsync(task);
  }
}
