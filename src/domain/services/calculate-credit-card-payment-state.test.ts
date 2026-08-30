import type { Account } from '@/domain/entities/account';
import type { BudgetAllocation } from '@/domain/entities/budget-allocation';
import type { Category } from '@/domain/entities/category';
import { createTransaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

import { calculateCreditCardPaymentState } from './calculate-credit-card-payment-state';

const instant = '2026-08-01T10:00:00.000Z';
const card: Account = {
  id: 'card',
  name: 'Visa',
  type: 'credit_card',
  onBudget: true,
  closed: false,
  createdAt: instant,
  updatedAt: instant,
};
const groceries: Category = {
  id: 'groceries',
  groupId: 'needs',
  name: 'Groceries',
  hidden: false,
  sortOrder: 0,
  createdAt: instant,
  updatedAt: instant,
};
const payment: Category = {
  ...groceries,
  id: 'payment',
  linkedAccountId: card.id,
};

function allocation(month: string, cents: number): BudgetAllocation {
  return {
    id: `allocation-${month}`,
    categoryId: groceries.id,
    month,
    amount: Money.fromCents(cents),
    createdAt: `${month}-01T08:00:00.000Z`,
    updatedAt: `${month}-01T08:00:00.000Z`,
  };
}

function cardActivity(id: string, date: string, cents: number) {
  return createTransaction({
    id,
    accountId: card.id,
    categoryId: groceries.id,
    amount: Money.fromCents(cents),
    date,
    status: 'cleared',
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
  });
}

function calculate(
  month: string,
  allocations: readonly BudgetAllocation[],
  transactions: ReturnType<typeof cardActivity>[],
) {
  return calculateCreditCardPaymentState({
    month,
    accounts: [card],
    allocations,
    categories: [groceries, payment],
    transactions,
  });
}

describe('calculateCreditCardPaymentState', () => {
  it('moves only funded spending to the payment envelope', () => {
    const result = calculate(
      '2026-08',
      [allocation('2026-08', 5_000)],
      [cardActivity('purchase', '2026-08-10', -8_000)],
    );

    expect(result.totalByAccount.get(card.id)).toBe(5_000);
    expect(result.currentByAccount.get(card.id)).toBe(5_000);
  });

  it('reverses payment funding when a funded purchase is refunded', () => {
    const result = calculate(
      '2026-08',
      [allocation('2026-08', 10_000)],
      [
        cardActivity('purchase', '2026-08-10', -8_000),
        cardActivity('refund', '2026-08-11', 3_000),
      ],
    );

    expect(result.totalByAccount.get(card.id)).toBe(5_000);
  });

  it.each([
    { refundCents: 8_000, expectedFunding: 0 },
    { refundCents: 12_000, expectedFunding: 0 },
  ])(
    'never reverses more than the funded purchase for a $refundCents refund',
    ({ refundCents, expectedFunding }) => {
      const result = calculate(
        '2026-08',
        [allocation('2026-08', 10_000)],
        [
          cardActivity('purchase', '2026-08-10', -8_000),
          cardActivity('refund', '2026-08-11', refundCents),
        ],
      );

      expect(result.totalByAccount.get(card.id)).toBe(expectedFunding);
    },
  );

  it('records a later-month refund as current negative payment activity without rewriting the purchase month', () => {
    const transactions = [
      cardActivity('purchase', '2026-08-10', -8_000),
      cardActivity('refund', '2026-09-11', 3_000),
    ];

    const august = calculate(
      '2026-08',
      [allocation('2026-08', 10_000)],
      transactions,
    );
    const september = calculate(
      '2026-09',
      [allocation('2026-08', 10_000)],
      transactions,
    );

    expect(august.totalByAccount.get(card.id)).toBe(8_000);
    expect(august.currentByAccount.get(card.id)).toBe(8_000);
    expect(september.totalByAccount.get(card.id)).toBe(5_000);
    expect(september.currentByAccount.get(card.id)).toBe(-3_000);
  });

  it('uses a later month allocation to cover earlier unfunded debt', () => {
    const result = calculate(
      '2026-09',
      [allocation('2026-09', 8_000)],
      [cardActivity('purchase', '2026-08-10', -8_000)],
    );

    expect(result.totalByAccount.get(card.id)).toBe(8_000);
    expect(result.currentByAccount.get(card.id)).toBe(8_000);
  });
});
