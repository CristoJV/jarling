import type { Clock } from '@/application/ports/clock';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import type { ReorderDirection } from '@/application/use-cases/categories/reorder-category-groups';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import type { CategoryRepository } from '@/domain/repositories/category-repository';

export class ReorderCategories {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(
    categoryId: string,
    direction: ReorderDirection,
  ): Promise<void> {
    const category = await this.categories.findById(categoryId);

    if (!category) {
      throw new CategoryNotFoundError(categoryId);
    }

    const categories = [
      ...(await this.categories.findByGroup(category.groupId)),
    ].sort((left, right) => left.sortOrder - right.sortOrder);
    const currentIndex = categories.findIndex((item) => item.id === categoryId);
    const targetIndex =
      direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const target = categories[targetIndex];

    if (!target) {
      return;
    }

    const { instant } = this.clock.now();
    await this.unitOfWork.run(async () => {
      await this.categories.save({
        ...category,
        sortOrder: target.sortOrder,
        updatedAt: instant,
      });
      await this.categories.save({
        ...target,
        sortOrder: category.sortOrder,
        updatedAt: instant,
      });
    });
  }
}
