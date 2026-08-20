import type { Migration, MigrationStore } from './migration';
import { InvalidMigrationPlanError, runMigrations } from './migration-runner';

const firstMigration: Migration = {
  version: 1,
  name: 'first',
  up: 'CREATE TABLE first_table (id INTEGER PRIMARY KEY);',
};

const secondMigration: Migration = {
  version: 2,
  name: 'second',
  up: 'CREATE TABLE second_table (id INTEGER PRIMARY KEY);',
};

class InMemoryMigrationStore implements MigrationStore {
  readonly events: string[] = [];

  constructor(private readonly appliedVersions: number[] = []) {}

  async prepare(): Promise<void> {
    this.events.push('prepare');
  }

  async getAppliedVersions(): Promise<readonly number[]> {
    return this.appliedVersions;
  }

  async execute(sql: string): Promise<void> {
    this.events.push(`execute:${sql}`);
  }

  async record(migration: Migration): Promise<void> {
    this.appliedVersions.push(migration.version);
    this.events.push(`record:${migration.version}`);
  }

  async transaction(task: () => Promise<void>): Promise<void> {
    this.events.push('transaction:start');
    await task();
    this.events.push('transaction:commit');
  }
}

describe('runMigrations', () => {
  it('applies pending migrations in order and records each one atomically', async () => {
    const store = new InMemoryMigrationStore();

    await runMigrations(store, [firstMigration, secondMigration]);

    expect(store.events).toEqual([
      'prepare',
      'transaction:start',
      `execute:${firstMigration.up}`,
      'record:1',
      'transaction:commit',
      'transaction:start',
      `execute:${secondMigration.up}`,
      'record:2',
      'transaction:commit',
    ]);
  });

  it('skips migrations that have already been applied', async () => {
    const store = new InMemoryMigrationStore([1]);

    await runMigrations(store, [firstMigration, secondMigration]);

    expect(store.events).not.toContain(`execute:${firstMigration.up}`);
    expect(store.events).toContain(`execute:${secondMigration.up}`);
  });

  it('rejects migrations that are not ordered by a unique version', async () => {
    const store = new InMemoryMigrationStore();

    await expect(
      runMigrations(store, [secondMigration, firstMigration]),
    ).rejects.toThrow(InvalidMigrationPlanError);
    expect(store.events).toEqual([]);
  });

  it('rejects a migration plan with a missing version', async () => {
    const store = new InMemoryMigrationStore();

    await expect(runMigrations(store, [secondMigration])).rejects.toThrow(
      'Expected migration version 1, received 2.',
    );
    expect(store.events).toEqual([]);
  });

  it('refuses to open a database with an unknown migration', async () => {
    const store = new InMemoryMigrationStore([3]);

    await expect(
      runMigrations(store, [firstMigration, secondMigration]),
    ).rejects.toThrow('Database contains unknown migration version 3.');
  });

  it('refuses a non-contiguous applied history', async () => {
    const store = new InMemoryMigrationStore([1, 3]);
    const thirdMigration: Migration = {
      version: 3,
      name: 'third',
      up: 'CREATE TABLE third_table (id INTEGER PRIMARY KEY);',
    };

    await expect(
      runMigrations(store, [firstMigration, secondMigration, thirdMigration]),
    ).rejects.toThrow('Database migration history is not contiguous.');
  });

  it('does not replay migrations older than a directly installed baseline', async () => {
    const store = new InMemoryMigrationStore([2]);
    const thirdMigration: Migration = {
      version: 3,
      name: 'third',
      up: 'CREATE TABLE third_table (id INTEGER PRIMARY KEY);',
    };

    await runMigrations(store, [secondMigration, thirdMigration], {
      firstSchemaVersion: 1,
      knownVersions: [1],
    });

    expect(store.events).not.toContain(`execute:${secondMigration.up}`);
    expect(store.events).toContain(`execute:${thirdMigration.up}`);
  });
});
