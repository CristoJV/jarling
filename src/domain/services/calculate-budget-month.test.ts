import type { Account } from '@/domain/entities/account';
import type { BudgetAllocation } from '@/domain/entities/budget-allocation';
import type { Category } from '@/domain/entities/category';
import type { CategoryGroup } from '@/domain/entities/category-group';
import type { Transaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

import { calculateBudgetMonth } from './calculate-budget-month';

const instant = '2026-08-01T10:00:00.000Z';
const group: CategoryGroup = {
  id: 'group-1',
  name: 'Needs',
  sortOrder: 0,
  createdAt: instant,
  updatedAt: instant,
};
const groceries: Category = {
  id: 'groceries',
  groupId: group.id,
  name: 'Groceries',
  hidden: false,
  sortOrder: 0,
  createdAt: instant,
  updatedAt: instant,
};
const restaurants: Category = {
  ...groceries,
  id: 'restaurants',
  name: 'Restaurants',
  sortOrder: 1,
};
const onBudgetAccount: Account = {
  id: 'account-1',
  name: 'imagin',
  type: 'checking',
  onBudget: true,
  closed: false,
  createdAt: instant,
  updatedAt: instant,
};
const trackingAccount: Account = {
  ...onBudgetAccount,
  id: 'tracking-1',
  name: 'Investment',
  type: 'tracking',
  onBudget: false,
};
const creditCard: Account = {
  ...onBudgetAccount,
  id: 'credit-1',
  name: 'Visa',
  type: 'credit_card',
};
const paymentGroup: CategoryGroup = {
  ...group,
  id: 'credit-payments',
  name: 'Credit Card Payments',
  sortOrder: 1,
};
const paymentCategory: Category = {
  ...groceries,
  id: 'visa-payment',
  groupId: paymentGroup.id,
  name: '💳 Visa',
  linkedAccountId: creditCard.id,
};

function transaction(
  id: string,
  amountCents: number,
  date: string,
  categoryId?: string,
  accountId = onBudgetAccount.id,
): Transaction {
  return {
    id,
    accountId,
    ...(categoryId ? { categoryId } : {}),
    amount: Money.fromCents(amountCents),
    date,
    status: 'cleared',
    kind: 'standard',
    createdAt: instant,
    updatedAt: instant,
  };
}

function allocation(
  id: string,
  categoryId: string,
  month: string,
  amountCents: number,
): BudgetAllocation {
  return {
    id,
    categoryId,
    month,
    amount: Money.fromCents(amountCents),
    createdAt: instant,
    updatedAt: instant,
  };
}

function calculate(options?: {
  month?: string;
  allocations?: readonly BudgetAllocation[];
  transactions?: readonly Transaction[];
}) {
  return calculateBudgetMonth({
    month: options?.month ?? '2026-08',
    accounts: [onBudgetAccount, trackingAccount],
    allocations: options?.allocations ?? [],
    categories: [groceries, restaurants],
    groups: [group],
    transactions: options?.transactions ?? [],
  });
}

describe('calculateBudgetMonth', () => {
  it('exposes on-budget unassigned cash as Ready to Assign', () => {
    const result = calculate({
      transactions: [
        transaction('opening', 200_000, '2026-08-01'),
        transaction(
          'tracking',
          500_000,
          '2026-08-01',
          undefined,
          trackingAccount.id,
        ),
      ],
    });

    expect(result.readyToAssign).toEqual(Money.fromCents(200_000));
  });

  it('derives Assigned, Activity, Available and Ready to Assign', () => {
    const result = calculate({
      transactions: [
        transaction('opening', 200_000, '2026-08-01'),
        transaction('mercadona', -6_000, '2026-08-18', groceries.id),
        transaction('restaurant', -17_000, '2026-08-19', restaurants.id),
      ],
      allocations: [
        allocation('groceries-aug', groceries.id, '2026-08', 40_000),
        allocation('restaurants-aug', restaurants.id, '2026-08', 15_000),
      ],
    });

    expect(result.readyToAssign).toEqual(Money.fromCents(145_000));
    expect(result.groups[0]?.categories).toEqual([
      expect.objectContaining({
        assigned: Money.fromCents(40_000),
        activity: Money.fromCents(-6_000),
        available: Money.fromCents(34_000),
        spendingTransactions: [Money.fromCents(6_000)],
      }),
      expect.objectContaining({
        assigned: Money.fromCents(15_000),
        activity: Money.fromCents(-17_000),
        available: Money.fromCents(-2_000),
        spendingTransactions: [Money.fromCents(17_000)],
      }),
    ]);
  });

  it('does not change Ready to Assign when categorized spending occurs', () => {
    const before = calculate({
      transactions: [transaction('opening', 200_000, '2026-08-01')],
      allocations: [
        allocation('groceries-aug', groceries.id, '2026-08', 40_000),
      ],
    });
    const after = calculate({
      transactions: [
        transaction('opening', 200_000, '2026-08-01'),
        transaction('mercadona', -6_000, '2026-08-18', groceries.id),
      ],
      allocations: [
        allocation('groceries-aug', groceries.id, '2026-08', 40_000),
      ],
    });

    expect(after.readyToAssign).toEqual(before.readyToAssign);
  });

  it('rolls Available forward across any number of months', () => {
    const result = calculate({
      month: '2026-10',
      transactions: [
        transaction('expense', -36_000, '2026-08-20', groceries.id),
      ],
      allocations: [
        allocation('aug', groceries.id, '2026-08', 40_000),
        allocation('sep', groceries.id, '2026-09', 40_000),
      ],
    });

    const values = result.groups[0]?.categories[0];
    expect(values?.assigned).toEqual(Money.zero());
    expect(values?.activity).toEqual(Money.zero());
    expect(values?.available).toEqual(Money.fromCents(44_000));
  });

  it('does not let future transactions or allocations affect a past month', () => {
    const result = calculate({
      month: '2026-08',
      transactions: [
        transaction('aug-income', 200_000, '2026-08-01'),
        transaction('sep-income', 230_000, '2026-09-01'),
      ],
      allocations: [allocation('sep', groceries.id, '2026-09', 40_000)],
    });

    expect(result.readyToAssign).toEqual(Money.fromCents(200_000));
    expect(result.groups[0]?.categories[0]?.available).toEqual(Money.zero());
  });

  it('preserves negative Available as explicit overspending', () => {
    const result = calculate({
      transactions: [
        transaction('expense', -7_000, '2026-08-20', restaurants.id),
      ],
      allocations: [allocation('aug', restaurants.id, '2026-08', 5_000)],
    });

    expect(result.groups[0]?.categories[1]?.available).toEqual(
      Money.fromCents(-2_000),
    );
  });

  it('moves funded card spending into its payment category without creating cash', () => {
    const result = calculateBudgetMonth({
      month: '2026-08',
      accounts: [onBudgetAccount, creditCard],
      groups: [group, paymentGroup],
      categories: [groceries, paymentCategory],
      allocations: [allocation('food', groceries.id, '2026-08', 20_000)],
      transactions: [
        {
          ...transaction('cash', 100_000, '2026-08-01'),
          kind: 'opening_balance',
        },
        {
          ...transaction(
            'debt',
            -50_000,
            '2026-08-01',
            undefined,
            creditCard.id,
          ),
          kind: 'opening_balance',
        },
        transaction(
          'card-spend',
          -10_000,
          '2026-08-10',
          groceries.id,
          creditCard.id,
        ),
        {
          ...transaction(
            'payment-out',
            -10_000,
            '2026-08-15',
            paymentCategory.id,
          ),
          kind: 'transfer',
          transactionGroupId: 'payment',
        },
        {
          ...transaction(
            'payment-in',
            10_000,
            '2026-08-15',
            undefined,
            creditCard.id,
          ),
          kind: 'transfer',
          transactionGroupId: 'payment',
        },
      ],
    });

    expect(result.readyToAssign).toEqual(Money.fromCents(80_000));
    expect(result.groups[0]?.categories[0]).toEqual(
      expect.objectContaining({
        activity: Money.fromCents(-10_000),
        available: Money.fromCents(10_000),
      }),
    );
    expect(result.groups[1]?.categories[0]).toEqual(
      expect.objectContaining({
        activity: Money.zero(),
        available: Money.zero(),
      }),
    );
  });

  it('moves only the funded portion of overspending into a card payment', () => {
    const result = calculateBudgetMonth({
      month: '2026-08',
      accounts: [onBudgetAccount, creditCard],
      groups: [group, paymentGroup],
      categories: [groceries, paymentCategory],
      allocations: [allocation('food', groceries.id, '2026-08', 5_000)],
      transactions: [
        transaction(
          'card-spend',
          -10_000,
          '2026-08-10',
          groceries.id,
          creditCard.id,
        ),
      ],
    });

    expect(result.groups[0]?.categories[0]?.available).toEqual(
      Money.fromCents(-5_000),
    );
    expect(result.groups[1]?.categories[0]).toEqual(
      expect.objectContaining({
        activity: Money.fromCents(5_000),
        available: Money.fromCents(5_000),
      }),
    );
  });
});
