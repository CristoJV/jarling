import { isCreditAccountType, type Account } from '@/domain/entities/account';
import type { Category } from '@/domain/entities/category';
import type { Transaction, TransferLeg } from '@/domain/entities/transaction';
import { paymentCategoryForAccount } from '@/domain/services/credit-card-payment';

export type TransferLegPair = Readonly<{
  source: TransferLeg;
  destination: TransferLeg;
}>;

export type TransferLegPlan = Readonly<{
  sourcePayee: string;
  destinationPayee: string;
  sourceCategoryId?: string;
}>;

/**
 * Plans metadata shared by transfer creation and editing. A payment from an
 * on-budget account to Credit uses the destination account's protected payment
 * category; the positive destination leg remains uncategorized.
 */
export function planTransferLegs(
  source: Account,
  destination: Account,
  categories: readonly Category[],
): TransferLegPlan {
  const paymentCategory = isCreditAccountType(destination.type)
    ? paymentCategoryForAccount(categories, destination.id)
    : undefined;

  return {
    sourcePayee: `Transfer to ${destination.name}`,
    destinationPayee: `Transfer from ${source.name}`,
    ...(source.onBudget && paymentCategory
      ? { sourceCategoryId: paymentCategory.id }
      : {}),
  };
}

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
