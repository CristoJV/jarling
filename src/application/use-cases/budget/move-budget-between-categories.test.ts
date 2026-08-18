import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import { PopulateSampleData } from '@/application/use-cases/samples/populate-sample-data';
import { EnsureDefaultCategories } from '@/application/use-cases/categories/ensure-default-categories';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { InsufficientCategoryAvailableError } from '@/domain/errors/insufficient-category-available-error';
import { InvalidBudgetMoveError } from '@/domain/errors/invalid-budget-move-error';
import { Money } from '@/domain/value-objects/money';
import { ImmediateUnitOfWork } from '@/infrastructure/persistence/in-memory/immediate-unit-of-work';
import { InMemoryAccountRepository } from '@/infrastructure/persistence/in-memory/in-memory-account-repository';
import { InMemoryBudgetAllocationRepository } from '@/infrastructure/persistence/in-memory/in-memory-budget-allocation-repository';
import { InMemoryCategoryGroupRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-group-repository';
import { InMemoryCategoryRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-repository';
import { InMemoryCategoryTargetRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-target-repository';
import { InMemoryTransactionRepository } from '@/infrastructure/persistence/in-memory/in-memory-transaction-repository';

import { GetBudgetMonth } from './get-budget-month';
import { MoveBudgetBetweenCategories } from './move-budget-between-categories';

class FixedClock implements Clock {
  now() {
    return { instant: '2026-08-18T12:00:00.000Z', date: '2026-08-18' };
  }
}

class SequenceIdGenerator implements IdGenerator {
  private index = 0;

  next(): string {
    this.index += 1;
    return `move-allocation-${this.index}`;
  }
}

async function setup() {
  const accounts = new InMemoryAccountRepository();
  const groups = new InMemoryCategoryGroupRepository();
  const categories = new InMemoryCategoryRepository();
  const transactions = new InMemoryTransactionRepository();
  const allocations = new InMemoryBudgetAllocationRepository();
  const unitOfWork = new ImmediateUnitOfWork();
  const clock = new FixedClock();
  await new EnsureDefaultCategories(
    groups,
    categories,
    unitOfWork,
    clock,
  ).execute();
  await new PopulateSampleData(
    accounts,
    groups,
    categories,
    transactions,
    allocations,
    new InMemoryCategoryTargetRepository(),
    unitOfWork,
    clock,
  ).execute();
  const getBudget = new GetBudgetMonth(
    accounts,
    groups,
    categories,
    transactions,
    allocations,
  );
  const move = new MoveBudgetBetweenCategories(
    categories,
    allocations,
    getBudget,
    unitOfWork,
    new SequenceIdGenerator(),
    clock,
  );
  const byName = new Map(
    (await categories.findAll()).map((category) => [category.name, category]),
  );

  return { categories, getBudget, move, byName };
}

describe('MoveBudgetBetweenCategories', () => {
  it('covers overspending atomically without changing Ready to Assign', async () => {
    const { getBudget, move, byName } = await setup();
    const source = byName.get('⚡ Utilities');
    const target = byName.get('🚗 Transportation');
    if (!source || !target) throw new Error('Sample categories missing.');
    const before = await getBudget.execute('2026-08');

    await move.execute({
      sourceCategoryId: source.id,
      targetCategoryId: target.id,
      month: '2026-08',
      amountCents: 2_000,
    });

    const after = await getBudget.execute('2026-08');
    const values = new Map(
      after.groups.flatMap(({ categories }) =>
        categories.map(
          (category) => [category.category.name, category] as const,
        ),
      ),
    );
    expect(before.readyToAssign).toEqual(Money.zero());
    expect(after.readyToAssign).toEqual(before.readyToAssign);
    expect(values.get('⚡ Utilities')).toEqual(
      expect.objectContaining({
        assigned: Money.fromCents(48_000),
        available: Money.fromCents(48_000),
      }),
    );
    expect(values.get('🚗 Transportation')).toEqual(
      expect.objectContaining({
        assigned: Money.fromCents(17_000),
        available: Money.zero(),
      }),
    );
  });

  it('refuses to move more than the source Available', async () => {
    const { move, byName } = await setup();
    const source = byName.get('⚡ Utilities');
    const target = byName.get('🚗 Transportation');
    if (!source || !target) throw new Error('Sample categories missing.');

    await expect(
      move.execute({
        sourceCategoryId: source.id,
        targetCategoryId: target.id,
        month: '2026-08',
        amountCents: 50_001,
      }),
    ).rejects.toThrow(InsufficientCategoryAvailableError);
  });

  it('rejects zero amounts, identical categories and missing categories', async () => {
    const { move, byName } = await setup();
    const source = byName.get('⚡ Utilities');
    if (!source) throw new Error('Sample category missing.');

    await expect(
      move.execute({
        sourceCategoryId: source.id,
        targetCategoryId: source.id,
        month: '2026-08',
        amountCents: 100,
      }),
    ).rejects.toThrow(InvalidBudgetMoveError);
    await expect(
      move.execute({
        sourceCategoryId: source.id,
        targetCategoryId: 'missing',
        month: '2026-08',
        amountCents: 100,
      }),
    ).rejects.toThrow(CategoryNotFoundError);
    await expect(
      move.execute({
        sourceCategoryId: source.id,
        targetCategoryId: 'another',
        month: '2026-08',
        amountCents: 0,
      }),
    ).rejects.toThrow(InvalidBudgetMoveError);
  });
});
