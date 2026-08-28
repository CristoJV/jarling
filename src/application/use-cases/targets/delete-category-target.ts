import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { CategoryTargetRepository } from '@/domain/repositories/category-target-repository';
import type { CategoryTargetSnoozeRepository } from '@/domain/repositories/category-target-snooze-repository';

export class DeleteCategoryTarget {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly targets: CategoryTargetRepository,
    private readonly snoozes: CategoryTargetSnoozeRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(categoryId: string): Promise<void> {
    if (!(await this.categories.findById(categoryId))) {
      throw new CategoryNotFoundError(categoryId);
    }

    await this.unitOfWork.run(async () => {
      await this.snoozes.deleteByCategory(categoryId);
      await this.targets.deleteByCategory(categoryId);
    });
  }
}
