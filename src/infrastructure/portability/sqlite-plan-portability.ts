import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import type {
  BackupProgressPhase,
  PlanPortability,
  PlanRestoreSource,
  RestoreProgressPhase,
} from '@/application/ports/plan-portability';
import { PlanPortabilityError } from '@/application/errors/plan-portability-error';
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
import {
  BACKUP_FORMAT,
  CURRENT_BACKUP_VERSION,
  createEncryptedBackupDocument,
  decryptEncryptedBackupDocument,
  parseEncryptedBackupDocument,
  verifyEncryptedBackupDocument,
} from '@/infrastructure/portability/encrypted-backup-codec';

const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
const MAX_TOTAL_ROWS = 250_000;
const MAX_TEXT_LENGTH = 100_000;
const LEGACY_UNCATEGORIZED_GROUP_ID = 'system-group-uncategorized';
const LEGACY_UNCATEGORIZED_CATEGORY_ID = 'default-category-uncategorized';

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
  version: typeof CURRENT_BACKUP_VERSION;
  exportedAt: string;
  preferences?: Readonly<Record<string, unknown>>;
  tables: Readonly<Record<TableName, readonly DataRow[]>>;
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

function removeLegacyUncategorized(
  source: Readonly<Record<TableName, readonly DataRow[]>>,
): Readonly<Record<TableName, readonly DataRow[]>> {
  return {
    ...source,
    category_groups: source.category_groups.filter(
      (row) => row.id !== LEGACY_UNCATEGORIZED_GROUP_ID,
    ),
    categories: source.categories.filter(
      (row) => row.id !== LEGACY_UNCATEGORIZED_CATEGORY_ID,
    ),
    transactions: source.transactions.map((row) =>
      row.category_id === LEGACY_UNCATEGORIZED_CATEGORY_ID
        ? { ...row, category_id: null }
        : row,
    ),
    budget_allocations: source.budget_allocations.filter(
      (row) => row.category_id !== LEGACY_UNCATEGORIZED_CATEGORY_ID,
    ),
    category_targets: source.category_targets.filter(
      (row) => row.category_id !== LEGACY_UNCATEGORIZED_CATEGORY_ID,
    ),
  };
}

function migrateSnapshotDocument(value: unknown): unknown {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.tables)) {
    return value;
  }
  const migratedTables = Object.fromEntries(
    Object.entries(value.tables).map(([name, rows]) => [
      name,
      Array.isArray(rows)
        ? rows.map((row) => {
            if (!isRecord(row)) return row;
            if (name === 'categories') {
              return {
                ...row,
                notes: Object.prototype.hasOwnProperty.call(row, 'notes')
                  ? row.notes
                  : null,
              };
            }
            if (name === 'category_targets') {
              return {
                ...row,
                starts_on:
                  typeof row.starts_on === 'string'
                    ? row.starts_on
                    : typeof row.created_at === 'string'
                      ? row.created_at.slice(0, 10)
                      : undefined,
                include_previous_weeks: Object.prototype.hasOwnProperty.call(
                  row,
                  'include_previous_weeks',
                )
                  ? row.include_previous_weeks
                  : row.kind === 'weekly'
                    ? 0
                    : null,
              };
            }
            return row;
          })
        : rows,
    ]),
  );
  if (!Array.isArray(migratedTables.transaction_links)) {
    migratedTables.transaction_links = [];
  }
  return {
    ...value,
    version: CURRENT_BACKUP_VERSION,
    tables: migratedTables,
  };
}

export function parsePlanSnapshot(value: unknown): PlanSnapshot {
  let migrated: unknown;
  try {
    migrated = migrateSnapshotDocument(value);
  } catch (cause) {
    throw new PlanPortabilityError(
      'migration-failed',
      'The backup snapshot could not be migrated.',
      { cause },
    );
  }
  if (
    !isRecord(migrated) ||
    migrated.format !== BACKUP_FORMAT ||
    migrated.version !== CURRENT_BACKUP_VERSION ||
    typeof migrated.exportedAt !== 'string' ||
    !isRecord(migrated.tables)
  ) {
    throw new PlanPortabilityError(
      'invalid-snapshot',
      'The file does not contain a valid Jarling snapshot.',
    );
  }

  const parsedTables = {} as Record<TableName, readonly DataRow[]>;
  let totalRows = 0;
  for (const table of tables) {
    const rows = migrated.tables[table.name];
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
        const field = hasField ? row[column] : undefined;
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
    version: CURRENT_BACKUP_VERSION,
    exportedAt: migrated.exportedAt,
    ...(isRecord(migrated.preferences)
      ? { preferences: migrated.preferences }
      : {}),
    tables: removeLegacyUncategorized(parsedTables),
  };
  validateSnapshotSemantics(snapshot);
  return snapshot;
}

