import type { Clock } from '@/application/ports/clock';
import type { GetBudgetMonth } from '@/application/use-cases/budget/get-budget-month';
import type { CategoryTarget } from '@/domain/entities/category-target';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import type { CategoryTargetRepository } from '@/domain/repositories/category-target-repository';
import type { CategoryTargetSnoozeRepository } from '@/domain/repositories/category-target-snooze-repository';
import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import type { Money } from '@/domain/value-objects/money';
import { type TargetProgress } from '@/domain/services/calculate-target-progress';
import {
  calculateCategoryFundingState,
  type CategoryFundingState,
} from '@/domain/services/calculate-category-funding-state';

export type CategoryDetails = Readonly<{
  values: BudgetCategoryValues;
  target?: CategoryTarget;
  progress?: TargetProgress;
  funding: CategoryFundingState;
  assignableNow: Money;
}>;

export class GetCategoryDetails {
  constructor(
    private readonly getBudgetMonth: Pick<GetBudgetMonth, 'execute'>,
    private readonly targets: CategoryTargetRepository,
    private readonly snoozes: CategoryTargetSnoozeRepository,
    private readonly clock: Clock,
  ) {}

  async execute(categoryId: string, month: string): Promise<CategoryDetails> {
    const [budget, target, targetSnoozed] = await Promise.all([
      this.getBudgetMonth.execute(month),
      this.targets.findByCategory(categoryId),
      this.snoozes.exists(categoryId, month),
    ]);
    const values = budget.groups
      .flatMap(({ categories }) => categories)
      .find(({ category }) => category.id === categoryId);
    if (!values) throw new CategoryNotFoundError(categoryId);

    const funding = calculateCategoryFundingState({
      values,
      ...(target ? { target } : {}),
      targetSnoozed,
      month,
      today: this.clock.now().date,
    });
    return {
      values,
      funding,
      assignableNow: budget.funding.assignableNow,
      ...(target ? { target } : {}),
      ...(funding.targetProgress ? { progress: funding.targetProgress } : {}),
    };
  }
}
