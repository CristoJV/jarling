# ADR 0009: Transaction deletion is available in the editor

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

Transaction deletion was only discoverable through a list swipe.

## Problem

Users expect an existing transaction's edit screen to expose its destructive
action.

## Decision

Show a confirmed red Delete action beside Save only when editing. It delegates
to the existing transaction deletion use case and preserves transfer and
reconciliation warnings.

## Alternatives considered

Keep deletion exclusively in the transactions list.

## Consequences

Deletion is discoverable from either context without duplicating domain policy.
