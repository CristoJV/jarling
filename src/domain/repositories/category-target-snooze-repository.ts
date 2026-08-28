import type { CategoryTargetSnooze } from '@/domain/entities/category-target-snooze';

export interface CategoryTargetSnoozeRepository {
  findByMonth(month: string): Promise<readonly CategoryTargetSnooze[]>;
  exists(categoryId: string, month: string): Promise<boolean>;
  save(snooze: CategoryTargetSnooze): Promise<void>;
  delete(categoryId: string, month: string): Promise<void>;
  deleteByCategory(categoryId: string): Promise<void>;
}
