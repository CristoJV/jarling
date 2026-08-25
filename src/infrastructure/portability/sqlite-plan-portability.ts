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

import type { PlanPortability } from '@/application/ports/plan-portability';
import { ACCOUNT_TYPES } from '@/domain/entities/account';
import { isValidBudgetMonth } from '@/domain/entities/budget-allocation';
import { CATEGORY_NOTES_MAX_LENGTH } from '@/domain/entities/category';
import {
  createCategoryTarget,
  TARGET_KINDS,
  type CustomFundingMode,
  type IsoDayOfWeek,
  type RecurringFundingMode,
  type TargetKind,
} from '@/domain/entities/category-target';
import {
  isValidTransactionDate,
  TRANSACTION_KINDS,
  TRANSACTION_STATUSES,
} from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

const BACKUP_FORMAT = 'com.cristojv.jarling.backup';
const BACKUP_VERSION = 2;
const SUPPORTED_BACKUP_VERSIONS = [1, BACKUP_VERSION] as const;
type BackupVersion = (typeof SUPPORTED_BACKUP_VERSIONS)[number];
const PBKDF2_ITERATIONS = 310_000;
const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
const MAX_TOTAL_ROWS = 250_000;
const MAX_TEXT_LENGTH = 100_000;

function authenticatedContext(version: BackupVersion): Uint8Array {
  return utf8ToBytes(`Jarling backup version ${version}`);
}

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
      'notes',
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
    name: 'transaction_links',
    columns: [
      'id',
      'source_transaction_id',
      'target_transaction_id',
      'link_type',
      'created_at',
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
      'starts_on',
      'day_of_week',
      'include_previous_weeks',
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
  version: BackupVersion;
  exportedAt: string;
  preferences?: Readonly<Record<string, unknown>>;
  tables: Readonly<Record<TableName, readonly DataRow[]>>;
}>;

type EncryptedBackup = Readonly<{
  format: typeof BACKUP_FORMAT;
  version: BackupVersion;
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
    (typeof value === 'string' && value.length <= MAX_TEXT_LENGTH) ||
    (typeof value === 'number' && Number.isSafeInteger(value)) ||
    typeof value === 'boolean'
  );
}

export function parsePlanSnapshot(value: unknown): PlanSnapshot {
  if (
    !isRecord(value) ||
    value.format !== BACKUP_FORMAT ||
    !SUPPORTED_BACKUP_VERSIONS.includes(value.version as BackupVersion) ||
    typeof value.exportedAt !== 'string' ||
    !isRecord(value.tables)
  ) {
    throw new Error('The file is not a supported Jarling backup.');
  }

  const version = value.version as BackupVersion;

  const parsedTables = {} as Record<TableName, readonly DataRow[]>;
  let totalRows = 0;
  for (const table of tables) {
    const rows = value.tables[table.name];
    if (!Array.isArray(rows)) {
      throw new Error(`Backup table ${table.name} is missing.`);
    }
    totalRows += rows.length;
    if (totalRows > MAX_TOTAL_ROWS) {
      throw new Error('The backup contains too many records.');
    }
    parsedTables[table.name] = rows.map((row) => {
      if (!isRecord(row)) throw new Error(`Invalid row in ${table.name}.`);
      const parsed: Record<string, SQLiteBindValue> = {};
      for (const column of table.columns) {
        const hasField = Object.prototype.hasOwnProperty.call(row, column);
        const field = hasField
          ? row[column]
          : table.name === 'categories' && column === 'notes'
            ? null
            : version === 1 &&
                table.name === 'category_targets' &&
                column === 'starts_on' &&
                typeof row.created_at === 'string'
              ? row.created_at.slice(0, 10)
              : version === 1 &&
                  table.name === 'category_targets' &&
                  column === 'include_previous_weeks'
                ? row.kind === 'weekly'
                  ? 0
                  : null
                : undefined;
        if (!isBindValue(field)) {
          throw new Error(`Invalid ${table.name}.${column} value.`);
        }
        parsed[column] = field;
      }
      return parsed;
    });
  }

  const snapshot: PlanSnapshot = {
    format: BACKUP_FORMAT,
    version,
    exportedAt: value.exportedAt,
    ...(isRecord(value.preferences) ? { preferences: value.preferences } : {}),
    tables: parsedTables,
  };
  validateSnapshotSemantics(snapshot);
  return snapshot;
}

