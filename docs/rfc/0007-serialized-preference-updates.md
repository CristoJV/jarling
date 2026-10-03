# RFC 0007: Serialized preference updates

- Status: Draft
- Last reviewed: 2026-10-03

## Problem

Concurrent preference changes can each merge against the same stale snapshot.
The later write may therefore discard a change that completed just before it.

## Proposal

Serialize writes inside the preferences provider and apply each patch to the
latest committed value. Expose the same API to callers so screens do not need
locks or knowledge of persistence ordering.

## Impact and exit criteria

Test overlapping theme, lock and budget-format updates, including one failed
write. Successful independent patches must survive in call order and a failure
must leave a coherent in-memory and persisted value.
