import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import { ProtectedCategoryError } from '@/domain/errors/protected-category-error';
import {
  UNCATEGORIZED_CATEGORY_ID,
  UNCATEGORIZED_GROUP_ID,
} from '@/domain/policies/system-categories';
import { ImmediateUnitOfWork } from '@/infrastructure/persistence/in-memory/immediate-unit-of-work';
import { InMemoryCategoryGroupRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-group-repository';
import { InMemoryCategoryRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-repository';

import { CreateCategory } from './create-category';
import { EnsureDefaultCategories } from './ensure-default-categories';
import { RenameCategoryGroup } from './rename-category-group';
import { RenameCategory } from './rename-category';
import { ReorderCategories } from './reorder-categories';
import { ReorderCategoryGroups } from './reorder-category-groups';
import { SetCategoryHidden } from './set-category-hidden';

const clock: Clock = {
  now: () => ({
    instant: '2026-08-20T10:00:00.000Z',
    date: '2026-08-20',
  }),
};
const ids: IdGenerator = { next: () => 'unexpected-id' };

describe('protected Uncategorized structure', () => {
  it('rejects every structural category operation', async () => {
    const groups = new InMemoryCategoryGroupRepository();
    const categories = new InMemoryCategoryRepository();
    const unitOfWork = new ImmediateUnitOfWork();
    await new EnsureDefaultCategories(
      groups,
      categories,
      unitOfWork,
      clock,
    ).execute();

    await expect(
      new CreateCategory(groups, categories, unitOfWork, ids, clock).execute({
        groupId: UNCATEGORIZED_GROUP_ID,
        name: 'Another',
      }),
    ).rejects.toThrow(ProtectedCategoryError);
    await expect(
      new RenameCategory(categories, unitOfWork, clock).execute(
        UNCATEGORIZED_CATEGORY_ID,
        'Changed',
      ),
    ).rejects.toThrow(ProtectedCategoryError);
    await expect(
      new SetCategoryHidden(categories, unitOfWork, clock).execute(
        UNCATEGORIZED_CATEGORY_ID,
        true,
      ),
    ).rejects.toThrow(ProtectedCategoryError);
    await expect(
      new ReorderCategories(categories, unitOfWork, clock).execute(
        UNCATEGORIZED_CATEGORY_ID,
        'down',
      ),
    ).rejects.toThrow(ProtectedCategoryError);
    await expect(
      new RenameCategoryGroup(groups, unitOfWork, clock).execute(
        UNCATEGORIZED_GROUP_ID,
        'Changed',
      ),
    ).rejects.toThrow(ProtectedCategoryError);
    await expect(
      new ReorderCategoryGroups(groups, unitOfWork, clock).execute(
        UNCATEGORIZED_GROUP_ID,
        'down',
      ),
    ).rejects.toThrow(ProtectedCategoryError);
  });
});