function requiredText(row: DataRow, field: string): string {
  const value = row[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid ${field} in backup.`);
  }
  return value;
}

function integer(row: DataRow, field: string): number {
  const value = row[field];
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(`Invalid ${field} in backup.`);
  }
  return value;
}

function nullableString(row: DataRow, field: string): string | undefined {
  const value = row[field];
  if (value === null) return undefined;
  if (typeof value !== 'string') throw new Error(`Invalid ${field} in backup.`);
  return value;
}

function validateSnapshotSemantics(snapshot: PlanSnapshot): void {
  const accountIds = new Set<string>();
  const accountTypes = new Map<string, string>();
  const accountBudgetState = new Map<string, boolean>();
  for (const row of snapshot.tables.accounts) {
    const id = requiredText(row, 'id');
    const type = requiredText(row, 'type');
    if (accountIds.has(id) || !ACCOUNT_TYPES.includes(type as never)) {
      throw new Error('The backup contains an invalid or duplicate account.');
    }
    if (![0, 1].includes(integer(row, 'on_budget'))) {
      throw new Error('The backup contains an invalid account budget flag.');
    }
    if (![0, 1].includes(integer(row, 'closed'))) {
      throw new Error('The backup contains an invalid account state.');
    }
    accountIds.add(id);
    accountTypes.set(id, type);
    accountBudgetState.set(id, integer(row, 'on_budget') === 1);
  }

  const groupIds = new Set<string>();
  for (const row of snapshot.tables.category_groups) {
    const id = requiredText(row, 'id');
    if (groupIds.has(id))
      throw new Error('Duplicate category group in backup.');
    groupIds.add(id);
  }

  const categoryIds = new Set<string>();
  const linkedAccountByCategoryId = new Map<string, string>();
  for (const row of snapshot.tables.categories) {
    const id = requiredText(row, 'id');
    const groupId = requiredText(row, 'group_id');
    const notes = nullableString(row, 'notes');
    const linkedAccountId = nullableString(row, 'linked_account_id');
    if (categoryIds.has(id) || !groupIds.has(groupId)) {
      throw new Error('The backup contains an invalid category relationship.');
    }
    if (
      linkedAccountId &&
      !['credit_card', 'line_of_credit'].includes(
        accountTypes.get(linkedAccountId) ?? '',
      )
    ) {
      throw new Error('A payment category links to an invalid account.');
    }
    if (![0, 1].includes(integer(row, 'hidden'))) {
      throw new Error('The backup contains an invalid category state.');
    }
    if (notes && notes.trim().length > CATEGORY_NOTES_MAX_LENGTH) {
      throw new Error('The backup contains invalid category notes.');
    }
    categoryIds.add(id);
    if (linkedAccountId) {
      linkedAccountByCategoryId.set(id, linkedAccountId);
    }
  }

  const transactionIds = new Set<string>();
  const transferGroups = new Map<
    string,
    Readonly<{
      accountId: string;
      amount: number;
      categoryId?: string;
    }>[]
  >();
  for (const row of snapshot.tables.transactions) {
    const id = requiredText(row, 'id');
    const accountId = requiredText(row, 'account_id');
    const kind = requiredText(row, 'kind');
    const status = requiredText(row, 'status');
    const date = requiredText(row, 'date');
    const categoryId = nullableString(row, 'category_id');
    const groupId = nullableString(row, 'transaction_group_id');
    const amount = integer(row, 'amount');
    if (
      transactionIds.has(id) ||
      !accountIds.has(accountId) ||
      (categoryId !== undefined && !categoryIds.has(categoryId)) ||
      !TRANSACTION_KINDS.includes(kind as never) ||
      !TRANSACTION_STATUSES.includes(status as never) ||
      !isValidTransactionDate(date)
    ) {
      throw new Error('The backup contains an invalid transaction.');
    }
    if (
      (categoryId !== undefined &&
        kind !== 'standard' &&
        !(kind === 'transfer' && amount < 0)) ||
      (kind === 'standard' && amount < 0 && categoryId === undefined)
    ) {
      throw new Error('The backup contains an invalid transaction category.');
    }
    if (kind === 'transfer') {
      if (!groupId) throw new Error('A transfer is missing its group.');
      transferGroups.set(groupId, [
        ...(transferGroups.get(groupId) ?? []),
        {
          accountId,
          amount,
          ...(categoryId ? { categoryId } : {}),
        },
      ]);
    } else if (groupId) {
      throw new Error('Only transfers may own a transaction group.');
    }
    transactionIds.add(id);
  }
  for (const legs of transferGroups.values()) {
    const source = legs.find(({ amount }) => amount < 0);
    const destination = legs.find(({ amount }) => amount > 0);
    if (
      legs.length !== 2 ||
      legs[0]?.accountId === legs[1]?.accountId ||
      legs.reduce((sum, leg) => sum + leg.amount, 0) !== 0 ||
      !source ||
      !destination
    ) {
      throw new Error('The backup contains an unbalanced transfer.');
    }
    if (
      source.categoryId &&
      (linkedAccountByCategoryId.get(source.categoryId) !==
        destination.accountId ||
        accountBudgetState.get(source.accountId) !== true)
    ) {
      throw new Error('The backup contains an invalid card payment transfer.');
    }
  }

  const linkIds = new Set<string>();
  for (const row of snapshot.tables.transaction_links) {
    const id = requiredText(row, 'id');
    const source = requiredText(row, 'source_transaction_id');
    const target = requiredText(row, 'target_transaction_id');
    const linkType = requiredText(row, 'link_type');
    if (
      linkIds.has(id) ||
      source >= target ||
      !transactionIds.has(source) ||
      !transactionIds.has(target) ||
      !['related', 'bizum'].includes(linkType)
    ) {
      throw new Error('The backup contains an invalid transaction link.');
    }
    linkIds.add(id);
  }

  for (const row of snapshot.tables.budget_allocations) {
    if (
      !categoryIds.has(requiredText(row, 'category_id')) ||
      !isValidBudgetMonth(requiredText(row, 'month'))
    ) {
      throw new Error('The backup contains an invalid budget allocation.');
    }
  }

  for (const row of snapshot.tables.category_targets) {
    const categoryId = requiredText(row, 'category_id');
    const kind = requiredText(row, 'kind');
    if (!categoryIds.has(categoryId) || !TARGET_KINDS.includes(kind as never)) {
      throw new Error('The backup contains a target for an unknown category.');
    }
    const includePreviousWeeks = row.include_previous_weeks;
    if (
      includePreviousWeeks !== null &&
      ![0, 1].includes(integer(row, 'include_previous_weeks'))
    ) {
      throw new Error('The backup contains an invalid weekly target option.');
    }
    createCategoryTarget({
      id: requiredText(row, 'id'),
      categoryId,
      kind: kind as TargetKind,
      amount: Money.fromCents(integer(row, 'amount')),
      startsOn: requiredText(row, 'starts_on'),
      ...(row.day_of_week !== null
        ? { dayOfWeek: integer(row, 'day_of_week') as IsoDayOfWeek }
        : {}),
      ...(includePreviousWeeks !== null
        ? {
            includePreviousWeeks: integer(row, 'include_previous_weeks') === 1,
          }
        : {}),
      ...(row.funding_mode !== null
        ? {
            fundingMode: requiredText(
              row,
              'funding_mode',
            ) as RecurringFundingMode,
          }
        : {}),
      ...(row.day_of_month !== null
        ? { dayOfMonth: integer(row, 'day_of_month') }
        : {}),
      ...(row.target_date !== null
        ? { targetDate: requiredText(row, 'target_date') }
        : {}),
      ...(row.custom_funding_mode !== null
        ? {
            customFundingMode: requiredText(
              row,
              'custom_funding_mode',
            ) as CustomFundingMode,
          }
        : {}),
      createdAt: requiredText(row, 'created_at'),
      updatedAt: requiredText(row, 'updated_at'),
    });
  }
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

async function checkSQLiteIntegrity(database: SQLiteDatabase): Promise<void> {
  const result = await database.getFirstAsync<{ integrity_check: string }>(
    'PRAGMA integrity_check',
  );
  if (result?.integrity_check !== 'ok') {
    throw new Error('SQLite integrity check failed.');
  }
}

export class SQLitePlanPortability implements PlanPortability {
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
      { additionalData: authenticatedContext(BACKUP_VERSION) },
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

    const selectedFile = new File(asset.uri);
    if ((selectedFile.size ?? 0) > MAX_BACKUP_BYTES) {
      throw new Error('The selected backup is too large.');
    }
    const raw: unknown = JSON.parse(await selectedFile.text());
    if (
      !isRecord(raw) ||
      raw.format !== BACKUP_FORMAT ||
      !SUPPORTED_BACKUP_VERSIONS.includes(raw.version as BackupVersion) ||
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

    const version = raw.version as BackupVersion;

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
      additionalData: authenticatedContext(version),
    });
    const snapshot = parsePlanSnapshot(
      JSON.parse(new TextDecoder().decode(decrypted)),
    );
    if (snapshot.version !== version) {
      throw new Error(
        'The encrypted backup version does not match its payload.',
      );
    }
    await this.restore(snapshot);
    await checkSQLiteIntegrity(this.database);
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
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      for (const table of tables) {
        data[table.name] = await transaction.getAllAsync<DataRow>(
          `SELECT ${table.columns.join(', ')} FROM ${table.name}`,
        );
      }
    });
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
