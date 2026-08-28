import { assertValidBudgetMonth } from '@/domain/entities/budget-allocation';
import type { CategoryTargetSnooze } from '@/domain/entities/category-target-snooze';
import type { CategoryTargetSnoozeRepository } from '@/domain/repositories/category-target-snooze-repository';

export class GetCategoryTargetSnoozes {
  constructor(private readonly snoozes: CategoryTargetSnoozeRepository) {}

  execute(month: string): Promise<readonly CategoryTargetSnooze[]> {
    assertValidBudgetMonth(month);
    return this.snoozes.findByMonth(month);
  }
}
