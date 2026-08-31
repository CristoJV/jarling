# ADR 0003: Direct SQLite baseline and forward-only migrations

- Status: Accepted
- Date: 2026-08-20

## Context

Jarling has not shipped a public database yet. Replaying development-era
migrations would add code and failure paths that no released installation
needs. Once version 1 is public, existing user databases must be preserved.

## Problem

The project needed a clean first public schema without sacrificing safe upgrades
for databases created after that baseline.

## Decision

Fresh installations create the complete current schema directly from
`current-schema.ts`. The first release records schema version 1 as a baseline;
it does not replay a migration.

The migration engine and ledger remain in place. The migration list is empty
for version 1. The first post-release schema change will:

1. update the direct schema used by fresh installations;
2. increment `CURRENT_SCHEMA_VERSION` to the new version;
3. add an immutable, forward-only migration with version 2;
4. test both a fresh installation and upgrading a version-1 fixture;
5. keep all data transformations transactional and restart-safe.

Unknown schema versions fail closed. Development databases from before the
first public baseline are not a compatibility target and may be cleared.
Released migrations are never edited or reordered.

## Consequences

- The first release has one canonical schema and no legacy migration chain.
- Fresh installations remain fast as the product evolves.
- Every future schema change requires two edits: current schema plus migration.
- A real version-1 database fixture becomes mandatory before version 2 work.

## Alternatives considered

- Replaying all development migrations was rejected as unneeded risk.
- Deleting the migration engine was rejected because it would postpone a known
  requirement until after user data exists.
- Destructive recreation after release was rejected because user data is the
  primary asset of the application.
