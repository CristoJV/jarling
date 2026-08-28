import type { CategoryFundingState } from '@/domain/services/calculate-category-funding-state';
import { Money } from '@/domain/value-objects/money';

import { targetSnoozeAction } from './target-snooze-action';

function funding(
  changes: Partial<CategoryFundingState> = {},
): CategoryFundingState {
  return {
    targetSnoozed: false,
    canToggleSnooze: true,
    requiredForTarget: Money.zero(),
    requiredForOverspending: Money.zero(),
    requiredAssignment: Money.zero(),
    assignmentReason: null,
    fundingStatus: 'funded',
    ...changes,
  };
}

describe('targetSnoozeAction', () => {
  it('offers enable only while the target is underfunded', () => {
    expect(
      targetSnoozeAction(
        funding({
          fundingStatus: 'underfunded',
          requiredForTarget: Money.fromCents(10_000),
        }),
      ),
    ).toBe('enable');
    expect(targetSnoozeAction(funding())).toBeNull();
    expect(
      targetSnoozeAction(
        funding({ canToggleSnooze: false, fundingStatus: 'underfunded' }),
      ),
    ).toBeNull();
  });

  it('always offers cancel while the target is snoozed', () => {
    expect(
      targetSnoozeAction(
        funding({
          targetSnoozed: true,
          fundingStatus: 'funded',
          canToggleSnooze: true,
        }),
      ),
    ).toBe('cancel');
  });

  it('keeps snooze available when overspending masks a target shortfall', () => {
    expect(
      targetSnoozeAction(
        funding({
          fundingStatus: 'overspent',
          requiredForTarget: Money.fromCents(5_000),
          requiredForOverspending: Money.fromCents(10_000),
        }),
      ),
    ).toBe('enable');
  });
});
