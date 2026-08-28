import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { assertValidBudgetMonth } from '@/domain/entities/budget-allocation';
import { createCategoryTargetSnooze } from '@/domain/entities/category-target-snooze';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { InvalidCategoryTargetError } from '@/domain/errors/invalid-category-target-error';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { CategoryTargetRepository } from '@/domain/repositories/category-target-repository';
import type { CategoryTargetSnoozeRepository } from '@/domain/repositories/category-target-snooze-repository';

export class SetCategoryTargetSnooze {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly targets: CategoryTargetRepository,
    private readonly snoozes: CategoryTargetSnoozeRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(
    input: Readonly<{
      categoryId: string;
      month: string;
      snoozed: boolean;
    }>,
  ): Promise<void> {
    assertValidBudgetMonth(input.month);
    if (!(await this.categories.findById(input.categoryId))) {
      throw new CategoryNotFoundError(input.categoryId);
    }

    if (input.snoozed) {
      const target = await this.targets.findByCategory(input.categoryId);
      if (!target || input.month < target.startsOn.slice(0, 7)) {
        throw new InvalidCategoryTargetError(
          'The category has no target applicable to this month.',
        );
      }
    }

    await this.unitOfWork.run(() =>
      input.snoozed
        ? this.snoozes.save(
            createCategoryTargetSnooze({
              categoryId: input.categoryId,
              month: input.month,
            }),
          )
        : this.snoozes.delete(input.categoryId, input.month),
    );
  }
}
