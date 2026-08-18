import type { CategoryGroup } from '@/domain/entities/category-group';

export interface CategoryGroupRepository {
  findAll(): Promise<readonly CategoryGroup[]>;
  findById(id: string): Promise<CategoryGroup | null>;
  save(group: CategoryGroup): Promise<void>;
}
