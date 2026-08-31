# ADR 0006: Atomic SQLite application writes

- Status: Accepted
- Date: 2026-08-20

## Context

Transfers, reconciliation, account creation, budget moves, plan deletion, and
default-data setup perform multiple repository writes. Partial persistence
would break financial invariants. Expo's exclusive transaction API requires
queries to use the transaction object supplied to its callback.

## Problem

A failure between related writes could leave transfers or financial state only
partially persisted, and using the wrong Expo connection could falsely appear
transactional.

## Decision

All compound application writes run through one `UnitOfWork`. On native
platforms, the SQLite adapter opens an exclusive transaction and exposes a
transaction-aware connection to every repository composed for that unit of
work. Application write transactions are serialized.

On web, where Expo SQLite does not support exclusive transactions, the adapter
uses the platform transaction API and the same serialized application write
queue. Code must not start unmanaged writes from Presentation.

Migration installation and backup restoration also execute their statements
through the transaction object supplied by Expo SQLite.

## Consequences

- A failed compound operation rolls back all of its writes on native platforms.
- Repositories remain unaware of transaction lifecycle.
- All SQLite repositories in the composition root must receive the
  transaction-aware connection, not the raw connection.
- Web transaction behavior remains constrained by Expo SQLite and needs a
  browser smoke test for every release.

## Alternatives considered

- Calling repositories on the raw connection from an exclusive transaction was
  rejected because Expo does not include those queries in that transaction.
- Passing SQLite transaction objects through Application and Domain was
  rejected because it would invert the dependency boundary.
