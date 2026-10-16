import type { BudgetAllocationMovement } from '@/domain/entities/budget-allocation-movement';

export interface BudgetAllocationMovementRepository {
  findByCategoryAndMonth(
    categoryId: string,
    month: string,
  ): Promise<readonly BudgetAllocationMovement[]>;
  save(movement: BudgetAllocationMovement): Promise<void>;
  replaceCategory(
    sourceCategoryId: string,
    destinationCategoryId?: string,
  ): Promise<void>;
}
