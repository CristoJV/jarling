import type { Clock } from '@/application/ports/clock';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { CategoryGroupNotFoundError } from '@/domain/errors/category-group-not-found-error';
import type { CategoryGroupRepository } from '@/domain/repositories/category-group-repository';

export type ReorderDirection = 'up' | 'down';

export class ReorderCategoryGroups {
  constructor(
    private readonly groups: CategoryGroupRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(groupId: string, direction: ReorderDirection): Promise<void> {
    const groups = [...(await this.groups.findAll())].sort(
      (left, right) => left.sortOrder - right.sortOrder,
    );
    const currentIndex = groups.findIndex((group) => group.id === groupId);

    if (currentIndex === -1) {
      throw new CategoryGroupNotFoundError(groupId);
    }

    const targetIndex =
      direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const current = groups[currentIndex];
    const target = groups[targetIndex];

    if (!current || !target) {
      return;
    }

    const { instant } = this.clock.now();
    await this.unitOfWork.run(async () => {
      await this.groups.save({
        ...current,
        sortOrder: target.sortOrder,
        updatedAt: instant,
      });
      await this.groups.save({
        ...target,
        sortOrder: current.sortOrder,
        updatedAt: instant,
      });
    });
  }
}
