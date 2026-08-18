import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  createCategoryGroup,
  type CategoryGroup,
} from '@/domain/entities/category-group';
import type { CategoryGroupRepository } from '@/domain/repositories/category-group-repository';

export class CreateCategoryGroup {
  constructor(
    private readonly groups: CategoryGroupRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(name: string): Promise<CategoryGroup> {
    const groups = await this.groups.findAll();
    const { instant } = this.clock.now();
    const group = createCategoryGroup({
      id: this.ids.next(),
      name,
      sortOrder:
        groups.reduce(
          (maximum, item) => Math.max(maximum, item.sortOrder),
          -1,
        ) + 1,
      createdAt: instant,
      updatedAt: instant,
    });

    return this.unitOfWork.run(async () => {
      await this.groups.save(group);
      return group;
    });
  }
}
