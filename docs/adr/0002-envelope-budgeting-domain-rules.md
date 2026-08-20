# ADR 0002: Envelope-budgeting financial invariants

- Status: Accepted
- Date: 2026-08-20

## Context

Small inconsistencies in budget calculations compound into incorrect balances.
The source of truth and sign conventions therefore need to be stable across UI,
reports, backups, and future imports.

## Decision

- Money is represented as safe integer minor units; floating-point values are
  never persisted or used for accounting.
- Positive transactions add money and negative transactions remove money.
- Only balances in on-budget accounts contribute to Ready to Assign.
- Assigned, Activity, Available, account balances, reports, and Ready to Assign
  are derived values, not separately persisted totals.
- Available rolls forward across months and may become negative.
- Moving money changes allocations only; it does not create a transaction.
- A target recommends funding but never moves money automatically.
- A transfer is two opposite transaction legs committed atomically under one
  transaction group.
- Reconciled transactions are immutable unless reconciliation is explicitly
  undone by a future product decision.

## Consequences

- Every write path must preserve the accounting identity.
- Presentation receives computed results from Domain/Application.
- Reports can be rebuilt from source data.
- Any future currency with a different number of minor units requires a new
  money/currency decision rather than silently changing the current contract.

## Alternatives considered

- Persisting cached budget totals was rejected because stale values could
  become a second source of truth.
- Decimal floating-point input was rejected because rounding behavior would be
  platform-dependent.
