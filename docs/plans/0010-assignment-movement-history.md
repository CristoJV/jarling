# Assignment movement history

## Goal

Record assignment changes independently from account transactions and show the
selected month's Available evolution in Category Details. History follows the
current category structure: deleting or replacing a category reinterprets its
past movements instead of preserving an immutable audit trail.

## Phase 1 — Persistent movement history and lifecycle rules

- [x] Add the movement domain model and repositories.
- [x] Record direct assignments and Move Money atomically with allocation totals.
- [x] Reinterpret both movement endpoints when categories are deleted or replaced;
      remove movements that collapse onto the same location.
- [x] Add schema migration 4 with one baseline movement per non-zero existing
      category/month allocation.
- [x] Include movements in plan deletion, sample data, JSON export, encrypted
      backups, validation, migration, and restore.
- [x] Record the mutable-history decision in an ADR and synchronize financial,
      persistence, and user documentation.

Checkpoints:

- [x] Direct assignment, de-assignment, RTA moves, and category moves each produce
      exactly one movement and no-op edits produce none.
- [x] Allocation totals and movement sums agree after category deletion and
      replacement.
- [x] Fresh schema, v3 database upgrade, old-backup migration, and current-backup
      round trips pass.
- [x] Application, persistence, typecheck, and lint checks pass for the phase.

## Phase 2 — Category Details monthly chart

- [x] Derive a daily step series for one category and budget month.
- [x] Place pre-month and migrated movements on day 1; place later retroactive
      changes on the month's final day.
- [x] Add an accessible Assigned-history chart directly below the balance card.
- [x] Add English and Spanish copy and document the user-visible behavior.

Checkpoints:

- [x] Positive and negative movements, same-day aggregation, leap months, and
      retroactive placement have unit coverage.
- [x] The final plotted value equals the selected month's current Assigned total.
- [x] Full tests, typecheck, lint, and formatting checks pass.

## Phase 3 — Daily Available evolution

- [x] Start the monthly series with the previous month's Available and combine
      each day's assignment movements and signed Activity in chronological order.
- [x] Replace the step plot with a sloped balance plot, a dotted zero threshold,
      threshold-aware colors, and localized Monday/edge axis markers.
- [x] Cover ordinary and linked credit-payment category activity and synchronize
      the current user and financial-model documentation.

Checkpoints:

- [x] The plotted closing value equals the category's current Available amount.
- [x] Same-day assignment and Activity remain separate segments; any portion below
      zero is red and the opening point is yellow.
- [x] Month edges, Monday guides, localized labels, leap months, and zero crossings
      have unit coverage.
- [x] Full tests, typecheck, lint, and formatting checks pass.

## Phase 4 — Current-day horizon and inspectable checkpoints

- [x] Color the complete balance path only by its position relative to zero.
- [x] Stop the current month's path on today's date while retaining the full
      calendar-month axis.
- [x] Reveal compact balance labels on press for the opening, day 1, Mondays,
      and the last plotted day.

Checkpoints:

- [x] Above-zero, below-zero, crossing, and exactly-zero segments have explicit
      coverage.
- [x] Current, past, and leap-month horizons have unit coverage.
- [x] Checkpoint selection is deduplicated and the interaction is accessible.
- [x] Full tests, typecheck, lint, and formatting checks pass.

## Phase 5 — Compact non-overlapping value labels

- [x] Remove consecutive checkpoint points whose balance has not changed while
      always retaining the first point.
- [x] Size value boxes to their content and place them without overlap.
- [x] Connect every visible value box to its checkpoint with a fine white line.

Checkpoints:

- [x] Deduplication, adaptive sizing, and collision-free placement have unit
      coverage.
- [x] Connectors remain unambiguous after labels are displaced.
- [x] User documentation and the complete quality suite pass.
