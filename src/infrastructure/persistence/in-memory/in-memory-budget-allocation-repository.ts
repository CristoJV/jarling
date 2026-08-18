import type { BudgetAllocation } from '@/domain/entities/budget-allocation';
import type { BudgetAllocationRepository } from '@/domain/repositories/budget-allocation-repository';

export class InMemoryBudgetAllocationRepository implements BudgetAllocationRepository {
  private readonly allocations = new Map<string, BudgetAllocation>();

  async findByCategoryAndMonth(
    categoryId: string,
    month: string,
  ): Promise<BudgetAllocation | null> {
    return (
      [...this.allocations.values()].find(
        (allocation) =>
          allocation.categoryId === categoryId && allocation.month === month,
      ) ?? null
    );
  }

  async findThroughMonth(month: string): Promise<readonly BudgetAllocation[]> {
    return [...this.allocations.values()]
      .filter((allocation) => allocation.month <= month)
      .sort(
        (left, right) =>
          left.month.localeCompare(right.month) ||
          left.categoryId.localeCompare(right.categoryId),
      );
  }

  async save(allocation: BudgetAllocation): Promise<void> {
    for (const [id, existing] of this.allocations) {
      if (
        id !== allocation.id &&
        existing.categoryId === allocation.categoryId &&
        existing.month === allocation.month
      ) {
        this.allocations.delete(id);
      }
    }
    this.allocations.set(allocation.id, allocation);
  }
}
