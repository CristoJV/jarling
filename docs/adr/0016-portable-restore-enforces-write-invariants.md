# ADR 0016: Portable restore enforces write invariants

- Status: Accepted
- Date: 2026-10-21

## Context

Backups are untrusted input and can bypass application use cases when restored.
Tags and assignment movements contain limits and temporal relationships that are
not fully expressible through SQLite foreign keys.

## Problem

Structural validation alone could restore states the application cannot create,
including asymmetric transfer tags, excessive associations, and malformed dates.

## Decision

Validate portable data against the same domain invariants as normal writes before
replacing the database. Instants use canonical UTC ISO 8601, movement dates must
be real calendar dates, transactions carry at most 20 tags, and both transfer
legs must carry the same tag set.

## Alternatives considered

Relying only on SQLite constraints was rejected because cross-row transfer and
association-count rules cannot be represented by the current schema.

## Consequences

Corrupt or hand-edited backups fail before mutation. Future write invariants must
also be considered explicitly by snapshot migration and semantic validation.
