import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { CategoryGroupNotFoundError } from '@/domain/errors/category-group-not-found-error';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { InvalidCategoryNameError } from '@/domain/errors/invalid-category-name-error';
import { InMemoryCategoryGroupRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-group-repository';
import { InMemoryCategoryRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-repository';

import { CreateCategoryGroup } from './create-category-group';
import { CreateCategory } from './create-category';
import { GetCategoryGroups } from './get-category-groups';
import { RenameCategoryGroup } from './rename-category-group';
import { RenameCategory } from './rename-category';
import { ReorderCategories } from './reorder-categories';
import { ReorderCategoryGroups } from './reorder-category-groups';
import { SetCategoryHidden } from './set-category-hidden';
import { UpdateCategoryNotes } from './update-category-notes';

class FixedClock implements Clock {
  now() {
    return {
      instant: '2026-08-18T10:30:00.000Z',
      date: '2026-08-18',
    };
  }
}

class SequenceIdGenerator implements IdGenerator {
  private nextIndex = 0;

  constructor(private readonly ids: readonly string[]) {}

  next(): string {
    const id = this.ids[this.nextIndex];
    this.nextIndex += 1;

    if (!id) {
      throw new Error('No test ID configured.');
    }

    return id;
  }
}

class TrackingUnitOfWork implements UnitOfWork {
  executions = 0;

  async run<T>(task: () => Promise<T>): Promise<T> {
    this.executions += 1;
    return task();
  }
}

function setup() {
  const groups = new InMemoryCategoryGroupRepository();
  const categories = new InMemoryCategoryRepository();
  const unitOfWork = new TrackingUnitOfWork();
  const clock = new FixedClock();
  const ids = new SequenceIdGenerator([
    'group-1',
    'group-2',
    'category-1',
    'category-2',
  ]);

  return {
    groups,
    categories,
    unitOfWork,
    clock,
    createGroup: new CreateCategoryGroup(groups, unitOfWork, ids, clock),
    createCategory: new CreateCategory(
      groups,
      categories,
      unitOfWork,
      ids,
      clock,
    ),
  };
}

describe('category use cases', () => {
  it('creates ordered category groups and trims their names', async () => {
    const { groups, unitOfWork, createGroup } = setup();

    const first = await createGroup.execute('  Needs  ');
    const second = await createGroup.execute('Wants');

    expect(await groups.findAll()).toEqual([
      expect.objectContaining({ id: first.id, name: 'Needs', sortOrder: 0 }),
      expect.objectContaining({ id: second.id, name: 'Wants', sortOrder: 1 }),
    ]);
    expect(unitOfWork.executions).toBe(2);
  });

  it('rejects an empty group without persisting it', async () => {
    const { groups, unitOfWork, createGroup } = setup();

    await expect(createGroup.execute('   ')).rejects.toThrow(
      InvalidCategoryNameError,
    );
    expect(await groups.findAll()).toEqual([]);
    expect(unitOfWork.executions).toBe(0);
  });

  it('creates ordered categories inside an existing group', async () => {
    const { categories, createGroup, createCategory } = setup();
    const group = await createGroup.execute('Needs');

    const first = await createCategory.execute({
      groupId: group.id,
      name: '  Rent ',
    });
    const second = await createCategory.execute({
      groupId: group.id,
      name: 'Groceries',
    });

    expect(await categories.findByGroup(group.id)).toEqual([
      expect.objectContaining({
        id: first.id,
        name: 'Rent',
        hidden: false,
        sortOrder: 0,
      }),
      expect.objectContaining({
        id: second.id,
        name: 'Groceries',
        hidden: false,
        sortOrder: 1,
      }),
    ]);
  });

  it('does not create a category for an unknown group', async () => {
    const { categories, createCategory, unitOfWork } = setup();

    await expect(
      createCategory.execute({ groupId: 'missing', name: 'Rent' }),
    ).rejects.toThrow(CategoryGroupNotFoundError);
    expect(await categories.findAll()).toEqual([]);
    expect(unitOfWork.executions).toBe(0);
  });

  it('returns groups and their categories in display order', async () => {
    const { groups, categories, createGroup, createCategory } = setup();
    const needs = await createGroup.execute('Needs');
    const wants = await createGroup.execute('Wants');
    await createCategory.execute({ groupId: needs.id, name: 'Rent' });
    await createCategory.execute({ groupId: wants.id, name: 'Travel' });

    const result = await new GetCategoryGroups(groups, categories).execute();

    expect(
      result.map(({ group, categories: items }) => [
        group.name,
        items[0]?.name,
      ]),
    ).toEqual([
      ['Needs', 'Rent'],
      ['Wants', 'Travel'],
    ]);
  });

  it('renames a group and a category while preserving their identities', async () => {
    const {
      groups,
      categories,
      unitOfWork,
      clock,
      createGroup,
      createCategory,
    } = setup();
    const group = await createGroup.execute('Needs');
    const category = await createCategory.execute({
      groupId: group.id,
      name: 'Rent',
    });

    const renamedGroup = await new RenameCategoryGroup(
      groups,
      unitOfWork,
      clock,
    ).execute(group.id, 'Essentials');
    const renamedCategory = await new RenameCategory(
      categories,
      unitOfWork,
      clock,
    ).execute(category.id, 'Housing');

    expect(renamedGroup).toEqual({ ...group, name: 'Essentials' });
    expect(renamedCategory).toEqual({ ...category, name: 'Housing' });
  });

  it('hides and restores a category without deleting it', async () => {
    const { categories, unitOfWork, clock, createGroup, createCategory } =
      setup();
    const group = await createGroup.execute('Needs');
    const category = await createCategory.execute({
      groupId: group.id,
      name: 'Rent',
    });
    const setHidden = new SetCategoryHidden(categories, unitOfWork, clock);

    await expect(setHidden.execute(category.id, true)).resolves.toEqual({
      ...category,
      hidden: true,
    });
    await expect(setHidden.execute(category.id, false)).resolves.toEqual(
      category,
    );
    expect(await categories.findById(category.id)).toEqual(category);
  });

  it('persists category notes without changing its identity', async () => {
    const { categories, unitOfWork, clock, createGroup, createCategory } =
      setup();
    const group = await createGroup.execute('Needs');
    const category = await createCategory.execute({
      groupId: group.id,
      name: 'Rent',
    });

    const updated = await new UpdateCategoryNotes(
      categories,
      unitOfWork,
      clock,
    ).execute(category.id, '  Review annually  ');

    expect(updated).toEqual({ ...category, notes: 'Review annually' });
    expect(await categories.findById(category.id)).toEqual(updated);
  });

  it('reorders groups and categories by swapping adjacent positions', async () => {
    const {
      groups,
      categories,
      unitOfWork,
      clock,
      createGroup,
      createCategory,
    } = setup();
    const firstGroup = await createGroup.execute('Needs');
    const secondGroup = await createGroup.execute('Wants');
    const firstCategory = await createCategory.execute({
      groupId: firstGroup.id,
      name: 'Rent',
    });
    const secondCategory = await createCategory.execute({
      groupId: firstGroup.id,
      name: 'Groceries',
    });

    await new ReorderCategoryGroups(groups, unitOfWork, clock).execute(
      secondGroup.id,
      'up',
    );
    await new ReorderCategories(categories, unitOfWork, clock).execute(
      secondCategory.id,
      'up',
    );

    expect((await groups.findAll()).map((group) => group.id)).toEqual([
      secondGroup.id,
      firstGroup.id,
    ]);
    expect(
      (await categories.findByGroup(firstGroup.id)).map(
        (category) => category.id,
      ),
    ).toEqual([secondCategory.id, firstCategory.id]);
  });

  it('treats moving past an edge as a no-op', async () => {
    const {
      groups,
      categories,
      unitOfWork,
      clock,
      createGroup,
      createCategory,
    } = setup();
    const group = await createGroup.execute('Needs');
    const category = await createCategory.execute({
      groupId: group.id,
      name: 'Rent',
    });
    const before = unitOfWork.executions;

    await new ReorderCategoryGroups(groups, unitOfWork, clock).execute(
      group.id,
      'up',
    );
    await new ReorderCategories(categories, unitOfWork, clock).execute(
      category.id,
      'down',
    );

    expect(unitOfWork.executions).toBe(before);
  });

  it('fails explicitly when editing unknown categories or groups', async () => {
    const { groups, categories, unitOfWork, clock } = setup();

    await expect(
      new RenameCategoryGroup(groups, unitOfWork, clock).execute(
        'missing',
        'Name',
      ),
    ).rejects.toThrow(CategoryGroupNotFoundError);
    await expect(
      new RenameCategory(categories, unitOfWork, clock).execute(
        'missing',
        'Name',
      ),
    ).rejects.toThrow(CategoryNotFoundError);
    await expect(
      new SetCategoryHidden(categories, unitOfWork, clock).execute(
        'missing',
        true,
      ),
    ).rejects.toThrow(CategoryNotFoundError);
  });
});
