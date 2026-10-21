# ADR 0017: SQLite owns filtered transaction aggregates

- Status: Accepted
- Date: 2026-10-21

## Context

The Transactions screen shows a paginated list and totals for the complete
filtered result.

## Problem

Loading every matching transaction to sum it in application memory scales with
ledger size. Duplicated filter construction could also make totals disagree with
the visible query semantics.

## Decision

Expose amount aggregation through `TransactionRepository`. SQLite computes
income and spending with conditional sums, excluding transfers, while list and
aggregate queries share one parameterized predicate builder. The in-memory
repository retains the domain calculator as its equivalent implementation.

## Alternatives considered

Summing all matching entities in the use case was rejected because it allocates
the full result. Maintaining a second hand-written aggregate filter was rejected
because its semantics could drift.

## Consequences

Aggregation cost stays in SQLite and application memory is bounded. New
transaction filters must be added once to the shared predicate builder and
covered for both rows and totals.
