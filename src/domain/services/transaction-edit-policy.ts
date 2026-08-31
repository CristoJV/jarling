import type { Transaction } from '@/domain/entities/transaction';

export function transactionAccountLockReason(
  transaction: Transaction,
): 'reconciled' | 'opening_balance' | null {
  if (transaction.status === 'reconciled') return 'reconciled';
  return transaction.kind === 'opening_balance' ? 'opening_balance' : null;
}

export function requiresReconciliationWarning(
  transactions: readonly Transaction[],
  changes: Readonly<{ amountCents: number; date: string }>,
): boolean {
  return transactions.some(
    (transaction) =>
      transaction.status === 'reconciled' &&
      (transaction.amount.cents !== changes.amountCents ||
        transaction.date !== changes.date),
  );
}
