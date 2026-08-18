import type { Clock } from '@/application/ports/clock';
import {
  createCategoryGroup,
  renameCategoryGroup,
} from '@/domain/entities/category-group';
import { ImmediateUnitOfWork } from '@/infrastructure/persistence/in-memory/immediate-unit-of-work';
import { InMemoryCategoryGroupRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-group-repository';
import { InMemoryCategoryRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-repository';

import { EnsureDefaultCategories } from './ensure-default-categories';

const clock: Clock = {
  now: () => ({
    instant: '2026-08-18T12:00:00.000Z',
    date: '2026-08-18',
  }),
};

describe('EnsureDefaultCategories', () => {
  it('creates the baseline groups and categories in order', async () => {
    const groups = new InMemoryCategoryGroupRepository();
    const categories = new InMemoryCategoryRepository();
    const useCase = new EnsureDefaultCategories(
      groups,
      categories,
      new ImmediateUnitOfWork(),
      clock,
    );

    await useCase.execute();

    expect((await groups.findAll()).map(({ name }) => name)).toEqual([
      'Bills',
      'Needs',
      'Subscriptions',
      'Wants',
    ]);
    expect((await categories.findAll()).map(({ name }) => name)).toEqual([
      '🏠 Rent/Mortgage',
      '🛒 Groceries',
      '📱 Phone & Internet',
      '🚗 Transportation',
      '⚡ Utilities',
    ]);
  });

  it('is idempotent and does not overwrite a user rename', async () => {
    const groups = new InMemoryCategoryGroupRepository();
    const categories = new InMemoryCategoryRepository();
    const unitOfWork = new ImmediateUnitOfWork();
    const useCase = new EnsureDefaultCategories(
      groups,
      categories,
      unitOfWork,
      clock,
    );

    await useCase.execute();
    const bills = await groups.findById('default-group-bills');
    if (!bills) throw new Error('Expected default group.');
    await groups.save(
      renameCategoryGroup(bills, 'Facturas', clock.now().instant),
    );
    await useCase.execute();

    expect((await groups.findAll()).map(({ name }) => name)).toEqual([
      'Facturas',
      'Needs',
      'Subscriptions',
      'Wants',
    ]);
    expect(await categories.findAll()).toHaveLength(5);
  });

  it('appends defaults after existing user groups', async () => {
    const groups = new InMemoryCategoryGroupRepository();
    const categories = new InMemoryCategoryRepository();
    await groups.save(
      createCategoryGroup({
        id: 'custom',
        name: 'Custom',
        sortOrder: 7,
        createdAt: clock.now().instant,
        updatedAt: clock.now().instant,
      }),
    );

    await new EnsureDefaultCategories(
      groups,
      categories,
      new ImmediateUnitOfWork(),
      clock,
    ).execute();

    expect((await groups.findAll()).map(({ sortOrder }) => sortOrder)).toEqual([
      7, 8, 9, 10, 11,
    ]);
  });
});
