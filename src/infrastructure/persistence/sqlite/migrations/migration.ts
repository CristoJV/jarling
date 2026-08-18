export type Migration = Readonly<{
  version: number;
  name: string;
  up: string;
}>;

export interface MigrationStore {
  prepare(): Promise<void>;
  getAppliedVersions(): Promise<readonly number[]>;
  execute(sql: string): Promise<void>;
  record(migration: Migration): Promise<void>;
  transaction(task: () => Promise<void>): Promise<void>;
}
