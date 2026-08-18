import type { CategoryTarget } from '@/domain/entities/category-target';

export interface CategoryTargetRepository {
  findAll(): Promise<readonly CategoryTarget[]>;
  findByCategory(categoryId: string): Promise<CategoryTarget | null>;
  save(target: CategoryTarget): Promise<void>;
  deleteByCategory(categoryId: string): Promise<void>;
}
