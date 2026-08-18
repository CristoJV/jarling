import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  assertValidBudgetMonth,
  createBudgetAllocation,
  type BudgetAllocation,
} from '@/domain/entities/budget-allocation';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { InsufficientCategoryAvailableError } from '@/domain/errors/insufficient-category-available-error';
import { InvalidBudgetMoveError } from '@/domain/errors/invalid-budget-move-error';
import type { BudgetAllocationRepository } from '@/domain/repositories/budget-allocation-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import { Money } from '@/domain/value-objects/money';

import type { GetBudgetMonth } from './get-budget-month';

export type MoveBudgetInput = Readonly<{
  sourceCategoryId: string;
  targetCategoryId: string;
  month: string;
  amountCents: number;
}>;

export type MoveBudgetResult = Readonly<{
  source: BudgetAllocation;
  target: BudgetAllocation;
}>;

export class MoveBudgetBetweenCategories {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly allocations: BudgetAllocationRepository,
    private readonly getBudgetMonth: Pick<GetBudgetMonth, 'execute'>,
    private readonly unitOfWork: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: MoveBudgetInput): Promise<MoveBudgetResult> {
    assertValidBudgetMonth(input.month);

    if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
      throw new InvalidBudgetMoveError(
        'The movement amount must be positive integer cents.',
      );
    }

    if (input.sourceCategoryId === input.targetCategoryId) {
      throw new InvalidBudgetMoveError(
        'Source and target categories must be different.',
      );
    }

    return this.unitOfWork.run(async () => {
      const [sourceCategory, targetCategory] = await Promise.all([
        this.categories.findById(input.sourceCategoryId),
        this.categories.findById(input.targetCategoryId),
      ]);

      if (!sourceCategory)
        throw new CategoryNotFoundError(input.sourceCategoryId);
      if (!targetCategory)
        throw new CategoryNotFoundError(input.targetCategoryId);

      const budget = await this.getBudgetMonth.execute(input.month);
      const sourceValues = budget.groups
        .flatMap(({ categories }) => categories)
        .find(({ category }) => category.id === input.sourceCategoryId);

      if (!sourceValues || sourceValues.available.cents < input.amountCents) {
        throw new InsufficientCategoryAvailableError();
      }

      const [currentSource, currentTarget] = await Promise.all([
        this.allocations.findByCategoryAndMonth(
          input.sourceCategoryId,
          input.month,
        ),
        this.allocations.findByCategoryAndMonth(
          input.targetCategoryId,
          input.month,
        ),
      ]);
      const { instant } = this.clock.now();
      const source = createBudgetAllocation({
        id: currentSource?.id ?? this.ids.next(),
        categoryId: input.sourceCategoryId,
        month: input.month,
        amount: Money.fromCents(
          (currentSource?.amount.cents ?? 0) - input.amountCents,
        ),
        createdAt: currentSource?.createdAt ?? instant,
        updatedAt: instant,
      });
      const target = createBudgetAllocation({
        id: currentTarget?.id ?? this.ids.next(),
        categoryId: input.targetCategoryId,
        month: input.month,
        amount: Money.fromCents(
          (currentTarget?.amount.cents ?? 0) + input.amountCents,
        ),
        createdAt: currentTarget?.createdAt ?? instant,
        updatedAt: instant,
      });

      await this.allocations.save(source);
      await this.allocations.save(target);
      return { source, target };
    });
  }
}
