import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { createCategory, type Category } from '@/domain/entities/category';
import { CategoryGroupNotFoundError } from '@/domain/errors/category-group-not-found-error';
import type { CategoryGroupRepository } from '@/domain/repositories/category-group-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';

export type CreateCategoryInput = Readonly<{
  groupId: string;
  name: string;
}>;

export class CreateCategory {
  constructor(
    private readonly groups: CategoryGroupRepository,
    private readonly categories: CategoryRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateCategoryInput): Promise<Category> {
    if (!(await this.groups.findById(input.groupId))) {
      throw new CategoryGroupNotFoundError(input.groupId);
    }

    const categories = await this.categories.findByGroup(input.groupId);
    const { instant } = this.clock.now();
    const category = createCategory({
      id: this.ids.next(),
      groupId: input.groupId,
      name: input.name,
      hidden: false,
      sortOrder:
        categories.reduce(
          (maximum, item) => Math.max(maximum, item.sortOrder),
          -1,
        ) + 1,
      createdAt: instant,
      updatedAt: instant,
    });

    return this.unitOfWork.run(async () => {
      await this.categories.save(category);
      return category;
    });
  }
}
