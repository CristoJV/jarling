import type { Clock } from '@/application/ports/clock';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { setCategoryNotes, type Category } from '@/domain/entities/category';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import type { CategoryRepository } from '@/domain/repositories/category-repository';

export class UpdateCategoryNotes {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(categoryId: string, notes: string): Promise<Category> {
    const category = await this.categories.findById(categoryId);
    if (!category) throw new CategoryNotFoundError(categoryId);

    const updated = setCategoryNotes(category, notes, this.clock.now().instant);
    return this.unitOfWork.run(async () => {
      await this.categories.save(updated);
      return updated;
    });
  }
}
