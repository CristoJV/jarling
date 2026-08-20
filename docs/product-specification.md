# Jarling product specification

## Status and purpose

This document is the stable functional contract for Jarling 1.0.0. It defines
what the first public release supports without duplicating implementation
history or test counts. Architectural rationale lives in the
[ADRs](adr/README.md), interaction rules in [interaction design](interaction-design.md),
and release evidence in the [release checklist](release-checklist.md).

Jarling is a local-first personal finance application based on envelope
budgeting. It helps users decide what the money they already have must do next,
then keeps that plan accurate through transactions and reconciliation.

## Product principles

1. Plan before spending: the budget is more than an expense report.
2. Assign only money already owned; debt does not create budgetable cash.
3. Keep trade-offs explicit by moving money between envelopes.
4. Derive balances and reports from source records instead of persisting a
   second source of truth.
5. Keep the core experience local and independent from a Jarling account or
   cloud service.

## Financial contract

### Money and signs

- Money is stored as safe integer minor units. Version 1 formats those values
  using the selected currency, number format, and symbol placement.
- Positive transactions add money; negative transactions remove money.
- Floating-point numbers are accepted only as calculator input and are rounded
  to integer minor units before they enter the financial model.

### Accounts

- Cash accounts hold owned funds: checking, savings, and cash.
- Credit accounts hold borrowed funds: credit cards and lines of credit.
- Tracking accounts and loans affect net worth but not Ready to Assign.
- Working balance includes every applicable transaction. Cleared balance
  includes cleared and reconciled transactions; uncleared balance is their
  difference.
- Reconciliation compares the cleared balance with the institution's balance.
  Matching transactions become immutable. A discrepancy may create an
  explicit, confirmed reconciliation adjustment; it is never hidden.

### Budget

- A category allocation assigns money for one month; it is not a transaction.
- Category Available is derived from previous availability, current Assigned,
  and current Activity. It rolls forward and may be negative.
- Ready to Assign is the residual between budgetable cash and all envelope
  balances. A credit account contributes only a positive balance; debt never
  increases Ready to Assign.
- Moving money supports Ready to Assign to category, category to Ready to
  Assign, and category to category. Compound writes are atomic.
- Overspending remains visible. Jarling does not silently move money to cover
  it.

### Categories

- Fresh plans contain the groups Uncategorized, Bills, Needs, Subscriptions,
  and Wants, with useful emoji-prefixed defaults.
- `❓ Uncategorized` has a stable system identity and is the default for new
  expenses. Its group and identity cannot be renamed, hidden, reordered, or
  deleted.
- Every standard expense must reference a category, including restored data.
  Income, opening balances, transfers, and reconciliation adjustments retain
  their own category rules.
- Credit accounts have linked payment categories whose available balance is
  derived from funded card spending, refunds, allocations, and payments.

### Transactions and transfers

- Transactions support payee, category, account, date, memo, and uncleared,
  cleared, or reconciled status.
- Payees are unique names derived from transactions rather than a second
  persistent catalogue.
- A transfer is two equal and opposite legs joined by a transaction group and
  committed atomically. The accounts must be open and different.
- A payment to a credit account may assign the source leg to that account's
  linked payment category so the envelope movement remains visible.
- Editing or deleting either leg operates on the pair. A reconciled leg
  protects the whole pair.
- Independent relationships such as a Bizum follow-up use typed transaction
  links; deleting a transaction removes the link, not the related transaction.

### Targets

- Categories support weekly, monthly, yearly, and custom targets.
- Recurring targets support set-aside and refill behavior where applicable;
  custom targets support set aside, fill up to, and target balance semantics.
- Targets calculate the amount needed for the selected month from their start,
  recurrence, due date, funding already recorded, and spending behavior.
- A target recommends funding and exposes underfunded, on-track, completed, or
  overdue progress. It never assigns money automatically.

### Reports

Reports are derived without persisted aggregate tables:

- Spending Breakdown groups net spending by category.
- Income vs Spending compares six months and excludes opening balances and
  transfers from income.
- Net Worth combines budget and tracking accounts while separating assets and
  debt.

## Application capabilities

- Four primary tabs: Budget, Accounts, Transactions, and Reports.
- English and Spanish selected from the device language.
- Light, dark, and system-matched themes.
- Budget name, currency, number format, currency placement, and date format.
- Optional interface lock using device credentials.
- Readable JSON export with an explicit privacy warning.
- Independently password-encrypted `.jarling` backup and transactional restore.
- Plan deletion with explicit confirmation and recreation of protected default
  categories.

The active SQLite database is not encrypted by Jarling and lives in the
platform's private application directory. See
[ADR 0004](adr/0004-data-protection-and-portability.md) for the exact security
boundary.

## Version 1 boundaries

The first release deliberately excludes CSV import, bank connectivity, cloud
sync, scheduled transactions, persistent payee management, multiple budgets,
and active-database encryption. These are not dormant production toggles.

Demo-data controls are development tooling only and must not be reachable in a
production build.

## Quality contract

- Domain and Application own financial rules; Presentation never runs SQL.
- SQLite adapters enforce foreign keys and structural constraints in addition
  to application validation.
- Multi-record financial writes use the application `UnitOfWork` and roll back
  completely on failure.
- Fresh installs create schema version 1 directly. The retained migration
  runner is forward-only and begins with the first post-release schema change.
- A release candidate must pass the automated and manual gates in
  [release-checklist.md](release-checklist.md).
