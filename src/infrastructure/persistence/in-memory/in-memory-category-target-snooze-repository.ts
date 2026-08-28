import type { CategoryTargetSnooze } from '@/domain/entities/category-target-snooze';
import type { CategoryTargetSnoozeRepository } from '@/domain/repositories/category-target-snooze-repository';

function key(categoryId: string, month: string): string {
  return `${categoryId}\u0000${month}`;
}

export class InMemoryCategoryTargetSnoozeRepository implements CategoryTargetSnoozeRepository {
  private readonly snoozes = new Map<string, CategoryTargetSnooze>();

  async findByMonth(month: string): Promise<readonly CategoryTargetSnooze[]> {
    return [...this.snoozes.values()]
      .filter((snooze) => snooze.month === month)
      .sort((left, right) => left.categoryId.localeCompare(right.categoryId));
  }

  async exists(categoryId: string, month: string): Promise<boolean> {
    return this.snoozes.has(key(categoryId, month));
  }

  async save(snooze: CategoryTargetSnooze): Promise<void> {
    this.snoozes.set(key(snooze.categoryId, snooze.month), snooze);
  }

  async delete(categoryId: string, month: string): Promise<void> {
    this.snoozes.delete(key(categoryId, month));
  }

  async deleteByCategory(categoryId: string): Promise<void> {
    for (const [snoozeKey, snooze] of this.snoozes) {
      if (snooze.categoryId === categoryId) this.snoozes.delete(snoozeKey);
    }
  }
}
