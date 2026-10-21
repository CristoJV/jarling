import { assertValidBudgetMonth } from '@/domain/entities/budget-allocation';
import { InvalidBudgetMoveError } from '@/domain/errors/invalid-budget-move-error';
import type { Money } from '@/domain/value-objects/money';
import { isValidIsoDate } from '@/domain/value-objects/iso-date';
import { isValidIsoInstant } from '@/domain/value-objects/iso-instant';

export const BUDGET_ALLOCATION_MOVEMENT_PROVENANCES = [
  'recorded',
  'migration_baseline',
  'sample',
] as const;

export type BudgetAllocationMovementProvenance =
  (typeof BUDGET_ALLOCATION_MOVEMENT_PROVENANCES)[number];

export type BudgetAllocationMovement = Readonly<{
  id: string;
  month: string;
  amount: Money;
  sourceCategoryId?: string;
  destinationCategoryId?: string;
  occurredAt?: string;
  occurredOn?: string;
  provenance: BudgetAllocationMovementProvenance;
  recordedAt: string;
}>;

export function createBudgetAllocationMovement(
  movement: BudgetAllocationMovement,
): BudgetAllocationMovement {
  assertValidBudgetMonth(movement.month);
  if (movement.amount.cents <= 0) {
    throw new InvalidBudgetMoveError('Movement amount must be positive.');
  }
  if (
    movement.sourceCategoryId === movement.destinationCategoryId &&
    (movement.sourceCategoryId !== undefined ||
      movement.destinationCategoryId === undefined)
  ) {
    throw new InvalidBudgetMoveError('Movement locations must be different.');
  }
  if (
    (movement.occurredAt === undefined) !==
    (movement.occurredOn === undefined)
  ) {
    throw new InvalidBudgetMoveError(
      'Movement occurrence instant and date must be recorded together.',
    );
  }
  if (
    (movement.occurredOn !== undefined &&
      !isValidIsoDate(movement.occurredOn)) ||
    (movement.occurredAt !== undefined &&
      !isValidIsoInstant(movement.occurredAt)) ||
    !isValidIsoInstant(movement.recordedAt)
  ) {
    throw new InvalidBudgetMoveError('Movement timestamps must be valid.');
  }
  return movement;
}
