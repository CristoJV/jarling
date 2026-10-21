# Transaction tags

## Goal

Allow transactions to carry reusable tags and let the Transactions screen
filter by any selected tag. Existing transactions remain untagged. Transfers
share one tag selection across both ledger legs.

## Phase 1 — Persistent, atomic, and portable tag model

- [x] Define normalized tag names and transaction-tag repository contracts.
- [x] Add `tags` and `transaction_tags` to the current schema and the unreleased
      schema migration 4, without introducing migration 5.
- [x] Save tag creation and association changes in the same unit of work as the
      transaction or transfer.
- [x] Add tag reads, recent-tag ordering, and any-tag/untagged transaction
      filters.
- [x] Include tags in plan deletion, JSON export, encrypted backups,
      validation, legacy backup migration, and restore.
- [x] Record the persistence, normalization, transfer, and filter semantics in
      an accepted ADR.

Checkpoints:

- [x] Fresh schema and version-3 database upgrade create empty tag tables while
      preserving every existing transaction.
- [x] Tag names are trimmed, whitespace-normalized, case-insensitively unique,
      length-bounded, and limited per transaction.
- [x] A failed compound save cannot leave a tag or association partially
      persisted; unchanged associations retain their recency timestamp.
- [x] Transfers apply the same tags to both legs; deleting a transaction or tag
      cannot leave orphan associations.
- [x] Backup v3 migration produces empty tag collections and backup v4 round
      trips tagged transactions.
- [x] Domain, application, persistence, migration, portability, typecheck, and
      lint checks pass for the phase.

## Phase 2 — Editor selection and transaction filtering

- [x] Add a reusable full-screen multi-select tag flow with search, in-context
      creation, the three most recently used tags, alphabetical tags, clear-all,
      and an explicit keyboard-safe Confirm action.
- [x] Add tag draft state to new/edit transaction flows, including discard
      detection and concise selection summaries.
- [x] Add Tags / Choose tags suggestions, removable filter state, and an
      Untagged filter to the Transactions screen.
- [x] Add English and Spanish copy and synchronize current user and interaction
      documentation.
- [x] Record the selector confirmation, recency, and any-tag filter behavior in
      an accepted ADR.

Checkpoints:

- [x] Tapping a tag toggles it without leaving the selector; Back discards the
      selector draft and Confirm applies it to the editor or filter.
- [x] Searching hides Recents, exact normalized matches are not duplicated, and
      creating a tag selects it without writing before the transaction Save.
- [x] Clear all works, selected rows expose checkbox accessibility state, and
      the Confirm action remains reachable above native keyboards and safe-area
      insets.
- [x] A tag-only editor change triggers discard protection and saving an empty
      selection removes every association.
- [x] Multiple selected tags match transactions carrying any selected tag;
      Untagged matches only transactions with no tags.
- [x] Interaction tests, full tests, typecheck, lint, and formatting checks pass;
      the worktree contains no unintended changes.
