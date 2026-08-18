import type { CategoryGroup } from '@/domain/entities/category-group';
import type { CategoryGroupRepository } from '@/domain/repositories/category-group-repository';

export class InMemoryCategoryGroupRepository implements CategoryGroupRepository {
  private readonly groups = new Map<string, CategoryGroup>();

  async findAll(): Promise<readonly CategoryGroup[]> {
    return [...this.groups.values()].sort(
      (left, right) => left.sortOrder - right.sortOrder,
    );
  }

  async findById(id: string): Promise<CategoryGroup | null> {
    return this.groups.get(id) ?? null;
  }

  async save(group: CategoryGroup): Promise<void> {
    this.groups.set(group.id, group);
  }
}
