import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { createCategory, type Category } from '@/domain/entities/category';
import { CategoryGroupNotFoundError } from '@/domain/errors/category-group-not-found-error';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { ProtectedCategoryError } from '@/domain/errors/protected-category-error';
import type { BudgetAllocationRepository } from '@/domain/repositories/budget-allocation-repository';
import type { CategoryGroupRepository } from '@/domain/repositories/category-group-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { CategoryTargetRepository } from '@/domain/repositories/category-target-repository';
import type { CategoryTargetSnoozeRepository } from '@/domain/repositories/category-target-snooze-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';

export type CreateCategoryReplacementInput = Readonly<{
  sourceCategoryId: string;
  groupId: string;
  name: string;
}>;

/** Creates a destination and performs the reassignment as one database unit. */
export class CreateCategoryReplacement {
  constructor(
    private readonly groups: CategoryGroupRepository,
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
    private readonly allocations: BudgetAllocationRepository,
    private readonly targets: CategoryTargetRepository,
    private readonly snoozes: CategoryTargetSnoozeRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateCategoryReplacementInput): Promise<Category> {
    const source = await this.categories.findById(input.sourceCategoryId);
    if (!source) throw new CategoryNotFoundError(input.sourceCategoryId);
    if (source.linkedAccountId) {
      throw new ProtectedCategoryError();
    }
    if (!(await this.groups.findById(input.groupId))) {
      throw new CategoryGroupNotFoundError(input.groupId);
    }

    const siblings = await this.categories.findByGroup(input.groupId);
    const { instant } = this.clock.now();
    const destination = createCategory({
      id: this.ids.next(),
      groupId: input.groupId,
      name: input.name,
      hidden: false,
      sortOrder:
        siblings.reduce(
          (maximum, category) => Math.max(maximum, category.sortOrder),
          -1,
        ) + 1,
      createdAt: instant,
      updatedAt: instant,
    });

    return this.unitOfWork.run(async () => {
      await this.categories.save(destination);
      await this.transactions.reassignCategory(
        source.id,
        destination.id,
        instant,
      );
      await this.allocations.reassignCategory(
        source.id,
        destination.id,
        instant,
      );
      await this.snoozes.deleteByCategory(source.id);
      await this.targets.deleteByCategory(source.id);
      await this.categories.deleteById(source.id);
      return destination;
    });
  }
}
