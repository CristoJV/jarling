import type { Clock } from '@/application/ports/clock';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { CategoryReassignmentRequiredError } from '@/domain/errors/category-reassignment-required-error';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { InvalidCategoryReassignmentError } from '@/domain/errors/invalid-category-reassignment-error';
import { ProtectedCategoryError } from '@/domain/errors/protected-category-error';
import type { BudgetAllocationRepository } from '@/domain/repositories/budget-allocation-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { CategoryTargetRepository } from '@/domain/repositories/category-target-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';

export type DeleteCategoryInput = Readonly<{
  categoryId: string;
  replacementCategoryId?: string;
}>;

export class DeleteCategory {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
    private readonly allocations: BudgetAllocationRepository,
    private readonly targets: CategoryTargetRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(input: DeleteCategoryInput): Promise<void> {
    const category = await this.categories.findById(input.categoryId);
    if (!category) throw new CategoryNotFoundError(input.categoryId);
    if (category.linkedAccountId) {
      throw new ProtectedCategoryError();
    }

    const transactions = await this.transactions.findAll({
      categoryId: category.id,
    });
    const needsReplacement = transactions.length > 0;
    if (needsReplacement && !input.replacementCategoryId) {
      throw new CategoryReassignmentRequiredError(transactions.length);
    }

    let replacementCategoryId: string | undefined;
    if (needsReplacement) {
      const replacement = await this.categories.findById(
        input.replacementCategoryId!,
      );
      if (
        !replacement ||
        replacement.id === category.id ||
        replacement.linkedAccountId
      ) {
        throw new InvalidCategoryReassignmentError();
      }
      replacementCategoryId = replacement.id;
    }

    const { instant } = this.clock.now();
    await this.unitOfWork.run(async () => {
      if (replacementCategoryId) {
        await this.transactions.reassignCategory(
          category.id,
          replacementCategoryId,
          instant,
        );
        await this.allocations.reassignCategory(
          category.id,
          replacementCategoryId,
          instant,
        );
      } else {
        await this.allocations.deleteByCategory(category.id);
      }
      await this.targets.deleteByCategory(category.id);
      await this.categories.deleteById(category.id);
    });
  }
}
