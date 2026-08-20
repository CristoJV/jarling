import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { EnsureDefaultCategories } from '@/application/use-cases/categories/ensure-default-categories';
import { PopulateSampleData } from '@/application/use-cases/samples/populate-sample-data';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { InsufficientCategoryAvailableError } from '@/domain/errors/insufficient-category-available-error';
import { InsufficientReadyToAssignError } from '@/domain/errors/insufficient-ready-to-assign-error';
import { InvalidBudgetMoveError } from '@/domain/errors/invalid-budget-move-error';
import { Money } from '@/domain/value-objects/money';
import type { BudgetAllocation } from '@/domain/entities/budget-allocation';
import type { BudgetAllocationRepository } from '@/domain/repositories/budget-allocation-repository';
import { InMemoryAccountRepository } from '@/infrastructure/persistence/in-memory/in-memory-account-repository';
import { InMemoryCategoryGroupRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-group-repository';
import { InMemoryCategoryRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-repository';
import { InMemoryCategoryTargetRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-target-repository';
import { InMemoryTransactionRepository } from '@/infrastructure/persistence/in-memory/in-memory-transaction-repository';

import { GetBudgetMonth } from './get-budget-month';
import { MoveBudget } from './move-budget';

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

class TransactionalAllocationStore
  implements BudgetAllocationRepository, UnitOfWork
{
  private allocations = new Map<string, BudgetAllocation>();
  private writeCount = 0;
  private failingWrite = Number.POSITIVE_INFINITY;

  failOnWrite(number: number) {
    this.writeCount = 0;
    this.failingWrite = number;
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    const snapshot = new Map(this.allocations);
    try {
      return await task();
    } catch (cause) {
      this.allocations = snapshot;
      throw cause;
    }
  }

  async findByCategoryAndMonth(categoryId: string, month: string) {
    return (
      [...this.allocations.values()].find(
        (item) => item.categoryId === categoryId && item.month === month,
      ) ?? null
    );
  }

  async findThroughMonth(month: string) {
    return [...this.allocations.values()].filter((item) => item.month <= month);
  }

  async save(allocation: BudgetAllocation) {
    this.writeCount += 1;
    if (this.writeCount === this.failingWrite) throw new Error('write failed');
    this.allocations.set(allocation.id, allocation);
  }
}

async function setup() {
  const accounts = new InMemoryAccountRepository();
  const groups = new InMemoryCategoryGroupRepository();
  const categories = new InMemoryCategoryRepository();
  const transactions = new InMemoryTransactionRepository();
  const allocations = new TransactionalAllocationStore();
  const unitOfWork = allocations;
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
  const move = new MoveBudget(
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
  return { allocations, getBudget, move, byName };
}

const rta = { kind: 'ready-to-assign' } as const;
const category = (categoryId: string) =>
  ({ kind: 'category', categoryId }) as const;

describe('MoveBudget', () => {
  it('moves category to category without changing RTA', async () => {
    const { getBudget, move, byName } = await setup();
    const source = byName.get('⚡ Utilities');
    const target = byName.get('🚗 Transportation');
    if (!source || !target) throw new Error('Sample categories missing.');
    const before = await getBudget.execute('2026-08');
    await move.execute({
      source: category(source.id),
      target: category(target.id),
      month: '2026-08',
      amountCents: 2_000,
    });
    const after = await getBudget.execute('2026-08');
    expect(after.readyToAssign).toEqual(before.readyToAssign);
  });

  it('moves from a category to RTA and back', async () => {
    const { getBudget, move, byName } = await setup();
    const source = byName.get('⚡ Utilities');
    if (!source) throw new Error('Sample category missing.');
    await move.execute({
      source: category(source.id),
      target: rta,
      month: '2026-08',
      amountCents: 1_000,
    });
    expect((await getBudget.execute('2026-08')).readyToAssign).toEqual(
      Money.fromCents(1_000),
    );
    await move.execute({
      source: rta,
      target: category(source.id),
      month: '2026-08',
      amountCents: 1_000,
    });
    expect((await getBudget.execute('2026-08')).readyToAssign).toEqual(
      Money.zero(),
    );
  });

  it('reports precise insufficient balances', async () => {
    const { move, byName } = await setup();
    const source = byName.get('⚡ Utilities');
    const target = byName.get('🚗 Transportation');
    if (!source || !target) throw new Error('Sample categories missing.');
    const categoryError = await move
      .execute({
        source: category(source.id),
        target: category(target.id),
        month: '2026-08',
        amountCents: 50_001,
      })
      .catch((cause: unknown) => cause);
    expect(categoryError).toBeInstanceOf(InsufficientCategoryAvailableError);
    expect(
      (categoryError as InsufficientCategoryAvailableError).requested,
    ).toEqual(Money.fromCents(50_001));
    expect(
      (categoryError as InsufficientCategoryAvailableError).available,
    ).toEqual(Money.fromCents(49_000));
    expect(
      (categoryError as InsufficientCategoryAvailableError).missing,
    ).toEqual(Money.fromCents(1_001));
    const rtaError = await move
      .execute({
        source: rta,
        target: category(target.id),
        month: '2026-08',
        amountCents: 1,
      })
      .catch((cause: unknown) => cause);
    expect(rtaError).toBeInstanceOf(InsufficientReadyToAssignError);
    expect((rtaError as InsufficientReadyToAssignError).missing).toEqual(
      Money.fromCents(1),
    );
  });

  it('rejects invalid and missing locations', async () => {
    const { move, byName } = await setup();
    const source = byName.get('⚡ Utilities');
    if (!source) throw new Error('Sample category missing.');
    await expect(
      move.execute({
        source: category(source.id),
        target: category(source.id),
        month: '2026-08',
        amountCents: 100,
      }),
    ).rejects.toThrow(InvalidBudgetMoveError);
    await expect(
      move.execute({
        source: category(source.id),
        target: category('missing'),
        month: '2026-08',
        amountCents: 100,
      }),
    ).rejects.toThrow(CategoryNotFoundError);
  });

  it('rolls back both allocations when the second write fails', async () => {
    const { allocations, getBudget, move, byName } = await setup();
    const source = byName.get('⚡ Utilities');
    const target = byName.get('🚗 Transportation');
    if (!source || !target) throw new Error('Sample categories missing.');
    const before = await getBudget.execute('2026-08');
    allocations.failOnWrite(2);

    await expect(
      move.execute({
        source: category(source.id),
        target: category(target.id),
        month: '2026-08',
        amountCents: 1_000,
      }),
    ).rejects.toThrow('write failed');
    await expect(getBudget.execute('2026-08')).resolves.toEqual(before);
  });
});
