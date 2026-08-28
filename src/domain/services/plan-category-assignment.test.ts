import { Money } from '@/domain/value-objects/money';

import { planCategoryAssignment } from './plan-category-assignment';

describe('planCategoryAssignment', () => {
  it.each([
    [10_000, 20_000, 'assign-directly'],
    [10_000, 10_000, 'assign-directly'],
    [10_000, 5_000, 'move-money'],
    [10_000, 0, 'move-money'],
  ] as const)(
    'plans required %s with Ready to Assign %s as %s',
    (required, ready, expected) => {
      expect(
        planCategoryAssignment(
          Money.fromCents(required),
          Money.fromCents(ready),
        ),
      ).toEqual({ kind: expected, amountCents: required });
    },
  );

  it('does nothing when no assignment is required', () => {
    expect(planCategoryAssignment(Money.zero(), Money.zero())).toEqual({
      kind: 'none',
      amountCents: 0,
    });
  });
});
