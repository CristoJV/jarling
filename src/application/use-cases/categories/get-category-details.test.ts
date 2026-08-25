import type { Clock } from '@/application/ports/clock';
import type { CategoryTarget } from '@/domain/entities/category-target';
import type { BudgetMonthValues } from '@/domain/services/calculate-budget-month';
import { Money } from '@/domain/value-objects/money';
import { InMemoryCategoryTargetRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-target-repository';

import { GetCategoryDetails } from './get-category-details';

const values = {
  category: {
    id: 'category-1',
    groupId: 'group-1',
    name: 'Travel',
    hidden: false,
    sortOrder: 0,
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  },
  availableFromPreviousMonth: Money.zero(),
  assigned: Money.fromCents(20_000),
  activity: Money.zero(),
  available: Money.fromCents(20_000),
  spendingTransactions: [],
  assignedHistory: [
    { month: '2026-07', amount: Money.fromCents(10_000) },
    { month: '2026-08', amount: Money.fromCents(20_000) },
  ],
  spendingHistory: [],
} as const;

const budget: BudgetMonthValues = {
  month: '2026-08',
  readyToAssign: Money.fromCents(100_000),
  groups: [
    {
      group: {
        id: 'group-1',
        name: 'Wants',
        sortOrder: 0,
        createdAt: '2026-07-01T10:00:00.000Z',
        updatedAt: '2026-07-01T10:00:00.000Z',
      },
      categories: [values],
    },
  ],
};

const clock: Clock = {
  now: () => ({
    instant: '2026-08-20T10:00:00.000Z',
    date: '2026-08-20',
  }),
};

describe('GetCategoryDetails', () => {
  it('returns budget values without target progress when no target exists', async () => {
    const useCase = new GetCategoryDetails(
      { execute: async () => budget },
      new InMemoryCategoryTargetRepository(),
      clock,
    );

    await expect(useCase.execute('category-1', '2026-08')).resolves.toEqual({
      values,
    });
  });

  it('calculates target progress from the complete funding history', async () => {
    const targets = new InMemoryCategoryTargetRepository();
    const target: CategoryTarget = {
      id: 'target-1',
      categoryId: 'category-1',
      kind: 'custom',
      amount: Money.fromCents(100_000),
      startsOn: '2026-07-01',
      customFundingMode: 'set_aside',
      targetDate: '2026-09-30',
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-01T10:00:00.000Z',
    };
    await targets.save(target);

    const result = await new GetCategoryDetails(
      { execute: async () => budget },
      targets,
      clock,
    ).execute('category-1', '2026-08');

    expect(result.target).toEqual(target);
    expect(result.progress).toEqual(
      expect.objectContaining({
        fundedTowardTotal: Money.fromCents(30_000),
        recommended: Money.fromCents(25_000),
        totalProgress: 0.3,
      }),
    );
  });

  it('fails explicitly for an unknown category', async () => {
    const useCase = new GetCategoryDetails(
      { execute: async () => budget },
      new InMemoryCategoryTargetRepository(),
      clock,
    );

    await expect(useCase.execute('missing', '2026-08')).rejects.toThrow(
      'missing',
    );
  });
});
