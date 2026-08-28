import type { BudgetAllocation } from '@/domain/entities/budget-allocation';

export interface BudgetAllocationRepository {
  findAll(): Promise<readonly BudgetAllocation[]>;
  findByCategoryAndMonth(
    categoryId: string,
    month: string,
  ): Promise<BudgetAllocation | null>;
  findThroughMonth(month: string): Promise<readonly BudgetAllocation[]>;
  findByCategory(categoryId: string): Promise<readonly BudgetAllocation[]>;
  save(allocation: BudgetAllocation): Promise<void>;
  reassignCategory(
    sourceCategoryId: string,
    destinationCategoryId: string,
    updatedAt: string,
  ): Promise<void>;
  deleteByCategory(categoryId: string): Promise<void>;
}
