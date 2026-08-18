import { Money } from '@/domain/value-objects/money';

import { createCategoryTarget } from './category-target';

const base = {
  id: 'target-1',
  categoryId: 'category-1',
  amount: Money.fromCents(10_000),
  createdAt: '2026-08-18T10:00:00.000Z',
  updatedAt: '2026-08-18T10:00:00.000Z',
} as const;

describe('CategoryTarget', () => {
  it.each([
    {
      ...base,
      kind: 'weekly' as const,
      dayOfWeek: 6 as const,
      fundingMode: 'set_aside' as const,
    },
    {
      ...base,
      kind: 'monthly' as const,
      dayOfMonth: 0,
      fundingMode: 'refill_up_to' as const,
    },
    {
      ...base,
      kind: 'yearly' as const,
      targetDate: '2026-12-31',
      fundingMode: 'set_aside' as const,
    },
    {
      ...base,
      kind: 'custom' as const,
      customFundingMode: 'balance' as const,
    },
  ])('creates a valid $kind target', (target) => {
    expect(createCategoryTarget(target)).toEqual(target);
  });

  it.each([
    { ...base, kind: 'weekly' as const, dayOfWeek: 6 as const },
    {
      ...base,
      kind: 'weekly' as const,
      dayOfWeek: 6 as const,
      fundingMode: 'refill_up_to' as const,
      targetDate: '2026-12-31',
    },
    { ...base, kind: 'monthly' as const, dayOfMonth: 32 },
    { ...base, kind: 'monthly' as const },
    {
      ...base,
      kind: 'yearly' as const,
      targetDate: '2026-02-30',
      fundingMode: 'set_aside' as const,
    },
    { ...base, kind: 'custom' as const },
    { ...base, kind: 'custom' as const, customFundingMode: 'unknown' },
    {
      ...base,
      kind: 'custom' as const,
      customFundingMode: 'set_aside' as const,
      dayOfMonth: 1,
    },
    { ...base, kind: 'monthly' as const, dayOfMonth: 1, amount: Money.zero() },
  ])('rejects an invalid field combination', (target) => {
    expect(() => createCategoryTarget(target as never)).toThrow(
      'Invalid category target',
    );
  });
});
