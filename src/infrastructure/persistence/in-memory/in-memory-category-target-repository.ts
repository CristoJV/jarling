import type { CategoryTarget } from '@/domain/entities/category-target';
import type { CategoryTargetRepository } from '@/domain/repositories/category-target-repository';

export class InMemoryCategoryTargetRepository implements CategoryTargetRepository {
  private readonly targets = new Map<string, CategoryTarget>();

  async findAll(): Promise<readonly CategoryTarget[]> {
    return [...this.targets.values()].sort((left, right) =>
      left.categoryId.localeCompare(right.categoryId),
    );
  }

  async findByCategory(categoryId: string): Promise<CategoryTarget | null> {
    return (
      [...this.targets.values()].find(
        (target) => target.categoryId === categoryId,
      ) ?? null
    );
  }

  async save(target: CategoryTarget): Promise<void> {
    const existing = await this.findByCategory(target.categoryId);
    if (existing && existing.id !== target.id) this.targets.delete(existing.id);
    this.targets.set(target.id, target);
  }

  async deleteByCategory(categoryId: string): Promise<void> {
    const existing = await this.findByCategory(categoryId);
    if (existing) this.targets.delete(existing.id);
  }
}