export function detectPortablePlanFormat(
  value: unknown,
): 'encrypted' | 'snapshot' {
  if (isRecord(value) && 'encryption' in value && 'payload' in value) {
    parseEncryptedBackupDocument(value);
    return 'encrypted';
  }
  if (!isRecord(value) || value.format !== BACKUP_FORMAT) {
    throw new PlanPortabilityError(
      'unsupported-format',
      'The file is not a supported Jarling backup.',
    );
  }
  if (![1, CURRENT_BACKUP_VERSION].includes(value.version as number)) {
    throw new PlanPortabilityError(
      'unsupported-version',
      'The backup version is not supported.',
    );
  }
  if (!isRecord(value.tables)) {
    throw new PlanPortabilityError(
      'invalid-snapshot',
      'The file does not contain a valid Jarling snapshot.',
    );
  }
  return 'snapshot';
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
      categoryId !== undefined &&
      kind !== 'standard' &&
      !(kind === 'transfer' && amount < 0)
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

async function reportProgress<
  Phase extends BackupProgressPhase | RestoreProgressPhase,
>(
  onProgress: ((phase: Phase) => void) | undefined,
  phase: Phase,
): Promise<void> {
  onProgress?.(phase);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
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
    onProgress?: (phase: BackupProgressPhase) => void,
  ): Promise<void> {
    await reportProgress(onProgress, 'preparing');
    await reportProgress(onProgress, 'snapshot');
    const snapshot = await this.snapshot(preferences);
    const snapshotJson = JSON.stringify(snapshot);
    await reportProgress(onProgress, 'encrypting');
    const backup = await createEncryptedBackupDocument(snapshotJson, password);
    await reportProgress(onProgress, 'saving');
    const file = temporaryFile(
      `jarling-backup-${snapshot.exportedAt.slice(0, 10)}.jarling`,
      JSON.stringify(backup),
    );
    try {
      await reportProgress(onProgress, 'verifying');
      const writtenBackup: unknown = JSON.parse(await file.text());
      await verifyEncryptedBackupDocument(
        writtenBackup,
        password,
        snapshotJson,
      );
      parsePlanSnapshot(JSON.parse(snapshotJson));
    } catch (cause) {
      if (file.exists) file.delete();
      if (
        cause instanceof PlanPortabilityError &&
        cause.code === 'backup-verification-failed'
      ) {
        throw cause;
      }
      throw new PlanPortabilityError(
        'backup-verification-failed',
        'The encrypted backup failed its read-back verification.',
        { cause },
      );
    }
    await shareFile(file, 'application/vnd.jarling.backup');
  }

  async selectRestoreSource(
    onProgress?: (phase: RestoreProgressPhase) => void,
  ): Promise<PlanRestoreSource | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return null;
    await reportProgress(onProgress, 'reading');
    const asset = result.assets[0];
    if (!asset || (asset.size ?? 0) > MAX_BACKUP_BYTES) {
      throw new PlanPortabilityError(
        'corrupt-backup',
        'The selected backup is too large to be valid.',
      );
    }

    const selectedFile = new File(asset.uri);
    if ((selectedFile.size ?? 0) > MAX_BACKUP_BYTES) {
      throw new PlanPortabilityError(
        'corrupt-backup',
        'The selected backup is too large to be valid.',
      );
    }
    let raw: unknown;
    try {
      raw = JSON.parse(await selectedFile.text());
    } catch (cause) {
      throw new PlanPortabilityError(
        'corrupt-backup',
        'The selected file is not valid JSON.',
        { cause },
      );
    }
    const format = detectPortablePlanFormat(raw);
    if (format === 'snapshot') {
      return {
        encrypted: false,
        restore: async (_, restoreProgress) => {
          const snapshot = await this.prepareSnapshot(raw, restoreProgress);
          return this.restoreSnapshot(snapshot, restoreProgress);
        },
      };
    }

    const backup = parseEncryptedBackupDocument(raw);
    return {
      encrypted: true,
      restore: async (password, restoreProgress) => {
        if (password === undefined) {
          throw new PlanPortabilityError(
            'decryption-failed',
            'A password is required for this backup.',
          );
        }
        await reportProgress(restoreProgress, 'deriving-key');
        await reportProgress(restoreProgress, 'decrypting');
        const decrypted = await decryptEncryptedBackupDocument(
          backup,
          password,
        );
        await reportProgress(restoreProgress, 'parsing');
        let decoded: unknown;
        try {
          decoded = JSON.parse(decrypted.snapshotJson);
        } catch (cause) {
          throw new PlanPortabilityError(
            'corrupt-backup',
            'The decrypted backup does not contain valid JSON.',
            { cause },
          );
        }
        if (!isRecord(decoded) || decoded.version !== decrypted.version) {
          throw new PlanPortabilityError(
            'corrupt-backup',
            'The encrypted backup version does not match its payload.',
          );
        }
        const snapshot = await this.prepareSnapshot(decoded, restoreProgress);
        return this.restoreSnapshot(snapshot, restoreProgress);
      },
    };
  }

  private async prepareSnapshot(
    raw: unknown,
    onProgress?: (phase: RestoreProgressPhase) => void,
  ): Promise<PlanSnapshot> {
    await reportProgress(onProgress, 'migrating');
    let migrated: unknown;
    try {
      migrated = migrateSnapshotDocument(raw);
    } catch (cause) {
      throw new PlanPortabilityError(
        'migration-failed',
        'The backup snapshot could not be migrated.',
        { cause },
      );
    }
    await reportProgress(onProgress, 'validating');
    try {
      return parsePlanSnapshot(migrated);
    } catch (cause) {
      if (cause instanceof PlanPortabilityError) throw cause;
      throw new PlanPortabilityError(
        'invalid-snapshot',
        'The backup snapshot is invalid.',
        { cause },
      );
    }
  }

  private async restoreSnapshot(
    snapshot: PlanSnapshot,
    onProgress?: (phase: RestoreProgressPhase) => void,
  ) {
    await reportProgress(onProgress, 'restoring');
    try {
      await this.restore(snapshot);
    } catch (cause) {
      throw new PlanPortabilityError(
        'restore-failed',
        'The backup could not be restored.',
        { cause },
      );
    }
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
      version: CURRENT_BACKUP_VERSION,
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
      await checkSQLiteIntegrity(transaction);
    });
  }
}
