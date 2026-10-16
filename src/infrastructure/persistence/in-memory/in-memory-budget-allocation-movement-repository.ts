import type { BudgetAllocationMovement } from '@/domain/entities/budget-allocation-movement';
import type { BudgetAllocationMovementRepository } from '@/domain/repositories/budget-allocation-movement-repository';

export class InMemoryBudgetAllocationMovementRepository implements BudgetAllocationMovementRepository {
  private readonly movements = new Map<string, BudgetAllocationMovement>();

  async findByCategoryAndMonth(
    categoryId: string,
    month: string,
  ): Promise<readonly BudgetAllocationMovement[]> {
    return [...this.movements.values()]
      .filter(
        (movement) =>
          movement.month === month &&
          (movement.sourceCategoryId === categoryId ||
            movement.destinationCategoryId === categoryId),
      )
      .sort(
        (left, right) =>
          (left.occurredAt ?? '').localeCompare(right.occurredAt ?? '') ||
          left.id.localeCompare(right.id),
      );
  }

  async save(movement: BudgetAllocationMovement): Promise<void> {
    this.movements.set(movement.id, movement);
  }

  async replaceCategory(
    sourceCategoryId: string,
    destinationCategoryId?: string,
  ): Promise<void> {
    for (const [id, movement] of this.movements) {
      const source =
        movement.sourceCategoryId === sourceCategoryId
          ? destinationCategoryId
          : movement.sourceCategoryId;
      const destination =
        movement.destinationCategoryId === sourceCategoryId
          ? destinationCategoryId
          : movement.destinationCategoryId;
      if (source === destination) {
        this.movements.delete(id);
      } else {
        this.movements.set(id, {
          ...movement,
          ...(source ? { sourceCategoryId: source } : {}),
          ...(destination ? { destinationCategoryId: destination } : {}),
          ...(!source ? { sourceCategoryId: undefined } : {}),
          ...(!destination ? { destinationCategoryId: undefined } : {}),
        });
      }
    }
  }
}
