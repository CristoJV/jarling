# ADR 0014: Normalized and atomic transaction tags

- Status: Accepted
- Date: 2026-10-16

## Context

Transactions need reusable, user-created labels that survive backup and can be
filtered efficiently. One transaction may have many tags and one tag may be
used by many transactions. Schema and portable-backup version 4 are still
unreleased and already contain assignment movement history.

## Problem

Embedding names in transactions would duplicate user data, make renaming and
uniqueness unreliable, and prevent indexed many-to-many filtering. Creating
tags separately from a transaction save could also leave partial or abandoned
state. Transfers add two ledger rows for one user operation.

## Decision

- Store canonical tags in `tags` and associations in `transaction_tags` with
  cascading foreign keys and a composite primary key.
- Normalize names with Unicode NFKC, trimmed and collapsed whitespace, and a
  lowercase uniqueness key. Names contain 1–60 characters and a transaction
  carries at most 20 tags.
- Preserve association timestamps when a tag selection is unchanged. Recent
  tags are ordered by their newest association, falling back to creation time.
- Create new tags and replace changed associations in the same `UnitOfWork` as
  the transaction or transfer write. Omitting tag input preserves associations;
  an explicit empty selection clears them.
- Apply the same selection to both legs of a transfer.
- Multiple tag filters match any selected tag. A separate untagged filter uses
  the absence of associations. Queries use `EXISTS` to avoid duplicate ledger
  rows and broken pagination or totals.
- Extend the unreleased database migration and portable-backup version 4 rather
  than introducing version 5. Restoring version 3 creates empty tag tables.

## Consequences

- Existing transactions remain untagged without a data backfill.
- Tag and transaction changes cannot partially commit on supported native
  platforms.
- Tags are portable user data and participate in semantic backup validation.
- Development databases that already recorded the pre-release migration 4 must
  be recreated; no released database is affected.
- Deleting a transaction or tag removes its associations automatically.

## Alternatives considered

- A delimited or JSON column on `transactions` was rejected because it cannot
  enforce canonical identity or support efficient indexed relationships.
- Saving a new tag when the selector confirms was rejected because cancelling
  the parent transaction would leave unintended catalogue entries.
- Joining `transaction_tags` directly into the paginated transaction query was
  rejected because multiple matches duplicate transaction rows.
- Giving each transfer leg an independent selection was rejected because the
  editor presents a transfer as one operation.
