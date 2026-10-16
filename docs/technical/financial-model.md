# Financial model

This document is the current accounting contract. All monetary values are safe
integer minor units. UI calculators may use decimal intermediates, but round
once before crossing into Application. Positive ledger amounts add money and
negative amounts remove it.

## Sources and derived values

Accounts, transactions, category allocations, targets, and target snoozes are
source records. Account balances, Assigned, Activity, Available, Ready to
Assign, target progress, and reports are derived. A screen must not maintain a
second financial truth.

Allocation totals remain the accounting source for Assigned. Each change also
records one assignment movement from Ready to Assign or a category to another
location. Movements explain how a total changed but do not replace account
transactions and are not used as a competing balance.

For a category and month:

```text
Available = previous Available + Assigned + Activity
```

Availability rolls forward and may be negative. Moving money changes
allocations, not the ledger. A target recommends an allocation and never writes
one automatically.

Assignment movement history follows the current category structure. Category
deletion maps that category to Ready to Assign; category replacement maps it to
the replacement. Both movement endpoints are rewritten and movements that then
have identical endpoints disappear. This is a user-facing historical
reinterpretation, not an immutable audit log.

For a category's monthly Available chart, the previous month's Available is the
opening point. A movement contributes positively when the category is its
destination and negatively when it is its source. Movements before the budget
month and migration baselines are placed on day 1; post-month corrections are
placed on the final day and remain identified as retroactive. Same-day movement
effects are aggregated and applied before that day's signed Activity. The final
point must therefore satisfy the Available accounting identity above.

The current month's series is evaluated only through today's local date; its
calendar axis still covers the complete month. Past months close on their final
day. Checkpoint values are derived from the same series and do not persist a
second balance.

## Accounts

Cash accounts may be on-budget or tracking. Credit accounts are on-budget;
tracking accounts and loans are outside Budget. Only owned value in on-budget
accounts contributes to Ready to Assign. Credit debt never creates budgetable
cash, while a positive credit balance can contribute owned value.

Working balance includes applicable transactions. Cleared balance includes
cleared and reconciled entries. A reconciliation records that the ledger
matched at that moment; it does not make user data immutable. Reconciled
entries retain their account and status, warn before balance-affecting edits,
and otherwise recalculate the same derived balances as any ledger correction.

## Standard transaction classification

The signed amount and optional category are the persisted truth. `Inflow` and
`Outflow` are commands, not a second stored direction. Classification applies
only to standard on-budget transactions; opening balances, transfers, and
reconciliation adjustments keep their structural semantics.

| Signed amount | Category | Derived meaning        | Ready to Assign | Category Activity |
| ------------- | -------- | ---------------------- | --------------- | ----------------- |
| positive      | none     | Ready-to-Assign inflow | increases       | unchanged         |
| positive      | normal   | category inflow        | unchanged       | increases         |
| negative      | normal   | category expense       | unchanged       | decreases         |
| negative      | none     | Uncategorized expense  | decreases       | unchanged         |

`Uncategorized` is a virtual expense state, not a category row. Categorizing
such an expense removes its provisional Ready-to-Assign reduction and applies
the same signed amount to category Activity exactly once.

Category inflows do not modify Assigned and do not persist a reimbursement
classification or purchase relationship. Reports treat Ready-to-Assign inflows
as Income and category inflows as offsets to signed category spending.

## Monthly funding and future assignments

Budget periods and rollover are monthly. Allocations across every month reserve
one global pool of existing on-budget cash. Later allocations are visible from
an earlier month but are not counted as newly free money. Earlier use can create
a chronological deficit in a later month without rewriting that allocation.

Uncategorized cash expenses reduce the pool from their transaction month. New
income or changed allocations recompute the chain. Overspending stays visible
and is not auto-covered.

## Transfers and credit payments

A transfer is exactly two equal and opposite legs under one transaction group.
Create, update, and delete are atomic. Internal transfers do not count as
Income or Spending. Cash-to-credit payments may use the automatic linked credit
payment category. A reconciled leg protects the pair.

Cross-boundary Budget/Tracking category treatment is not implemented; see
[RFC 0002](../rfc/0002-cross-boundary-transfers.md).

## Targets

Weekly targets count occurrences in the current month; monthly targets directly
define that month's need; yearly and dated targets divide remaining need across
remaining months. Set-aside and refill semantics determine how rollover affects
the recommendation. A snooze is keyed by category and month and suppresses the
recommendation only for that month.

See [ADR 0002](../adr/0002-envelope-budgeting-domain-rules.md) for the accepted
rationale.
