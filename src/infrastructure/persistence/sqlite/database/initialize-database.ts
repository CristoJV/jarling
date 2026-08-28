import type { SQLiteDatabase } from 'expo-sqlite';

import { ExpoMigrationStore } from './expo-migration-store';
import { runMigrations } from '../migrations/migration-runner';
import { migrations } from '../migrations/migrations';
import {
  currentSchema,
  FIRST_RELEASE_SCHEMA_VERSION,
} from '../schema/current-schema';

export async function initializeDatabase(
  database: SQLiteDatabase,
): Promise<Readonly<{ created: boolean }>> {
  const migrationStore = new ExpoMigrationStore(database);
  await migrationStore.prepare();

  const appliedVersions = await migrationStore.getAppliedVersions();
  const created = appliedVersions.length === 0;
  if (created) {
    await migrationStore.transaction(async () => {
      await migrationStore.execute(currentSchema.up);
      await migrationStore.record(currentSchema);
    });
  }

  await runMigrations(migrationStore, migrations, {
    firstSchemaVersion: FIRST_RELEASE_SCHEMA_VERSION,
    knownVersions: [FIRST_RELEASE_SCHEMA_VERSION],
    prepareStore: false,
  });

  return { created };
}
