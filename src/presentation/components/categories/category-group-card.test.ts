import type { CategoryTarget } from '@/domain/entities/category-target';
import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import type { TargetProgress } from '@/domain/services/calculate-target-progress';
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
      assigned: Money.fromCents(10_000),
      activity: Money.fromCents(-2_000),
      available: Money.fromCents(8_000),
      spendingTransactions: [Money.fromCents(2_000)],
    };
    const progress: TargetProgress = {
      goal: Money.fromCents(10_000),
      funded: Money.fromCents(10_000),
      recommended: Money.zero(),
      progress: 1,
      status: 'complete',
    };

    expect(categoryStatus(values, target, progress, t)?.label).toContain(
      `Funded ${formatMoney(Money.fromCents(10_000))}`,
    );
  });

  it('reports total spending against covered funding when overspent', () => {
    const values: BudgetCategoryValues = {
      category,
      assigned: Money.fromCents(5_000),
      activity: Money.fromCents(-7_000),
      available: Money.fromCents(-2_000),
      spendingTransactions: [Money.fromCents(7_000)],
    };

    const label = categoryStatus(values, undefined, undefined, t)?.label;
    expect(label).toContain(formatMoney(Money.fromCents(7_000)));
    expect(label).toContain(formatMoney(Money.fromCents(5_000)));
  });
});
