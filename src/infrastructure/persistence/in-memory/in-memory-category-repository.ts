import type { Category } from '@/domain/entities/category';
import type { CategoryRepository } from '@/domain/repositories/category-repository';

export class InMemoryCategoryRepository implements CategoryRepository {
  private readonly categories = new Map<string, Category>();

  async findAll(): Promise<readonly Category[]> {
    return [...this.categories.values()].sort(
      (left, right) => left.sortOrder - right.sortOrder,
    );
  }

  async findByGroup(groupId: string): Promise<readonly Category[]> {
    const categories = await this.findAll();
    return categories.filter((category) => category.groupId === groupId);
  }

  async findById(id: string): Promise<Category | null> {
    return this.categories.get(id) ?? null;
  }

  async save(category: Category): Promise<void> {
    this.categories.set(category.id, category);
  }

  async deleteById(id: string): Promise<void> {
    this.categories.delete(id);
  }
}
