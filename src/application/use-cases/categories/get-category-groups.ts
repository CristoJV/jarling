import type { Category } from '@/domain/entities/category';
import type { CategoryGroup } from '@/domain/entities/category-group';
import type { CategoryGroupRepository } from '@/domain/repositories/category-group-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';

export type CategoryGroupSummary = Readonly<{
  group: CategoryGroup;
  categories: readonly Category[];
}>;

export class GetCategoryGroups {
  constructor(
    private readonly groups: CategoryGroupRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async execute(): Promise<readonly CategoryGroupSummary[]> {
    const [groups, categories] = await Promise.all([
      this.groups.findAll(),
      this.categories.findAll(),
    ]);

    return [...groups]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((group) => ({
        group,
        categories: categories
          .filter((category) => category.groupId === group.id)
          .sort((left, right) => left.sortOrder - right.sortOrder),
      }));
  }
}
