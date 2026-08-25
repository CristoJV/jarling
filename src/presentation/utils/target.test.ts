import type { CategoryTarget } from '@/domain/entities/category-target';
import { Money } from '@/domain/value-objects/money';

import { targetDetailCopy } from './target';

const base = {
  id: 'target-1',
  categoryId: 'category-1',
  amount: Money.fromCents(10_000),
  startsOn: '2026-08-20',
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
} as const;

describe('targetDetailCopy', () => {
  it('separates a recurring target strategy from its due date', () => {
    const target: CategoryTarget = {
      ...base,
      kind: 'yearly',
      targetDate: '2026-12-31',
      fundingMode: 'set_aside',
    };

    expect(targetDetailCopy(target, 'en')).toEqual(
      expect.objectContaining({
        title: expect.stringContaining('/year'),
        subtitle: expect.stringContaining('By'),
        due: expect.stringContaining('2026'),
      }),
    );
  });

  it('describes undated custom targets as ongoing', () => {
    const target: CategoryTarget = {
      ...base,
      kind: 'custom',
      customFundingMode: 'balance',
    };

    expect(targetDetailCopy(target, 'en')).toEqual(
      expect.objectContaining({
        title: expect.stringContaining('Have a balance'),
        subtitle: 'Ongoing',
      }),
    );
  });
});
