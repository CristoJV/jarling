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

Categories with historical activity cannot simply disappear: deletion asks
for a replacement category and reassigns their records. If there is money but
no activity, deleting returns it to Ready to Assign. Protected system
categories cannot be deleted or repurposed.

See [Transactions and accounts](transactions-and-accounts.md) for how inflows,
outflows, and transfers affect these amounts.
