# Targets and reports

## Targets

Targets tell you how much to fund; they never assign money automatically. Their
status can be underfunded, on track, complete, or overdue.

- A weekly target counts the selected weekday occurrences in the month. When a
  target is created mid-month, **Include previous weeks** decides whether past
  occurrences are included.
- A monthly target directly defines the amount needed that month.
- A yearly or target-by-date goal divides the remaining need across the
  remaining months, including the due month, and recalculates as progress
  changes.
- Custom targets support set aside, fill up to, and balance-oriented behavior.

**Set Aside** expects the month's complete target regardless of money rolled
over. **Refill Up To** lets rolled-over Available reduce the new amount needed.

A target can be snoozed for one selected month, regardless of target type.
Snoozing suppresses its funding prompt for that month without deleting or
changing the target. It can be reversed, and normal recommendations resume in
other months.

## Progress

Weekly progress uses one segment per included weekly occurrence; a monthly
target uses one segment. Regions inside a segment show funded spending, funded
available money, and unfunded spending without creating extra segments. A
single proportional overflow segment may represent amounts beyond the target.
Color is accompanied by text so state is not communicated by color alone.

## Reports

- **Spending Breakdown** groups dated net category spending.
- **Income vs Spending** compares periods and treats inflows to Ready to Assign
  as income.
- **Net Worth** combines included assets and debt, including tracking accounts.

An inflow sent directly to a category reduces that category's net spending. It
is not income. Opening balances and internal transfers are excluded from
Income/Spending. Reports respect transaction dates: a September refund does not
rewrite an August report, though a range containing both months includes both
movements.

Signed net credits are preserved by the calculations. A richer dedicated
presentation for credit-only categories remains a future proposal in
[RFC 0001](../rfc/0001-signed-net-spending-presentation.md).
