import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { createCategory } from '@/domain/entities/category';
import { createCategoryTarget } from '@/domain/entities/category-target';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { Money } from '@/domain/value-objects/money';
import { InMemoryCategoryRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-repository';
import { InMemoryCategoryTargetRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-target-repository';

import { DeleteCategoryTarget } from './delete-category-target';
import { GetCategoryTargets } from './get-category-targets';
import { SetCategoryTarget } from './set-category-target';

const instant = '2026-08-18T10:00:00.000Z';

class TrackingUnitOfWork implements UnitOfWork {
  executions = 0;
  async run<T>(task: () => Promise<T>): Promise<T> {
    this.executions += 1;
    return task();
  }
}

function setup() {
  const categories = new InMemoryCategoryRepository();
  const targets = new InMemoryCategoryTargetRepository();
  const unitOfWork = new TrackingUnitOfWork();
  const ids: IdGenerator = { next: () => 'target-1' };
  const clock: Clock = {
    now: () => ({ instant, date: '2026-08-18' }),
  };
  const set = new SetCategoryTarget(
    categories,
    targets,
    unitOfWork,
    ids,
    clock,
  );
  const remove = new DeleteCategoryTarget(categories, targets, unitOfWork);

  return { categories, targets, unitOfWork, set, remove };
}

async function seedCategory(categories: InMemoryCategoryRepository) {
  await categories.save(
    createCategory({
      id: 'category-1',
      groupId: 'group-1',
      name: 'Groceries',
      hidden: false,
      sortOrder: 0,
      createdAt: instant,
      updatedAt: instant,
    }),
  );
}

describe('target use cases', () => {
  it('creates, lists and updates the single target for a category', async () => {
    const { categories, targets, unitOfWork, set } = setup();
    await seedCategory(categories);

    const created = await set.execute({
      categoryId: 'category-1',
      kind: 'weekly',
      amountCents: 10_000,
      dayOfWeek: 6,
      fundingMode: 'set_aside',
    });
    const updated = await set.execute({
      categoryId: 'category-1',
      kind: 'yearly',
      amountCents: 50_000,
      targetDate: '2026-12-31',
      fundingMode: 'set_aside',
    });

    expect(updated).toEqual(
      expect.objectContaining({
        id: created.id,
        kind: 'yearly',
        targetDate: '2026-12-31',
      }),
    );
    await expect(new GetCategoryTargets(targets).execute()).resolves.toEqual([
      updated,
    ]);
    expect(unitOfWork.executions).toBe(2);
  });

  it('records the weekly start and defaults earlier occurrences to excluded', async () => {
    const { categories, set } = setup();
    await seedCategory(categories);

    await expect(
      set.execute({
        categoryId: 'category-1',
        kind: 'weekly',
        amountCents: 10_000,
        dayOfWeek: 5,
        fundingMode: 'refill_up_to',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        startsOn: '2026-08-18',
        includePreviousWeeks: false,
      }),
    );
  });

  it('preserves the schedule start unless the weekly schedule changes', async () => {
    const { categories, targets, set } = setup();
    await seedCategory(categories);
    await targets.save(
      createCategoryTarget({
        id: 'target-1',
        categoryId: 'category-1',
        kind: 'weekly',
        amount: Money.fromCents(10_000),
        startsOn: '2026-07-01',
        dayOfWeek: 5,
        includePreviousWeeks: false,
        fundingMode: 'set_aside',
        createdAt: '2026-07-01T10:00:00.000Z',
        updatedAt: '2026-07-01T10:00:00.000Z',
      }),
    );

    const sameSchedule = await set.execute({
      categoryId: 'category-1',
      kind: 'weekly',
      amountCents: 20_000,
      dayOfWeek: 5,
      includePreviousWeeks: true,
      fundingMode: 'refill_up_to',
    });
    const changedWeekday = await set.execute({
      categoryId: 'category-1',
      kind: 'weekly',
      amountCents: 20_000,
      dayOfWeek: 6,
      includePreviousWeeks: false,
      fundingMode: 'refill_up_to',
    });

    expect(sameSchedule.startsOn).toBe('2026-07-01');
    expect(changedWeekday.startsOn).toBe('2026-08-18');
  });

  it('deletes a target without affecting its category', async () => {
    const { categories, targets, unitOfWork, set, remove } = setup();
    await seedCategory(categories);
    await set.execute({
      categoryId: 'category-1',
      kind: 'monthly',
      amountCents: 30_000,
      dayOfMonth: 0,
      fundingMode: 'refill_up_to',
    });

    await remove.execute('category-1');

    await expect(targets.findAll()).resolves.toEqual([]);
    await expect(categories.findById('category-1')).resolves.not.toBeNull();
    expect(unitOfWork.executions).toBe(2);
  });

  it('rejects operations for an unknown category', async () => {
    const { set, remove } = setup();

    await expect(
      set.execute({
        categoryId: 'missing',
        kind: 'monthly',
        amountCents: 10_000,
        dayOfMonth: 0,
        fundingMode: 'refill_up_to',
      }),
    ).rejects.toThrow(CategoryNotFoundError);
    await expect(remove.execute('missing')).rejects.toThrow(
      CategoryNotFoundError,
    );
  });
});
