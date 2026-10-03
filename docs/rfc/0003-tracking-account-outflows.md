# RFC 0003: Standard outflows from tracking accounts

- Status: Draft
- Last reviewed: 2026-10-03

## Problem

The transaction editor permits ordinary expenses on tracking accounts, while
the application validation rejects any categorized transaction on those
accounts. The default expense flow can therefore end in an avoidable error.

## Proposal

Define one explicit rule for tracking-account outflows. Prefer allowing an
uncategorized outflow, hiding the category selector and explaining that it does
not affect the budget. Keep transfers and opening/reconciliation entries
unchanged.

## Impact and exit criteria

Align editor defaults, validation and transaction tests. A user must be able to
record a valid tracking outflow without first discovering a hidden constraint;
categorized tracking movements must still be rejected.
