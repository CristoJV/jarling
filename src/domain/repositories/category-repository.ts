import type { Category } from '@/domain/entities/category';

export interface CategoryRepository {
  findAll(): Promise<readonly Category[]>;
  findByGroup(groupId: string): Promise<readonly Category[]>;
  findById(id: string): Promise<Category | null>;
  save(category: Category): Promise<void>;
}
