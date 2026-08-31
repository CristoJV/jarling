import type { CategoryFundingState } from '@/domain/services/calculate-category-funding-state';
import { Money } from '@/domain/value-objects/money';

import { applySmartAssignToDraft } from './smart-assign-draft';

function funding(requiredCents: number): CategoryFundingState {
  return {
    targetSnoozed: false,
    canToggleSnooze: true,
    requiredForTarget: Money.fromCents(requiredCents),
    requiredForOverspending: Money.zero(),
    requiredAssignment: Money.fromCents(requiredCents),
    assignmentReason: requiredCents > 0 ? 'target' : null,
    fundingStatus: requiredCents > 0 ? 'underfunded' : 'funded',
  };
}

describe('Smart Assign draft', () => {
  it('adds the domain delta to the current draft instead of replacing or duplicating it', () => {
    expect(applySmartAssignToDraft(4_000, funding(6_000))).toBe(10_000);
  });

  it('does nothing when the current draft has no remaining suggestion', () => {
    expect(applySmartAssignToDraft(10_000, funding(0))).toBe(10_000);
  });
});
