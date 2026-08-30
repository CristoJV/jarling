import type { Account } from '@/domain/entities/account';
import type { Category } from '@/domain/entities/category';
import type { CategoryGroup } from '@/domain/entities/category-group';
import {
  createTransaction,
  type Transaction,
} from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

import { calculateReports } from './calculate-reports';

const accounts: readonly Account[] = [
  {
    id: 'cash',
    name: 'Cash',
    type: 'checking',
    onBudget: true,
    closed: false,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'loan',
    name: 'Loan',
    type: 'tracking',
    onBudget: false,
    closed: false,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
];
const groups: readonly CategoryGroup[] = [
  {
    id: 'needs',
    name: 'Needs',
    sortOrder: 0,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
];
const categories: readonly Category[] = [
  {
    id: 'food',
    groupId: 'needs',
    name: 'Groceries',
    hidden: false,
    sortOrder: 0,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
];

function transaction(
  id: string,
  accountId: string,
  amount: number,
  date: string,
  extra:
    | Readonly<{
        kind?: 'standard';
        categoryId?: string;
        payee?: string;
      }>
    | Readonly<{ kind: 'opening_balance'; payee?: string }>
    | Readonly<{
        kind: 'transfer';
        transactionGroupId: string;
        categoryId?: string;
      }> = {},
): Transaction {
  return createTransaction({
    id,
    accountId,
    amount: Money.fromCents(amount),
    date,
    status: 'cleared',
    kind: 'standard',
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
    ...extra,
  });
}

describe('calculateReports', () => {
  it('derives six-month spending, income and net worth without counting transfers as income', () => {
    const result = calculateReports({
      throughDate: '2026-08-31',
      spendingInterval: 'month',
      spendingIntervalCount: 6,
      accounts,
      categories,
      groups,
      transactions: [
        transaction('opening', 'cash', 100_000, '2026-07-01', {
          payee: 'Opening Balance',
          kind: 'opening_balance',
        }),
        transaction('salary', 'cash', 50_000, '2026-08-01', {
          payee: 'Salary',
        }),
        transaction('food', 'cash', -10_000, '2026-08-02', {
          categoryId: 'food',
        }),
        transaction('refund', 'cash', 2_000, '2026-08-03', {
          categoryId: 'food',
        }),
        transaction('transfer-out', 'cash', -5_000, '2026-08-04', {
          categoryId: 'food',
          transactionGroupId: 'transfer',
          kind: 'transfer',
        }),
        transaction('transfer-in', 'loan', 5_000, '2026-08-04', {
          transactionGroupId: 'transfer',
          kind: 'transfer',
        }),
        transaction('loan-opening', 'loan', -30_000, '2026-07-01', {
          payee: 'Opening Balance',
          kind: 'opening_balance',
        }),
      ],
    });

    expect(result.months).toHaveLength(6);
    expect(result.months.at(-1)).toMatchObject({
      income: Money.fromCents(50_000),
      spending: Money.fromCents(8_000),
      netIncome: Money.fromCents(42_000),
      assets: Money.fromCents(137_000),
      debt: Money.fromCents(25_000),
      netWorth: Money.fromCents(112_000),
    });
    expect(result.spending).toMatchObject({
      total: Money.fromCents(8_000),
      categories: [
        expect.objectContaining({
          categoryName: 'Groceries',
          groupName: 'Needs',
          percentageOfTotal: 1,
          total: Money.fromCents(8_000),
          average: Money.fromCents(1_333),
        }),
      ],
    });
  });

  it('classifies income, category inflows and Uncategorized by sign and destination', () => {
    const result = calculateReports({
      throughDate: '2026-08-31',
      spendingInterval: 'month',
      spendingIntervalCount: 1,
      numberOfMonths: 1,
      accounts,
      categories,
      groups,
      transactions: [
        transaction('salary', 'cash', 100_000, '2026-08-01'),
        transaction('expense', 'cash', -10_000, '2026-08-02', {
          categoryId: 'food',
        }),
        transaction('refund', 'cash', 15_000, '2026-08-03', {
          categoryId: 'food',
        }),
        transaction('uncategorized', 'cash', -2_000, '2026-08-04'),
      ],
    });

    expect(result.months[0]).toMatchObject({
      income: Money.fromCents(100_000),
      spending: Money.fromCents(-3_000),
      netIncome: Money.fromCents(103_000),
    });
    expect(result.spending.total).toEqual(Money.fromCents(-3_000));
  });

  it('keeps tracking activity and structural adjustments out of budget income and spending', () => {
    const result = calculateReports({
      throughDate: '2026-08-31',
      spendingInterval: 'month',
      spendingIntervalCount: 1,
      numberOfMonths: 1,
      accounts,
      categories,
      groups,
      transactions: [
        transaction('tracking-inflow', 'loan', 20_000, '2026-08-01'),
        transaction('tracking-outflow', 'loan', -5_000, '2026-08-02'),
        createTransaction({
          id: 'reconciliation',
          accountId: 'cash',
          amount: Money.fromCents(3_000),
          date: '2026-08-03',
          status: 'reconciled',
          kind: 'reconciliation_adjustment',
          createdAt: '2026-08-03T00:00:00.000Z',
          updatedAt: '2026-08-03T00:00:00.000Z',
        }),
      ],
    });

    expect(result.months[0]).toMatchObject({
      income: Money.zero(),
      spending: Money.zero(),
      assets: Money.fromCents(18_000),
      debt: Money.zero(),
      netWorth: Money.fromCents(18_000),
    });
    expect(result.spending.categories).toEqual([]);
  });

  it('keeps a categorized credit refund in net spending rather than Income', () => {
    const credit: Account = {
      ...accounts[0]!,
      id: 'credit',
      name: 'Visa',
      type: 'credit_card',
    };
    const result = calculateReports({
      throughDate: '2026-08-31',
      spendingInterval: 'month',
      spendingIntervalCount: 1,
      numberOfMonths: 1,
      accounts: [...accounts, credit],
      categories,
      groups,
      transactions: [
        transaction('purchase', credit.id, -10_000, '2026-08-01', {
          categoryId: 'food',
        }),
        transaction('refund', credit.id, 4_000, '2026-08-02', {
          categoryId: 'food',
        }),
      ],
    });

    expect(result.months[0]).toMatchObject({
      income: Money.zero(),
      spending: Money.fromCents(6_000),
    });
    expect(result.spending.total).toEqual(Money.fromCents(6_000));
  });

  it('keeps statement-credit Income distinct from cash made budgetable after crossing zero', () => {
    const credit: Account = {
      ...accounts[0]!,
      id: 'credit',
      name: 'Visa',
      type: 'credit_card',
    };
    const result = calculateReports({
      throughDate: '2026-08-31',
      spendingInterval: 'month',
      spendingIntervalCount: 1,
      numberOfMonths: 1,
      accounts: [credit],
      categories,
      groups,
      transactions: [
        transaction('opening-debt', credit.id, -5_000, '2026-08-01', {
          kind: 'opening_balance',
        }),
        transaction('statement-credit', credit.id, 10_000, '2026-08-02'),
      ],
    });

    expect(result.months[0]).toMatchObject({
      income: Money.fromCents(10_000),
      spending: Money.zero(),
      assets: Money.fromCents(5_000),
      netWorth: Money.fromCents(5_000),
    });
  });

  it('reports an Uncategorized credit outflow as spending rather than negative Income', () => {
    const credit: Account = {
      ...accounts[0]!,
      id: 'credit',
      name: 'Visa',
      type: 'credit_card',
    };
    const result = calculateReports({
      throughDate: '2026-08-31',
      spendingInterval: 'month',
      spendingIntervalCount: 1,
      numberOfMonths: 1,
      accounts: [credit],
      categories,
      groups,
      transactions: [
        transaction(
          'uncategorized-card-purchase',
          credit.id,
          -4_000,
          '2026-08-02',
        ),
      ],
    });

    expect(result.months[0]).toMatchObject({
      income: Money.zero(),
      spending: Money.fromCents(4_000),
      netIncome: Money.fromCents(-4_000),
    });
  });
});
