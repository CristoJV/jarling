import type { Clock } from '@/application/ports/clock';
import {
  createCategoryGroup,
  renameCategoryGroup,
} from '@/domain/entities/category-group';
import { createCategory } from '@/domain/entities/category';
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
      'Uncategorized',
      'Bills',
      'Needs',
      'Subscriptions',
      'Wants',
    ]);
    expect((await categories.findAll()).map(({ name }) => name)).toContain(
      '❓ Uncategorized',
    );
    expect(
      (await categories.findByGroup('system-group-uncategorized')).map(
        ({ name }) => name,
      ),
    ).toEqual(['❓ Uncategorized']);
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
      'Uncategorized',
      'Facturas',
      'Needs',
      'Subscriptions',
      'Wants',
    ]);
    expect(await categories.findAll()).toHaveLength(6);
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
      7, 8, 9, 10, 11, 12,
    ]);
  });

  it('repairs the protected category after restoring a legacy snapshot', async () => {
    const groups = new InMemoryCategoryGroupRepository();
    const categories = new InMemoryCategoryRepository();
    await groups.save(
      createCategoryGroup({
        id: 'default-group-needs',
        name: 'Needs',
        sortOrder: 0,
        createdAt: clock.now().instant,
        updatedAt: clock.now().instant,
      }),
    );
    await categories.save(
      createCategory({
        id: 'default-category-uncategorized',
        groupId: 'default-group-needs',
        name: 'Changed',
        hidden: true,
        sortOrder: 5,
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

    await expect(
      categories.findById('default-category-uncategorized'),
    ).resolves.toEqual(
      expect.objectContaining({
        groupId: 'system-group-uncategorized',
        name: '❓ Uncategorized',
        hidden: false,
        sortOrder: 0,
      }),
    );
  });
});
