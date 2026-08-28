import type { CategoryFundingState } from '@/domain/services/calculate-category-funding-state';

export type TargetSnoozeAction = 'enable' | 'cancel' | null;

export function targetSnoozeAction(
  funding: CategoryFundingState,
): TargetSnoozeAction {
  if (funding.targetSnoozed) return 'cancel';
  if (
    funding.canToggleSnooze &&
    (funding.fundingStatus === 'underfunded' ||
      funding.requiredForTarget.cents > 0)
  ) {
    return 'enable';
  }
  return null;
}
