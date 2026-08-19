import { getRandomBytesAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

const DATABASE_KEY_NAME = 'jarling.database.key.v1';

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function getOrCreateDatabaseKey(): Promise<string> {
  const stored = await SecureStore.getItemAsync(DATABASE_KEY_NAME);
  if (stored) return stored;

  const generated = bytesToHex(await getRandomBytesAsync(32));
  await SecureStore.setItemAsync(DATABASE_KEY_NAME, generated, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return generated;
}

export async function unlockApplicationDatabase(
  database: SQLiteDatabase,
): Promise<void> {
  if (Platform.OS === 'web') return;

  const key = await getOrCreateDatabaseKey();
  // The key is generated as hexadecimal, so it never needs SQL escaping.
  await database.execAsync(`PRAGMA key = "x'${key}'";`);
  await database.getFirstAsync('SELECT count(*) AS count FROM sqlite_master');
}
