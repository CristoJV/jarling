# Transaction data hardening

## Goal

Make schema upgrades, portable restores, tag boundaries, and filtered transaction
totals safer and verifiable without changing their user-facing semantics.

## Phase 1 — Real migration integration coverage

- [x] Execute clean schema creation and the version 3 to 4 migration against a
      real in-memory SQLite engine.
- [x] Preserve representative version 3 records and verify movement backfill,
      empty tag tables, migration metadata, foreign keys, and database integrity.

Checkpoints:

- [x] The test uses SQLite execution rather than SQL-string mocks.
- [x] A second initialization is idempotent and does not duplicate baselines.
- [x] A failed migration rolls back its schema and migration record atomically.

## Phase 2 — Restore invariant validation

- [x] Reject more than 20 tags per transaction, asymmetric transfer tags, and
      malformed association timestamps.
- [x] Validate movement occurrence dates and occurrence/recording instants with
      shared domain validators.
- [x] Record the hardened portable-data boundary in an ADR.

Checkpoints:

- [x] Valid tagged transfers and historical baselines still restore.
- [x] Invalid restored state is rejected before database replacement.

## Phase 3 — Repository-side transaction totals

- [x] Move filtered income, spending, and net aggregation into the transaction
      repository.
- [x] Reuse one filter predicate builder for paginated rows and totals.
- [x] Record the query consistency decision in an ADR.

Checkpoints:

- [x] Transfers remain excluded from totals and every existing filter is shared.
- [x] SQLite performs the aggregation without materializing all transactions.

## Phase 4 — Bounded and explicit tag dependencies

- [x] Enforce tag-selection limits in the selector and filter boundary.
- [x] Make tag dependencies mandatory in transaction and transfer use cases.
- [x] Cover limit feedback, repository guards, and complete composition in tests.

Checkpoints:

- [x] More than 20 tags cannot reach a save or dynamic SQLite placeholder list.
- [x] Incomplete tag-aware use cases fail at compile/composition time.
- [x] Full tests, typecheck, lint, formatting, and diff checks pass.
