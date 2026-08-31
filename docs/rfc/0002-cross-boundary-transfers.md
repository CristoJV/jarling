# RFC 0002: Cross-boundary transfers

- Status: Draft
- Origin: Category Inflows P3
- Last reviewed: 2026-08-31

## Problem

Transfers fully inside Budget or fully inside Tracking move balances without
creating budget Income or Spending. A transfer between an on-budget account
and a tracking account crosses the budget boundary and needs one explicit
budget treatment. Jarling does not yet offer the complete category-aware model
described here.

This is independent from standard Category Inflows. Discovering the gap while
implementing them did not make this proposal part of that feature.

## Motivation

Without an explicit boundary policy, money moving out to Tracking cannot be
reliably treated as category spending, and money moving into Budget cannot be
reliably directed to Ready to Assign or a category. Treating both transfer legs
as ordinary activity would double count.

## Proposal

Keep a transfer as two equal and opposite legs in one transaction group. Apply
budget treatment exactly once on the on-budget leg:

| Direction             | Proposed treatment                              |
| --------------------- | ----------------------------------------------- |
| on-budget ↔ on-budget | no user category; no Income or Spending         |
| tracking ↔ tracking   | no category; Net Worth balances only            |
| on-budget → tracking  | normal category required on negative budget leg |
| tracking → on-budget  | RTA default or category on positive budget leg  |

For Tracking → Budget, Ready to Assign uses no category and counts as Income;
a normal category increases its Activity/Available and does not count as
Income. The tracking leg never carries the category or a second budget effect.

Credit-account combinations must be characterized before activation. If they
need a separate payment-funding redesign, the initial accepted scope should
exclude them rather than silently apply cash rules.

## Pair invariants

- Exactly two legs, distinct open accounts, common magnitude, opposite signs,
  equal date, and compatible status.
- The pair sums to zero and is created, edited, deleted, and reconciled as one
  atomic operation.
- At most one user-selected category, only on the on-budget leg of a
  cross-boundary pair; the tracking leg never has one.
- Automatic credit payment categories retain their narrow internal exception.
- Changing accounts or reversing direction clears any now-invalid treatment.

Row-level SQLite checks cannot validate the complete pair. Domain/Application
and portability validation must enforce the cross-row invariants.

## User experience

Transfer Editor derives the boundary from the two selected accounts. It shows
no treatment for same-side transfers, requires Category for Budget → Tracking,
and defaults to Ready to Assign while allowing Category for Tracking → Budget.
Changing or swapping accounts recalculates and clears incompatible choices.
Save remains unavailable for a closed account, identical accounts, missing
required treatment, or an invalid pair.

The existing configurable category selector may be reused, but Transfer Editor
owns its copy and rules so standard New Transaction behavior does not change.

## Persistence and portability impact

At review time, SQLite schema and portable backup are version 3. The current
row constraint and backup validator reject a category on a positive transfer
leg, so the proposal may require the next schema migration and backup version.
Versions must be rechecked when the RFC is accepted; document numbers are not a
promise to create v4.

If still required, one narrow forward migration should recreate only the
affected constraint, preserve records/indexes/foreign keys, update the fresh
schema to the same final definition, and run transactionally. No direction or
reimbursement column and no historical backfill should be added.

The portable contract must then accept the new state while migrating old
snapshots without inventing treatment. Restore must reject orphaned,
unbalanced, double-categorized, or tracking-categorized pairs before changing
the active database. JSON and `.jarling` continue through the same validator.

## Alternatives

- Treat every cross-boundary transfer as internal: rejected because it hides a
  real budget boundary crossing.
- Model the operation as unrelated standard transactions: rejected because the
  pair can drift and lose atomic editing/reconciliation.
- Put categories on both legs: rejected because it double counts.
- Include this work implicitly with Category Inflows: rejected because it
  multiplies schema, backup, credit, UI, and migration risk for an independent
  feature.

## Risks

- Incorrect boundary classification can create or remove money twice.
- Credit payment funding may not share cash semantics.
- Editing one leg or restoring an invalid pair can violate ledger integrity.
- A portable-format change creates compatibility obligations.

## Proposed phases

1. Validate the product need and characterize existing internal, tracking, and
   credit transfers.
2. Define and test one pure boundary-policy model.
3. Adapt create/update/delete and Transfer Editor without persistence changes
   where possible.
4. If needed, add one narrow migration and fresh-schema update.
5. If valid portable states change, evolve and migrate the backup contract once.
6. Test Budget, Reports, reconciliation, atomicity, fresh install, upgrade, and
   both backup formats.
7. Record the accepted final design in an ADR and update current documentation.

## Acceptance scenarios

| Scenario                            | Expected result                                 |
| ----------------------------------- | ----------------------------------------------- |
| Budget ↔ Budget                     | balances change; RTA/reports do not             |
| Tracking ↔ Tracking                 | tracking balances and Net Worth only            |
| Budget → Tracking                   | category required; one Activity/Spending effect |
| Tracking → Budget to RTA            | one RTA/Income effect                           |
| Tracking → Budget to Category       | one Activity effect; no Income                  |
| account change or reversed pair     | incompatible treatment is cleared               |
| failure saving the second leg       | complete rollback                               |
| edit or delete                      | both legs remain equal, opposite, and atomic    |
| one reconciled leg                  | accounts fixed; confirmed pair edit is atomic   |
| closed/same account or invalid pair | rejected before persistence                     |
| old backup                          | migrates without invented categories            |
| invalid restored pair               | rejected; active plan remains intact            |

## Exit criteria

Every pair type has one unambiguous treatment, boundary effects occur exactly
once, category placement is constrained to the budget leg, pair mutations are
atomic, and fresh/upgrade/portable paths accept exactly the same valid states.
