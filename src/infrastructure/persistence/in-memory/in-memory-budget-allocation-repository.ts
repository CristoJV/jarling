import type { BudgetAllocation } from '@/domain/entities/budget-allocation';
import type { BudgetAllocationRepository } from '@/domain/repositories/budget-allocation-repository';
import { Money } from '@/domain/value-objects/money';

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

  async findByCategory(
    categoryId: string,
  ): Promise<readonly BudgetAllocation[]> {
    return [...this.allocations.values()]
      .filter((allocation) => allocation.categoryId === categoryId)
      .sort((left, right) => left.month.localeCompare(right.month));
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

  async reassignCategory(
    sourceCategoryId: string,
    destinationCategoryId: string,
    updatedAt: string,
  ): Promise<void> {
    const source = await this.findByCategory(sourceCategoryId);
    for (const allocation of source) {
      const destination = await this.findByCategoryAndMonth(
        destinationCategoryId,
        allocation.month,
      );
      if (destination) {
        this.allocations.set(destination.id, {
          ...destination,
          amount: Money.fromCents(
            destination.amount.cents + allocation.amount.cents,
          ),
          updatedAt,
        });
        this.allocations.delete(allocation.id);
      } else {
        this.allocations.set(allocation.id, {
          ...allocation,
          categoryId: destinationCategoryId,
          updatedAt,
        });
      }
    }
  }

  async deleteByCategory(categoryId: string): Promise<void> {
    for (const allocation of await this.findByCategory(categoryId)) {
      this.allocations.delete(allocation.id);
    }
  }
}
