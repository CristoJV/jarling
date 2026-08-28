import type { SQLiteDatabase } from 'expo-sqlite';

import { createApplication } from '@/bootstrap/composition/create-application';
import { initializeDatabase } from '@/infrastructure/persistence/sqlite/database/initialize-database';

export async function initializeApplicationDatabase(
  database: SQLiteDatabase,
): Promise<void> {
  const { created } = await initializeDatabase(database);
  if (created) {
    await createApplication(database).categories.ensureDefaults.execute();
  }
}
