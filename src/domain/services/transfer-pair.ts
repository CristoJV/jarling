import type { Transaction, TransferLeg } from '@/domain/entities/transaction';

export type TransferLegPair = Readonly<{
  source: TransferLeg;
  destination: TransferLeg;
}>;

export function parseTransferPair(
  transactions: readonly Transaction[],
  groupId: string,
): TransferLegPair | null {
  if (
    transactions.length !== 2 ||
    transactions.some(
      (transaction) =>
        transaction.kind !== 'transfer' ||
        transaction.transactionGroupId !== groupId,
    )
  ) {
    return null;
  }
  const legs = transactions as readonly TransferLeg[];
  const source = legs.find(({ amount }) => amount.cents < 0);
  const destination = legs.find(({ amount }) => amount.cents > 0);
  if (
    !source ||
    !destination ||
    source.accountId === destination.accountId ||
    source.amount.cents + destination.amount.cents !== 0
  ) {
    return null;
  }
  return { source, destination };
}
