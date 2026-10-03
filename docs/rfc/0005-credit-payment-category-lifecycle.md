# RFC 0005: Credit payment category lifecycle

- Status: Draft
- Last reviewed: 2026-10-03

## Problem

Renaming a credit account does not rename its protected payment category. The
account and category can drift apart even though they represent one concept.

## Proposal

Choose and enforce a single ownership rule. The simplest option is to rename
the linked category transactionally with the account unless a future feature
explicitly allows a custom category label.

## Impact and exit criteria

Keep account/category repository writes atomic and invalidate reference caches
once. Tests should cover rename success, rollback on failure and restored
backups with older mismatched names.
