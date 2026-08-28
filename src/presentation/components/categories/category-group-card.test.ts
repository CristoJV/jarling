import type { CategoryTarget } from '@/domain/entities/category-target';
import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import { calculateCategoryFundingState } from '@/domain/services/calculate-category-funding-state';
import { Money } from '@/domain/value-objects/money';
import { translate } from '@/presentation/localization/translator';
import { formatMoney } from '@/presentation/utils/money';

import { categoryStatus } from './category-group-card';

const category = {
  id: 'category',
  groupId: 'group',
  name: 'Category',
  hidden: false,
  sortOrder: 0,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};
const target: CategoryTarget = {
  id: 'target',
  categoryId: category.id,
  kind: 'monthly',
  amount: Money.fromCents(10_000),
  startsOn: '2026-08-01',
  dayOfMonth: 0,
  fundingMode: 'set_aside',
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
};
const t = (
  key: Parameters<typeof translate>[1],
  params?: Parameters<typeof translate>[2],
) => translate('en', key, params);

describe('categoryStatus', () => {
  it('shows target funding rather than the remaining available balance', () => {
    const values: BudgetCategoryValues = {
      category,
      availableFromPreviousMonth: Money.zero(),
      assigned: Money.fromCents(10_000),
      activity: Money.fromCents(-2_000),
      available: Money.fromCents(8_000),
      spendingTransactions: [Money.fromCents(2_000)],
    };
    const funding = calculateCategoryFundingState({
      values,
      target,
      month: '2026-08',
      today: '2026-08-20',
    });

    expect(categoryStatus(values, funding, t)?.label).toContain(
      `Funded ${formatMoney(Money.fromCents(10_000))}`,
    );
  });

  it('reports total spending against covered funding when overspent', () => {
    const values: BudgetCategoryValues = {
      category,
      availableFromPreviousMonth: Money.zero(),
      assigned: Money.fromCents(5_000),
      activity: Money.fromCents(-7_000),
      available: Money.fromCents(-2_000),
      spendingTransactions: [Money.fromCents(7_000)],
    };

    const label = categoryStatus(values, undefined, t)?.label;
    expect(label).toContain(formatMoney(Money.fromCents(7_000)));
    expect(label).toContain(formatMoney(Money.fromCents(5_000)));
  });

  it('removes target warnings from the visual state while snoozed', () => {
    const values: BudgetCategoryValues = {
      category,
      availableFromPreviousMonth: Money.zero(),
      assigned: Money.fromCents(5_000),
      activity: Money.fromCents(-2_000),
      available: Money.fromCents(3_000),
      spendingTransactions: [Money.fromCents(2_000)],
    };
    const funding = calculateCategoryFundingState({
      values,
      target,
      targetSnoozed: true,
      month: '2026-08',
      today: '2026-08-20',
    });

    const status = categoryStatus(values, funding, t);
    expect(status?.tone).toBe('positive');
    expect(status?.label).toContain('Spent');
  });
});
