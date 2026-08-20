import type { Clock } from '@/application/ports/clock';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  setCategoryHidden as setHidden,
  type Category,
} from '@/domain/entities/category';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { ProtectedCategoryError } from '@/domain/errors/protected-category-error';
import { isProtectedCategory } from '@/domain/policies/system-categories';
import type { CategoryRepository } from '@/domain/repositories/category-repository';

export class SetCategoryHidden {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(categoryId: string, hidden: boolean): Promise<Category> {
    if (isProtectedCategory(categoryId)) throw new ProtectedCategoryError();
    const category = await this.categories.findById(categoryId);

    if (!category) {
      throw new CategoryNotFoundError(categoryId);
    }

    const updated = setHidden(category, hidden, this.clock.now().instant);
    return this.unitOfWork.run(async () => {
      await this.categories.save(updated);
      return updated;
    });
  }
}
