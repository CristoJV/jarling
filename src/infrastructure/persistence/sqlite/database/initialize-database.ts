import type { SQLiteDatabase } from 'expo-sqlite';

import { ExpoMigrationStore } from './expo-migration-store';
import { runMigrations } from '../migrations/migration-runner';
import { migrations } from '../migrations/migrations';

export async function initializeDatabase(
  database: SQLiteDatabase,
): Promise<void> {
  const migrationStore = new ExpoMigrationStore(database);
  await runMigrations(migrationStore, migrations);
}
