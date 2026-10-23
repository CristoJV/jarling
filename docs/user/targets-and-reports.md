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
available money, and spending beyond all available funds without creating extra
segments. Weekly targets alone may use a proportional overflow segment beyond
their occurrences. Color is accompanied by text so state is not communicated
by color alone.

## Reports

- **Spending Breakdown** groups dated net category spending by week, month, or
  year. It opens on the current month and uses the shortest available comparison
  range by default: four weeks, three months, or two years.
  An interactive donut always preserves the complete category-group composition.
  Its segments have flat, clearly separated ends. Selecting a group subdivides
  only that group's segment into stable dark-to-light category shades; selecting
  a category from the list highlights its shade and replaces every other color
  with an opaque theme-aware grey without changing the donut's scope. Donut
  segments select groups, while only the expandable category list selects
  individual categories. The center shows the selected interval's signed net
  spending, or the selected group/category amount and share, and tapping it
  clears the current selection. Swiping moves between intervals while preserving
  selection.
  The signed stacked history opens with the latest four intervals, an empty
  separator, and the selected range's average as the sixth position; older
  history is available horizontally. The average composition fixes the stack
  order for every interval, and every date includes its corresponding amount.
  Selecting a bar updates the donut and list. A selected group moves to the bar
  baseline and expands in average order. A selected category moves below its
  sibling categories, which remain grouped immediately above it with a less-muted
  grey than unrelated groups. Period total and average follow the same selection.
  The category breakdown orders groups by spending and expands them to expose
  every category, including selectable zero values, using the same stable shades
  as both charts.
  The comparison begins with the interval containing the oldest transaction,
  so averages do not treat earlier unavailable history as zero spending.
  Net credits remain signed, appear below the chart baseline, and do not
  participate in positive composition percentages.
- **Income vs Spending** compares periods and treats inflows to Ready to Assign
  as income. Its centered monthly chart grows upward in green for positive Net
  Income and downward in red for negative Net Income.
- **Net Worth** combines included assets and debt, including tracking accounts,
  and charts monthly closing values from oldest to newest. The chart opens on
  the latest five values and scrolls horizontally to older history. Each month
  also shows its signed change from the previous monthly closing value.

An inflow sent directly to a category reduces that category's net spending. It
is not income. Opening balances and internal transfers are excluded from
Income/Spending. Reports respect transaction dates: a September refund does not
rewrite an August report, though a range containing both months includes both
movements.

Signed net credits are preserved by the calculations and displayed separately
from positive spending. Zero net activity also remains distinct from a period
with no activity. [RFC 0001](../rfc/0001-signed-net-spending-presentation.md)
records the presentation decision.
