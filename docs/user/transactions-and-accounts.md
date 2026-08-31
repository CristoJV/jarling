# Transactions and accounts

## Outflows and inflows

New transactions use an explicit **Outflow** or **Inflow** command while you
enter a positive amount.

- Outflow to a category records spending and lowers its Activity and Available.
- Outflow without a category is Uncategorized spending.
- Inflow to **Ready to Assign** is new income available to budget.
- Inflow directly to a category is money returning to that envelope, such as a
  refund or a shared-expense repayment. It increases Activity and Available,
  but never Assigned or Ready to Assign.

Changing direction clears the old destination so an inflow category is not
silently reused as an outflow destination or vice versa. Each transaction uses
its actual date; a later refund does not rewrite an earlier month.

## Transaction details and search

A standard transaction can include an account, payee, category, date, memo,
and uncleared, cleared, or reconciled status. Payees are discovered from
existing transaction names rather than maintained as a separate catalogue.

Search can be refined step by step using text, payee, memo, status, account,
category, and date suggestions. Applied filters remain removable. Swipe a
transaction beyond the delete threshold to request deletion confirmation.
Reconciled transactions are protected from ordinary editing and deletion.

## Transfers

A transfer moves money between two accounts through two equal and opposite
ledger entries. It changes account balances but an internal on-budget transfer
does not create income or spending. Transfers are saved, edited, and deleted as
one operation; a reconciled leg protects the pair.

Payments from cash to a credit account can interact with the linked credit-card
payment category. Transfers that cross between Budget and Tracking do not yet
offer the proposed category treatment described in
[RFC 0002](../rfc/0002-cross-boundary-transfers.md).

## Balances and reconciliation

- **Working** includes all applicable transactions.
- **Cleared** includes cleared and reconciled transactions.
- **Uncleared** is the difference between Working and Cleared.

Reconciliation compares Jarling's cleared balance with the institution's real
balance. If they match, the included transactions become reconciled. If they do
not, Jarling explains the difference and can create an explicit adjustment only
after confirmation; it never hides a discrepancy.

Tracking accounts and loans affect Net Worth but not Ready to Assign or budget
Income/Spending.
