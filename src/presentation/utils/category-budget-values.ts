import type {
  BudgetCategoryValues,
  BudgetMonthValues,
} from '@/domain/services/calculate-budget-month';

export function indexBudgetValuesByCategoryId(
  budget: BudgetMonthValues | null | undefined,
): ReadonlyMap<string, BudgetCategoryValues> {
  return new Map(
    budget?.groups
      .flatMap(({ categories }) => categories)
      .map((values) => [values.category.id, values]) ?? [],
  );
}
