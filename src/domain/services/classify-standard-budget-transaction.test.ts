import type { Account } from '@/domain/entities/account';
import { createTransaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

import { classifyStandardBudgetTransaction } from './classify-standard-budget-transaction';

const cash: Account = {
  id: 'cash',
  name: 'Cash',
  type: 'checking',
  onBudget: true,
  closed: false,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const tracking: Account = { ...cash, id: 'tracking', onBudget: false };
const credit: Account = {
  ...cash,
  id: 'credit',
  type: 'credit_card',
};

function standard(amountCents: number, categoryId?: string) {
  return createTransaction({
    id: `transaction-${amountCents}-${categoryId ?? 'none'}`,
    accountId: cash.id,
    ...(categoryId ? { categoryId } : {}),
    amount: Money.fromCents(amountCents),
    date: '2026-08-18',
    status: 'cleared',
    kind: 'standard',
    createdAt: '2026-08-18T00:00:00.000Z',
    updatedAt: '2026-08-18T00:00:00.000Z',
  });
}

describe('classifyStandardBudgetTransaction', () => {
  it.each([
    [100, undefined, 'ready-to-assign-inflow'],
    [100, 'food', 'category-inflow'],
    [-100, 'food', 'category-expense'],
    [-100, undefined, 'uncategorized-expense'],
  ] as const)(
    'classifies %p cents with category %p as %s',
    (amountCents, categoryId, expected) => {
      expect(
        classifyStandardBudgetTransaction(
          standard(amountCents, categoryId),
          cash,
        ),
      ).toBe(expected);
    },
  );

  it('uses the same signed destination matrix for on-budget credit accounts', () => {
    expect(
      classifyStandardBudgetTransaction(standard(100, 'food'), credit),
    ).toBe('category-inflow');
    expect(classifyStandardBudgetTransaction(standard(100), credit)).toBe(
      'ready-to-assign-inflow',
    );
    expect(classifyStandardBudgetTransaction(standard(-100), credit)).toBe(
      'uncategorized-expense',
    );
  });

  it('does not classify structural or off-budget activity', () => {
    expect(
      classifyStandardBudgetTransaction(standard(100), tracking),
    ).toBeNull();
    expect(
      classifyStandardBudgetTransaction(
        createTransaction({
          ...standard(100),
          kind: 'opening_balance',
        }),
        cash,
      ),
    ).toBeNull();
  });
});
