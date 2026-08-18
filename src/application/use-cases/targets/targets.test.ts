import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { createCategory } from '@/domain/entities/category';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
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
      weeklyFundingMode: 'set_aside',
    });
    const updated = await set.execute({
      categoryId: 'category-1',
      kind: 'yearly',
      amountCents: 50_000,
      targetDate: '2026-12-31',
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

  it('deletes a target without affecting its category', async () => {
    const { categories, targets, unitOfWork, set, remove } = setup();
    await seedCategory(categories);
    await set.execute({
      categoryId: 'category-1',
      kind: 'monthly',
      amountCents: 30_000,
      dayOfMonth: 0,
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
      }),
    ).rejects.toThrow(CategoryNotFoundError);
    await expect(remove.execute('missing')).rejects.toThrow(
      CategoryNotFoundError,
    );
  });
});
