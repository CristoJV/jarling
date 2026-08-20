import type { Migration } from './migration';

/**
 * Forward-only changes for databases created by an earlier public release.
 * Fresh installations use current-schema.ts directly, so this list is empty
 * for the first release. The first future migration must use version 2.
 */
export const migrations: readonly Migration[] = [];
