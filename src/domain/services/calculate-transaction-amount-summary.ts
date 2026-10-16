import type { Transaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

export type TransactionAmountSummary = Readonly<{
  income: Money;
  spending: Money;
  net: Money;
}>;

export function calculateTransactionAmountSummary(
  transactions: readonly Transaction[],
): TransactionAmountSummary {
  let incomeCents = 0;
  let spendingCents = 0;

  for (const transaction of transactions) {
    if (transaction.kind === 'transfer') continue;

    if (transaction.amount.cents > 0) {
      incomeCents += transaction.amount.cents;
    } else {
      spendingCents += Math.abs(transaction.amount.cents);
    }
  }

  return {
    income: Money.fromCents(incomeCents),
    spending: Money.fromCents(spendingCents),
    net: Money.fromCents(incomeCents - spendingCents),
  };
}
