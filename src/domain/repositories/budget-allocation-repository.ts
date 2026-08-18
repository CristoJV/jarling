import type { BudgetAllocation } from '@/domain/entities/budget-allocation';

export interface BudgetAllocationRepository {
  findByCategoryAndMonth(
    categoryId: string,
    month: string,
  ): Promise<BudgetAllocation | null>;
  findThroughMonth(month: string): Promise<readonly BudgetAllocation[]>;
  save(allocation: BudgetAllocation): Promise<void>;
}
