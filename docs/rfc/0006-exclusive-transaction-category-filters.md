# RFC 0006: Exclusive transaction category filters

- Status: Draft
- Last reviewed: 2026-10-03

## Problem

The category and Uncategorized transaction filters can both remain active.
That state is contradictory and its result depends on lower-level filter
semantics rather than an obvious UI rule.

## Proposal

Represent the selection as one discriminated value: `all`, `uncategorized` or
`category(id)`. Keep account, date and search filters independent.

## Impact and exit criteria

Update filter state, deep-link normalization and chip interactions together.
Selecting one category mode must replace the previous one, and clearing it must
reliably return to `all`.
