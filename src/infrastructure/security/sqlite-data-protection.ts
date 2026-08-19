import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';
import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
  getRandomBytesAsync,
} from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import type { DataProtection } from '@/application/ports/data-protection';

const BACKUP_FORMAT = 'com.cristojv.jarling.backup';
const BACKUP_VERSION = 1;
const PBKDF2_ITERATIONS = 310_000;
const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
const AUTHENTICATED_CONTEXT = utf8ToBytes('Jarling backup version 1');

const tables = [
  {
    name: 'accounts',
    columns: [
      'id',
      'name',
      'type',
      'on_budget',
      'closed',
      'created_at',
      'updated_at',
    ],
  },
  {
    name: 'category_groups',
    columns: ['id', 'name', 'sort_order', 'created_at', 'updated_at'],
  },
  {
    name: 'categories',
    columns: [
      'id',
      'group_id',
      'name',
      'hidden',
      'linked_account_id',
      'sort_order',
      'created_at',
      'updated_at',
    ],
  },
  {
    name: 'transactions',
    columns: [
      'id',
      'account_id',
      'category_id',
      'payee',
      'amount',
      'date',
      'notes',
      'status',
      'kind',
      'transaction_group_id',
      'created_at',
      'updated_at',
    ],
  },
  {
    name: 'budget_allocations',
    columns: [
      'id',
      'category_id',
      'month',
      'amount',
      'created_at',
      'updated_at',
    ],
  },
  {
    name: 'category_targets',
    columns: [
      'id',
      'category_id',
      'kind',
      'amount',
      'day_of_week',
      'funding_mode',
      'day_of_month',
      'target_date',
      'custom_funding_mode',
      'created_at',
      'updated_at',
    ],
  },
] as const;

type TableName = (typeof tables)[number]['name'];
type DataRow = Readonly<Record<string, SQLiteBindValue>>;
type PlanSnapshot = Readonly<{
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  preferences?: Readonly<Record<string, unknown>>;
  tables: Readonly<Record<TableName, readonly DataRow[]>>;
}>;

type EncryptedBackup = Readonly<{
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  encryption: 'AES-256-GCM';
  kdf: Readonly<{
    name: 'PBKDF2-HMAC-SHA256';
    iterations: number;
    salt: string;
  }>;
  payload: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBindValue(value: unknown): value is SQLiteBindValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

export function parsePlanSnapshot(value: unknown): PlanSnapshot {
  if (
    !isRecord(value) ||
    value.format !== BACKUP_FORMAT ||
    value.version !== BACKUP_VERSION ||
    typeof value.exportedAt !== 'string' ||
    !isRecord(value.tables)
  ) {
    throw new Error('The file is not a supported Jarling backup.');
  }

  const parsedTables = {} as Record<TableName, readonly DataRow[]>;
  for (const table of tables) {
    const rows = value.tables[table.name];
    if (!Array.isArray(rows)) {
      throw new Error(`Backup table ${table.name} is missing.`);
    }
    parsedTables[table.name] = rows.map((row) => {
      if (!isRecord(row)) throw new Error(`Invalid row in ${table.name}.`);
      const parsed: Record<string, SQLiteBindValue> = {};
      for (const column of table.columns) {
        const field = row[column];
        if (!isBindValue(field)) {
          throw new Error(`Invalid ${table.name}.${column} value.`);
        }
        parsed[column] = field;
      }
      return parsed;
    });
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: value.exportedAt,
    ...(isRecord(value.preferences) ? { preferences: value.preferences } : {}),
    tables: parsedTables,
  };
}

function assertPassword(password: string): string {
  const normalized = password.normalize('NFKC');
  if (normalized.length < 8) {
    throw new Error('The backup password must contain at least 8 characters.');
  }
  return normalized;
}

async function deriveBackupKey(
  password: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<AESEncryptionKey> {
  const bytes = await pbkdf2Async(
    sha256,
    utf8ToBytes(assertPassword(password)),
    salt,
    { c: iterations, dkLen: 32, asyncTick: 8 },
  );
  return AESEncryptionKey.import(bytes);
}

function temporaryFile(name: string, contents: string): File {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);
  return file;
}

async function shareFile(file: File, mimeType: string): Promise<void> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('File sharing is not available on this device.');
    }
    await Sharing.shareAsync(file.uri, { mimeType });
  } finally {
    if (file.exists) file.delete();
  }
}

