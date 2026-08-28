import { assertValidBudgetMonth } from '@/domain/entities/budget-allocation';

export type CategoryTargetSnooze = Readonly<{
  categoryId: string;
  month: string;
}>;

export function createCategoryTargetSnooze(
  input: CategoryTargetSnooze,
): CategoryTargetSnooze {
  if (input.categoryId.trim().length === 0) {
    throw new Error('Category target snooze requires a category id.');
  }
  assertValidBudgetMonth(input.month);
  return { categoryId: input.categoryId, month: input.month };
}
