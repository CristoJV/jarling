import type { Migration } from './migration';
import { initialSchemaMigration } from './001_initial_schema';

export const migrations: readonly Migration[] = [initialSchemaMigration];
