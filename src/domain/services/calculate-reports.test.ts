import type { Account } from '@/domain/entities/account';
import type { Category } from '@/domain/entities/category';
import type { CategoryGroup } from '@/domain/entities/category-group';
import type { Transaction } from '@/domain/entities/transaction';
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
  extra: Partial<Transaction> = {},
): Transaction {
  return {
    id,
    accountId,
    amount: Money.fromCents(amount),
    date,
    status: 'cleared',
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
    ...extra,
  };
}

describe('calculateReports', () => {
  it('derives six-month spending, income and net worth without counting transfers as income', () => {
    const result = calculateReports({
      throughMonth: '2026-08',
      accounts,
      categories,
      groups,
      transactions: [
        transaction('opening', 'cash', 100_000, '2026-07-01', {
          payee: 'Opening Balance',
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
          transactionGroupId: 'transfer',
        }),
        transaction('transfer-in', 'loan', 5_000, '2026-08-04', {
          transactionGroupId: 'transfer',
        }),
        transaction('loan-opening', 'loan', -30_000, '2026-07-01', {
          payee: 'Opening Balance',
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
          percentage: 1,
          spending: Money.fromCents(8_000),
        }),
      ],
    });
  });
});
