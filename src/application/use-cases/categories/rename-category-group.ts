import type { Clock } from '@/application/ports/clock';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  renameCategoryGroup,
  type CategoryGroup,
} from '@/domain/entities/category-group';
import { CategoryGroupNotFoundError } from '@/domain/errors/category-group-not-found-error';
import { ProtectedCategoryError } from '@/domain/errors/protected-category-error';
import { isProtectedCategoryGroup } from '@/domain/policies/system-categories';
import type { CategoryGroupRepository } from '@/domain/repositories/category-group-repository';

export class RenameCategoryGroup {
  constructor(
    private readonly groups: CategoryGroupRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(groupId: string, name: string): Promise<CategoryGroup> {
    if (isProtectedCategoryGroup(groupId)) throw new ProtectedCategoryError();
    const group = await this.groups.findById(groupId);

    if (!group) {
      throw new CategoryGroupNotFoundError(groupId);
    }

    const renamed = renameCategoryGroup(group, name, this.clock.now().instant);
    return this.unitOfWork.run(async () => {
      await this.groups.save(renamed);
      return renamed;
    });
  }
}
