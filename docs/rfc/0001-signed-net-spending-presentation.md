# RFC 0001: Signed net-spending presentation

- Status: Draft
- Origin: Category Inflows P2
- Last reviewed: 2026-08-31

## Problem

Jarling already preserves signed category net spending. For example, an expense
of 100 and a category inflow of 150 produce net spending of -50. The existing
presentation must not lose that sign, but it does not yet provide a dedicated,
polished explanation for categories or periods that end in net credit.

## Motivation

Ordinary percentage charts become misleading if negative values are clamped to
zero, displayed as positive spending, or included in a positive composition
denominator. A period containing only category inflows is also different from a
period with no activity.

## Proposal

Keep all financial calculations and dated-report rules unchanged. Build a pure
report view model with two presentation groups:

1. Positive category net spending participates in the spending composition.
2. Negative category net spending appears in a separate **Net credits** group.

Only values greater than zero contribute to the composition denominator. Zero
values occupy no percentage. If the denominator is zero, the composition is
empty instead of dividing by zero. The report-level total remains the signed
algebraic sum, including Uncategorized activity.

The displayed magnitude of an individual credit may be positive beside an
explicit `Net credit` label, but Domain retains the negative value. Periods
with no activity, only credits, zero net activity, and positive spending each
receive distinct text. Color is not the only signal.

This RFC may also refine the hierarchy and accessibility of the Inflow category
selector, but it must not change its defaults, validation, or financial effect.

## Time and filtering

Movements remain in their real periods. An August purchase and September refund
remain separate in monthly reports; a range including both combines their
signed values. Date boundaries, grouping, averages, extrema, and filters must
preserve signs. Transfers, opening balances, reconciliation adjustments, and
tracking-only activity remain excluded before the presentation model runs.

## Alternatives

- Clamp credits to zero: rejected because it changes the truth.
- Mix negative categories into a pie denominator: rejected because percentages
  become unintuitive or invalid.
- Persist a reimbursement type: rejected for this proposal; category inflows
  intentionally express their effect without a second classification.
- Make net spending the only headline: not required. Copy such as **Spending**,
  **Category inflows**, and **After category inflows** may be clearer after UX
  validation.

## Expected impact

Changes should remain in report view models, components, localization, and
accessibility tests. No ledger, Budget, SQLite, schema, migration, or backup
change is expected.

## Risks

- Copy may imply that every category inflow is a refund, which Jarling does not
  persist or know.
- Charts may accidentally recalculate or clamp Domain values.
- Average and comparison components may retain unsigned assumptions.
- Long currency formats and screen readers may make the new grouping unclear.

## Proposed phases

1. Validate English copy and wireframes for negative, zero, and positive totals.
2. Freeze signed Domain inputs with characterization tests.
3. Implement a pure positive-composition/net-credit view model.
4. Add empty, credits-only, and zero-denominator states.
5. Integrate accessible light/dark components and regional number formats.
6. Verify date ranges, averages, extrema, and filter changes.

## Acceptance scenarios

| Scenario                                | Expected result                                    |
| --------------------------------------- | -------------------------------------------------- |
| `-100 +150` Clothing                    | Net credits shows 50; Domain value remains -50     |
| only `+50` Clothing                     | credits-only state, not an empty report            |
| `-100 +100` Clothing                    | zero net; no positive composition share            |
| two categories at 100                   | positive composition is 50/50                      |
| one positive and one negative net       | only the positive value is in the denominator      |
| every category is zero or negative      | no division, negative percentage, or phantom bar   |
| August purchase, September inflow       | each monthly view keeps its dated signed movement  |
| combined August–September range         | algebraic combination is exact                     |
| switching Category inflow to RTA        | spending and income views both update consistently |
| light/dark, long currency, screenreader | meaning and values remain clear                    |

## Exit criteria

The UI distinguishes spending, zero, and net credit without changing Domain
values; percentages use only positive net spending; signed totals and time
boundaries remain exact; and no persistence or Budget semantics change.
