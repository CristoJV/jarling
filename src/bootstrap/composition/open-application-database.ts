import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { initializeApplicationDatabase } from '@/bootstrap/composition/initialize-application-database';
import { DATABASE_NAME } from '@/bootstrap/config/database';

export async function openApplicationDatabase(): Promise<SQLiteDatabase> {
  const database = await openDatabaseAsync(DATABASE_NAME, {
    useNewConnection: true,
  });
  try {
    await initializeApplicationDatabase(database);
    return database;
  } catch (error) {
    await database.closeAsync().catch(() => undefined);
    throw error;
  }
}
