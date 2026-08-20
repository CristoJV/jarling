import type { Clock } from '@/application/ports/clock';
import type { GetBudgetMonth } from '@/application/use-cases/budget/get-budget-month';
import type { CategoryTarget } from '@/domain/entities/category-target';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import type { CategoryTargetRepository } from '@/domain/repositories/category-target-repository';
import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import {
  calculateBudgetCategoryTargetProgress,
  type TargetProgress,
} from '@/domain/services/calculate-target-progress';

export type CategoryDetails = Readonly<{
  values: BudgetCategoryValues;
  target?: CategoryTarget;
  progress?: TargetProgress;
}>;

export class GetCategoryDetails {
  constructor(
    private readonly getBudgetMonth: Pick<GetBudgetMonth, 'execute'>,
    private readonly targets: CategoryTargetRepository,
    private readonly clock: Clock,
  ) {}

  async execute(categoryId: string, month: string): Promise<CategoryDetails> {
    const [budget, target] = await Promise.all([
      this.getBudgetMonth.execute(month),
      this.targets.findByCategory(categoryId),
    ]);
    const values = budget.groups
      .flatMap(({ categories }) => categories)
      .find(({ category }) => category.id === categoryId);
    if (!values) throw new CategoryNotFoundError(categoryId);

    return {
      values,
      ...(target
        ? {
            target,
            progress: calculateBudgetCategoryTargetProgress({
              target,
              values,
              month,
              today: this.clock.now().date,
            }),
          }
        : {}),
    };
  }
}