export class SQLiteDataProtection implements DataProtection {
  constructor(private readonly database: SQLiteDatabase) {}

  async exportData(
    preferences?: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    const snapshot = await this.snapshot(preferences);
    const file = temporaryFile(
      `jarling-export-${snapshot.exportedAt.slice(0, 10)}.json`,
      JSON.stringify(snapshot, null, 2),
    );
    await shareFile(file, 'application/json');
  }

  async createBackup(
    password: string,
    preferences?: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    const snapshot = await this.snapshot(preferences);
    const salt = await getRandomBytesAsync(16);
    const key = await deriveBackupKey(password, salt);
    const sealed = await aesEncryptAsync(
      utf8ToBytes(JSON.stringify(snapshot)),
      key,
      { additionalData: AUTHENTICATED_CONTEXT },
    );
    const backup: EncryptedBackup = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      encryption: 'AES-256-GCM',
      kdf: {
        name: 'PBKDF2-HMAC-SHA256',
        iterations: PBKDF2_ITERATIONS,
        salt: bytesToHex(salt),
      },
      payload: await sealed.combined('base64'),
    };
    const file = temporaryFile(
      `jarling-backup-${snapshot.exportedAt.slice(0, 10)}.jarling`,
      JSON.stringify(backup),
    );
    await shareFile(file, 'application/vnd.jarling.backup');
  }

  async restoreBackup(password: string): Promise<
    Readonly<{
      restored: boolean;
      preferences?: unknown;
    }>
  > {
    assertPassword(password);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/vnd.jarling.backup', 'application/json'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return { restored: false };
    const asset = result.assets[0];
    if (!asset || (asset.size ?? 0) > MAX_BACKUP_BYTES) {
      throw new Error('The selected backup is too large.');
    }

    const raw: unknown = JSON.parse(await new File(asset.uri).text());
    if (
      !isRecord(raw) ||
      raw.format !== BACKUP_FORMAT ||
      raw.version !== BACKUP_VERSION ||
      raw.encryption !== 'AES-256-GCM' ||
      !isRecord(raw.kdf) ||
      raw.kdf.name !== 'PBKDF2-HMAC-SHA256' ||
      typeof raw.kdf.iterations !== 'number' ||
      raw.kdf.iterations !== PBKDF2_ITERATIONS ||
      typeof raw.kdf.salt !== 'string' ||
      typeof raw.payload !== 'string'
    ) {
      throw new Error('The file is not a supported encrypted backup.');
    }

    const key = await deriveBackupKey(
      password,
      hexToBytes(raw.kdf.salt),
      raw.kdf.iterations,
    );
    const sealed = AESSealedData.fromCombined(raw.payload, {
      ivLength: 12,
      tagLength: 16,
    });
    const decrypted = await aesDecryptAsync(sealed, key, {
      additionalData: AUTHENTICATED_CONTEXT,
    });
    const snapshot = parsePlanSnapshot(
      JSON.parse(new TextDecoder().decode(decrypted)),
    );
    await this.restore(snapshot);
    return {
      restored: true,
      ...(snapshot.preferences !== undefined
        ? { preferences: snapshot.preferences }
        : {}),
    };
  }

  private async snapshot(
    preferences?: Readonly<Record<string, unknown>>,
  ): Promise<PlanSnapshot> {
    const data = {} as Record<TableName, readonly DataRow[]>;
    for (const table of tables) {
      data[table.name] = await this.database.getAllAsync<DataRow>(
        `SELECT ${table.columns.join(', ')} FROM ${table.name}`,
      );
    }
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      ...(preferences ? { preferences } : {}),
      tables: data,
    };
  }

  private async restore(snapshot: PlanSnapshot): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      for (const table of [...tables].reverse()) {
        await transaction.runAsync(`DELETE FROM ${table.name}`);
      }
      for (const table of tables) {
        const placeholders = table.columns.map(() => '?').join(', ');
        for (const row of snapshot.tables[table.name]) {
          await transaction.runAsync(
            `INSERT INTO ${table.name} (${table.columns.join(', ')}) VALUES (${placeholders})`,
            table.columns.map((column) => row[column] ?? null),
          );
        }
      }
      const violations = await transaction.getAllAsync(
        'PRAGMA foreign_key_check',
      );
      if (violations.length > 0) {
        throw new Error('The backup contains invalid relationships.');
      }
    });
  }
}
