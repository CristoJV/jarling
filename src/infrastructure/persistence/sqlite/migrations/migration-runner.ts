import type { Migration, MigrationStore } from './migration';

export class InvalidMigrationPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMigrationPlanError';
  }
}

function validateMigrationPlan(migrations: readonly Migration[]) {
  let previousVersion = 0;

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

    if (migration.version <= previousVersion) {
      throw new InvalidMigrationPlanError(
        'Migrations must have unique, ascending versions.',
      );
    }

    previousVersion = migration.version;
  }
}

function assertAppliedVersionsAreKnown(
  appliedVersions: readonly number[],
  migrations: readonly Migration[],
) {
  const knownVersions = new Set(migrations.map(({ version }) => version));
  const unknownVersion = appliedVersions.find(
    (version) => !knownVersions.has(version),
  );

  if (unknownVersion !== undefined) {
    throw new InvalidMigrationPlanError(
      `Database contains unknown migration version ${unknownVersion}.`,
    );
  }
}

export async function runMigrations(
  store: MigrationStore,
  migrations: readonly Migration[],
): Promise<void> {
  validateMigrationPlan(migrations);
  await store.prepare();

  const appliedVersions = await store.getAppliedVersions();
  assertAppliedVersionsAreKnown(appliedVersions, migrations);
  const applied = new Set(appliedVersions);

  for (const migration of migrations) {
    if (applied.has(migration.version)) {
      continue;
    }

    await store.transaction(async () => {
      await store.execute(migration.up);
      await store.record(migration);
    });
  }
}
