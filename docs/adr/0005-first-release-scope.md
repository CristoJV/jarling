# ADR 0005: First-release scope and deferred CSV import

- Status: Accepted
- Date: 2026-08-20

## Context

The configurable CSV importer is useful but expands the release surface across
parsing, duplicate detection, category semantics, backup format, UI, and real
bank-file compatibility. The first release should validate the budgeting core
before taking on that variability.

## Problem

Shipping unfinished import infrastructure would expand schema, UI, test, and
support obligations before the budgeting core had a stable release boundary.

## Decision

Version 1 ships budgeting, accounts, transactions, transfers, reconciliation,
targets, reports, settings, export, and backup/restore. CSV import is excluded
from the release build and documentation.

Its implementation is retained on `feature/csv-import`, while the first
release is stabilized on `release/0.1`. The feature will be rebased and reviewed
as a complete vertical slice before a later merge. It will not be hidden behind
a dormant production UI flag.

Scheduled transactions, persistent payee management, bank connectivity, cloud
sync, and multi-budget support also remain outside version 1.

## Consequences

- The initial test and support matrix stays bounded.
- Version 1 has no unused CSV tables, permissions, translations, or backup
  fields.
- The CSV branch may require conflict resolution after release hardening.
- Scope additions require an explicit release decision rather than incidental
  merging.

## Alternatives considered

- Shipping the importer as an experimental toggle was rejected because dormant
  code still affects schema and maintenance.
- Deleting the implementation was rejected because it is already isolated and
  can be validated later.
