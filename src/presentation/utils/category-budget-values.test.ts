import type { BudgetMonthValues } from '@/domain/services/calculate-budget-month';
import { Money } from '@/domain/value-objects/money';

import { indexBudgetValuesByCategoryId } from './category-budget-values';

const category = {
  id: 'groceries',
  groupId: 'needs',
  name: 'Groceries',
  hidden: false,
  sortOrder: 0,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

describe('category budget values index', () => {
  it('indexes the existing monthly values without manufacturing categories', () => {
    const values = {
      category,
      availableFromPreviousMonth: Money.zero(),
      assigned: Money.fromCents(30_000),
      activity: Money.fromCents(-17_600),
      available: Money.fromCents(12_400),
      spendingTransactions: [Money.fromCents(17_600)],
    };
    const budget: BudgetMonthValues = {
      month: '2026-08',
      readyToAssign: Money.fromCents(50_000),
      uncategorized: { amount: Money.zero(), transactionCount: 0 },
      groups: [
        {
          group: {
            id: 'needs',
            name: 'Needs',
            sortOrder: 0,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
          },
          categories: [values],
        },
      ],
    };

    expect(indexBudgetValuesByCategoryId(budget).get(category.id)).toBe(values);
    expect(indexBudgetValuesByCategoryId(undefined).size).toBe(0);
  });
});
