import type { CategoryTarget } from '@/domain/entities/category-target';
import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import {
  calculateBudgetCategoryTargetProgress,
  type TargetProgress,
} from '@/domain/services/calculate-target-progress';
import { Money } from '@/domain/value-objects/money';

export type CategoryAssignmentReason = 'overspending' | 'target';
export type CategoryFundingStatus =
  'neutral' | 'funded' | 'underfunded' | 'overspent';

export type CategoryFundingState = Readonly<{
  target?: CategoryTarget;
  targetProgress?: TargetProgress;
  effectiveTarget?: CategoryTarget;
  effectiveProgress?: TargetProgress;
  targetSnoozed: boolean;
  canToggleSnooze: boolean;
  requiredForTarget: Money;
  requiredForOverspending: Money;
  requiredAssignment: Money;
  assignmentReason: CategoryAssignmentReason | null;
  fundingStatus: CategoryFundingStatus;
}>;

export function calculateCategoryFundingState(
  input: Readonly<{
    values: BudgetCategoryValues;
    target?: CategoryTarget;
    targetSnoozed?: boolean;
    month: string;
    today: string;
  }>,
): CategoryFundingState {
  const targetApplies = Boolean(
    input.target && input.month >= input.target.startsOn.slice(0, 7),
  );
  const targetSnoozed = targetApplies && input.targetSnoozed === true;
  const targetProgress = input.target
    ? calculateBudgetCategoryTargetProgress({
        target: input.target,
        values: input.values,
        month: input.month,
        today: input.today,
      })
    : undefined;
  const effectiveTarget =
    targetApplies && !targetSnoozed ? input.target : undefined;
  const effectiveProgress = effectiveTarget ? targetProgress : undefined;
  const requiredForTarget = effectiveProgress?.recommended ?? Money.zero();
  const requiredForOverspending = Money.fromCents(
    Math.max(0, -input.values.available.cents),
  );
  const overspendingDominates =
    requiredForOverspending.cents >= requiredForTarget.cents &&
    requiredForOverspending.cents > 0;
  const requiredAssignment = Money.fromCents(
    Math.max(requiredForTarget.cents, requiredForOverspending.cents),
  );
  const assignmentReason: CategoryAssignmentReason | null =
    requiredAssignment.cents === 0
      ? null
      : overspendingDominates
        ? 'overspending'
        : 'target';
  const fundingStatus: CategoryFundingStatus =
    requiredForOverspending.cents > 0
      ? 'overspent'
      : requiredForTarget.cents > 0
        ? 'underfunded'
        : effectiveTarget || targetSnoozed || input.values.available.cents > 0
          ? 'funded'
          : 'neutral';

  return {
    ...(input.target ? { target: input.target } : {}),
    ...(targetProgress ? { targetProgress } : {}),
    ...(effectiveTarget ? { effectiveTarget } : {}),
    ...(effectiveProgress ? { effectiveProgress } : {}),
    targetSnoozed,
    canToggleSnooze: targetApplies,
    requiredForTarget,
    requiredForOverspending,
    requiredAssignment,
    assignmentReason,
    fundingStatus,
  };
}
