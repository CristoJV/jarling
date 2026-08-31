import type { Transaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

export type AccountBalanceState = Readonly<{
  working: Money;
  cleared: Money;
  uncleared: Money;
  clearedCount: number;
  unclearedCount: number;
}>;

/**
 * Derives every account balance view from the same transaction status rules.
 * Reconciled transactions are part of the cleared balance; uncleared ones are
 * visible only in the working balance.
 */
export function calculateAccountBalanceState(
  transactions: readonly Transaction[],
): AccountBalanceState {
  let workingCents = 0;
  let clearedCents = 0;
  let clearedCount = 0;

  for (const transaction of transactions) {
    workingCents += transaction.amount.cents;
    if (transaction.status !== 'uncleared') {
      clearedCents += transaction.amount.cents;
      clearedCount += 1;
    }
  }

  return {
    working: Money.fromCents(workingCents),
    cleared: Money.fromCents(clearedCents),
    uncleared: Money.fromCents(workingCents - clearedCents),
    clearedCount,
    unclearedCount: transactions.length - clearedCount,
  };
}

export function calculateAccountBalance(
  transactions: readonly Transaction[],
): Money {
  return calculateAccountBalanceState(transactions).working;
}
