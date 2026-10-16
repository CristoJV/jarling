# Budgeting

## Core amounts

- **Ready to Assign** is owned, on-budget money that has not been given a job.
- **Assigned** is the amount placed in a category for the selected month.
- **Activity** is the signed total of that category's transactions in the
  month. Spending is negative; money returned to the category is positive.
- **Available** is what the category can currently use after previous balance,
  this month's Assigned, and Activity.

Assigned money is not a transaction and Move Money does not change an account
balance. Transactions move real money; assignments decide which envelope owns
it.

## Monthly rollover

Jarling budgets by calendar month. Available category balances, including
negative balances, roll into later months. Weekly, yearly, and custom targets
do not create separate budget periods; they calculate what should be funded in
the current monthly budget.

Assignments made in future months reserve the same finite pool of cash. Jarling
therefore does not show that reserved money as freely assignable in an earlier
month. If an earlier month uses it, the future assignments remain recorded and
Jarling shows the amount being used plus the first later month that becomes
underfunded.

## Funding states

- **Ready to Assign** means unassigned cash is available.
- **Available from Future Assignments** means cash is currently reserved by
  later months but can be reused with a visible consequence.
- **Assigned Too Much** means cumulative assignments exceed budgetable funds.

Overspending is not covered silently. Move Money from Ready to Assign or
another category to resolve it.

## Uncategorized spending

Uncategorized is a review state, not an editable category. A new outflow starts
there until a category is selected. Because the money has already left an
on-budget cash account, it reduces Ready to Assign from its transaction month.
Categorizing it transfers that effect to Category Activity without counting the
expense twice. Budget provides a review action when current-month
uncategorized transactions exist.

## Moving and assigning money

Move Money supports Ready to Assign to category, category to Ready to Assign,
and category to category. It refuses moves that exceed the source category's
available amount. Assigning from Category Details similarly reports
insufficient funds and can lead into Move Money.

Jarling records these assignment changes separately from account transactions.
This history follows the categories that exist now: deleting a category treats
its earlier assignment movements as Ready to Assign movements, while replacing
a category treats its earlier movements as belonging to the replacement. The
history is therefore reinterpreted after category changes and is not an
immutable audit trail.

Category Details shows how Available evolved during its selected month. The
yellow starting point is the previous month's closing Available, placed just
before day 1. Each day then applies assignment changes before that day's signed
Activity. Every portion of the balance path above the dotted zero line is green;
every portion below it is red.

Money assigned before that month and reconstructed migration baselines appear
on day 1. Changes made during the month appear on their local date. A later
correction to an earlier month appears on the month's final day and is identified
as a later correction. Dotted vertical guides mark Mondays; the axis labels only
the first day, Mondays, and the last day in the device language.

For the current month, the balance path stops on today even though the axis
continues through the end of the month. Tapping the chart reveals compact
balance labels for the opening point, day 1, each Monday, and the last plotted
day; tapping again hides them. Consecutive checkpoints with the same balance
are collapsed into the first one. Each compact label is sized to its amount,
placed so it does not overlap another label, and joined to its point by a fine
white line.

Categories with historical activity cannot simply disappear: deletion asks
for a replacement category and reassigns their records. If there is money but
no activity, deleting returns it to Ready to Assign. Protected system
categories cannot be deleted or repurposed.

See [Transactions and accounts](transactions-and-accounts.md) for how inflows,
outflows, and transfers affect these amounts.
