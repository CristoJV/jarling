import type { Account } from '@/domain/entities/account';
import type { Category } from '@/domain/entities/category';

export const CREDIT_CARD_PAYMENT_GROUP_ID = 'system-group-credit-card-payments';
export const CREDIT_CARD_PAYMENT_GROUP_NAME = 'Credit Card Payments';

export function creditCardPaymentCategoryId(accountId: string): string {
  return `system-credit-card-payment:${accountId}`;
}

export function isCreditCard(account: Account): boolean {
  return account.type === 'credit_card';
}

export function paymentCategoryForAccount(
  categories: readonly Category[],
  accountId: string,
): Category | undefined {
  return categories.find((category) => category.linkedAccountId === accountId);
}
