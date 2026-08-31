import type { CategoryFundingState } from '@/domain/services/calculate-category-funding-state';

export function applySmartAssignToDraft(
  assignedCents: number,
  funding: CategoryFundingState,
): number {
  return assignedCents + Math.max(0, funding.requiredAssignment.cents);
}
