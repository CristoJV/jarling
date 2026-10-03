import type { Clock } from '@/application/ports/clock';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { moveCategoryToGroup, type Category } from '@/domain/entities/category';
import { CategoryGroupNotFoundError } from '@/domain/errors/category-group-not-found-error';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { ProtectedCategoryError } from '@/domain/errors/protected-category-error';
import type { CategoryGroupRepository } from '@/domain/repositories/category-group-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import { nextSortOrder } from '@/domain/services/sort-order';

export class MoveCategory {
  constructor(
    private readonly groups: CategoryGroupRepository,
    private readonly categories: CategoryRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(categoryId: string, groupId: string): Promise<Category> {
    const category = await this.categories.findById(categoryId);
    if (!category) throw new CategoryNotFoundError(categoryId);
    if (category.linkedAccountId) throw new ProtectedCategoryError();
    if (!(await this.groups.findById(groupId))) {
      throw new CategoryGroupNotFoundError(groupId);
    }
    if (category.groupId === groupId) return category;

    const destinationCategories = await this.categories.findByGroup(groupId);
    const moved = moveCategoryToGroup(
      category,
      groupId,
      nextSortOrder(destinationCategories),
      this.clock.now().instant,
    );
    return this.unitOfWork.run(async () => {
      await this.categories.save(moved);
      return moved;
    });
  }
}
