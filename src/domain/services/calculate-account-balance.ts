import type { Transaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

export function calculateAccountBalance(
  transactions: readonly Transaction[],
): Money {
  return transactions.reduce(
    (balance, transaction) => balance.add(transaction.amount),
    Money.zero(),
  );
}
