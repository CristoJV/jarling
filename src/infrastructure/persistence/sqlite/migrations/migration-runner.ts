import type { Migration, MigrationStore } from './migration';

export class InvalidMigrationPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMigrationPlanError';
  }
}

function validateMigrationPlan(
  migrations: readonly Migration[],
  firstSchemaVersion: number,
) {
  let previousVersion = firstSchemaVersion;

  for (const migration of migrations) {
    if (!Number.isSafeInteger(migration.version) || migration.version <= 0) {
      throw new InvalidMigrationPlanError(
        'Migration versions must be positive safe integers.',
      );
    }

    if (migration.name.trim().length === 0) {
      throw new InvalidMigrationPlanError(
        `Migration ${migration.version} must have a name.`,
      );
    }

    if (migration.up.trim().length === 0) {
      throw new InvalidMigrationPlanError(
        `Migration ${migration.version} must contain SQL.`,
      );
    }

    if (migration.version !== previousVersion + 1) {
      throw new InvalidMigrationPlanError(
        `Expected migration version ${previousVersion + 1}, received ${migration.version}.`,
      );
    }

    previousVersion = migration.version;
  }
}

function assertAppliedHistoryIsContiguous(appliedVersions: readonly number[]) {
  for (let index = 1; index < appliedVersions.length; index += 1) {
    if (appliedVersions[index] !== appliedVersions[index - 1]! + 1) {
      throw new InvalidMigrationPlanError(
        'Database migration history is not contiguous.',
      );
    }
  }
}

function assertAppliedVersionsAreKnown(
  appliedVersions: readonly number[],
  migrations: readonly Migration[],
  knownVersions: readonly number[],
) {
  const known = new Set([
    ...knownVersions,
    ...migrations.map(({ version }) => version),
  ]);
  const unknownVersion = appliedVersions.find((version) => !known.has(version));

  if (unknownVersion !== undefined) {
    throw new InvalidMigrationPlanError(
      `Database contains unknown migration version ${unknownVersion}.`,
    );
  }
}

export async function runMigrations(
  store: MigrationStore,
  migrations: readonly Migration[],
  options: Readonly<{
    firstSchemaVersion?: number;
    knownVersions?: readonly number[];
    prepareStore?: boolean;
  }> = {},
): Promise<void> {
  validateMigrationPlan(migrations, options.firstSchemaVersion ?? 0);
  if (options.prepareStore !== false) await store.prepare();

  const appliedVersions = await store.getAppliedVersions();
  assertAppliedHistoryIsContiguous(appliedVersions);
  assertAppliedVersionsAreKnown(
    appliedVersions,
    migrations,
    options.knownVersions ?? [],
  );
  let currentVersion = appliedVersions.at(-1) ?? 0;

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    await store.transaction(async () => {
      await store.execute(migration.up);
      await store.record(migration);
    });
    currentVersion = migration.version;
  }
}
