import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { CategoryTargetRepository } from '@/domain/repositories/category-target-repository';

export class DeleteCategoryTarget {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly targets: CategoryTargetRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(categoryId: string): Promise<void> {
    if (!(await this.categories.findById(categoryId))) {
      throw new CategoryNotFoundError(categoryId);
    }

    await this.unitOfWork.run(() => this.targets.deleteByCategory(categoryId));
  }
}
