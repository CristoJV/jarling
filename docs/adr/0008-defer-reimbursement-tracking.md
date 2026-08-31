# ADR 0008: Defer reimbursement tracking beyond 1.2.0

- Status: Accepted
- Date: 2026-08-30

## Context

Jarling considered tracking expected and received reimbursements for purchases,
such as a shared dinner, a Bizum repayment, or a shop refund. A complete design
would affect the transaction editor, budget activity, credit-card funding,
reports, SQLite, backup/restore, deletion, reconciliation, and historical data.

Simple category inflows are sufficient for the accounting effect needed in
1.2.0: a real positive transaction may return money to a category on its own
date. What remains unproven is relational tracking between an expected or
received reimbursement and an earlier purchase. Shipping speculative tables or
dormant UI for that relationship would increase migration and support costs
before the interaction has been validated.

## Problem

Relational reimbursement tracking would create a large persistence and product
contract when ordinary category inflows already solve the immediate accounting
need.

## Decision

Jarling 1.2.0 supports standard category inflows, but will not introduce
reimbursement entities, purchase matching, schema changes, backup fields, or
hidden feature flags for relational tracking. Existing contextual
`TransactionLink` records remain non-financial and must not be reinterpreted as
reimbursements.

Reimbursement tracking remains a potential future objective. If revisited, the
first implementation should be a small complete vertical slice with these
invariants:

- an expected reimbursement is optional metadata and never creates available
  money;
- only a real positive transaction can record money received;
- the received amount returns to the original category on the inflow date;
- the relationship is directed and amount-bearing, supports partial repayment,
  and cannot exceed either transaction;
- Budget follows real dated activity and account type, including cash, credit,
  and Uncategorized behavior;
- Reports preserve real dates: Spending belongs to the outflow period,
  Reimbursements to the inflow period, and After reimbursements is their
  per-period difference;
- the linked portion is not counted as Income, while balances, reconciliation,
  and Net Worth continue to use the unchanged transaction ledger;
- compound writes are atomic and persisted data participates in migrations,
  backup, restore, deletion, and integrity tests.

The initial UI may support one received transaction linked to one purchase.
Splitting one inflow across several purchases, automatic matching, advanced
search, signed report charts, and editing metadata on reconciled or closed
transactions are separate follow-up decisions rather than launch requirements.

Before implementation, the product flow and report copy must be validated
again. In particular, `Net spending` is a report metric, not a Budget or Target
input.

## Consequences

- Version 1.2.0 keeps its existing schema and backup scope.
- The release can focus on monthly rollover, target snoozing, search, Budget,
  and report refinements already implemented on the branch.
- Users may record a repayment as a normal category inflow. It offsets that
  category's dated net spending, but Jarling will not link it financially to an
  original purchase or calculate a purchase-level final cost.
- A future implementation must add a dedicated financial model; the generic
  contextual link cannot safely express direction, amount, or partial state.
- Deferral avoids committing a public migration before the product behavior is
  convincing.

## Alternatives considered

- Implementing the complete reimbursement design for 1.2.0 was rejected because
  its complexity and regression risk exceed the demonstrated need.
- Extending `TransactionLink` was rejected because optional financial fields
  would mix contextual and accounting relationships.
- Shipping an incomplete implementation behind a production toggle was rejected
  because dormant schema and backup contracts still become maintenance burden.
- Rewriting historical Spending when a later refund arrives was rejected as the
  preferred future default; dated reports should remain deterministic.
