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
import { InsufficientReadyToAssignError } from '@/domain/errors/insufficient-ready-to-assign-error';
import { InvalidBudgetMoveError } from '@/domain/errors/invalid-budget-move-error';
import type { BudgetAllocationRepository } from '@/domain/repositories/budget-allocation-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import { Money } from '@/domain/value-objects/money';

import type { GetBudgetMonth } from './get-budget-month';

export type BudgetLocation =
  | Readonly<{ kind: 'ready-to-assign' }>
  | Readonly<{ kind: 'category'; categoryId: string }>;

export type MoveBudgetInput = Readonly<{
  source: BudgetLocation;
  target: BudgetLocation;
  month: string;
  amountCents: number;
}>;

export type MoveBudgetResult = Readonly<{
  source?: BudgetAllocation;
  target?: BudgetAllocation;
}>;

function sameLocation(left: BudgetLocation, right: BudgetLocation): boolean {
  return (
    left.kind === right.kind &&
    (left.kind === 'ready-to-assign' ||
      left.categoryId ===
        (right.kind === 'category' ? right.categoryId : undefined))
  );
}

export class MoveBudget {
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
    if (sameLocation(input.source, input.target)) {
      throw new InvalidBudgetMoveError(
        'Source and target locations must be different.',
      );
    }

    const amount = Money.fromCents(input.amountCents);
    return this.unitOfWork.run(async () => {
      const categoryIds = [input.source, input.target]
        .filter(
          (
            location,
          ): location is Extract<BudgetLocation, { kind: 'category' }> =>
            location.kind === 'category',
        )
        .map(({ categoryId }) => categoryId);
      const found = await Promise.all(
        categoryIds.map((categoryId) => this.categories.findById(categoryId)),
      );
      const missingIndex = found.findIndex((category) => !category);
      if (missingIndex >= 0) {
        throw new CategoryNotFoundError(categoryIds[missingIndex] ?? '');
      }

      const budget = await this.getBudgetMonth.execute(input.month);
      if (input.source.kind === 'ready-to-assign') {
        if (budget.funding.assignableNow.cents < amount.cents) {
          throw new InsufficientReadyToAssignError(
            amount,
            budget.funding.assignableNow,
          );
        }
      } else {
        const sourceCategoryId = input.source.categoryId;
        const sourceValues = budget.groups
          .flatMap(({ categories }) => categories)
          .find(({ category }) => category.id === sourceCategoryId);
        const available = sourceValues?.available ?? Money.zero();
        if (available.cents < amount.cents) {
          throw new InsufficientCategoryAvailableError(amount, available);
        }
      }

      const source =
        input.source.kind === 'category'
          ? await this.changeAllocation(
              input.source.categoryId,
              input.month,
              -amount.cents,
            )
          : undefined;
      const target =
        input.target.kind === 'category'
          ? await this.changeAllocation(
              input.target.categoryId,
              input.month,
              amount.cents,
            )
          : undefined;
      return { ...(source ? { source } : {}), ...(target ? { target } : {}) };
    });
  }

  private async changeAllocation(
    categoryId: string,
    month: string,
    deltaCents: number,
  ): Promise<BudgetAllocation> {
    const current = await this.allocations.findByCategoryAndMonth(
      categoryId,
      month,
    );
    const { instant } = this.clock.now();
    const allocation = createBudgetAllocation({
      id: current?.id ?? this.ids.next(),
      categoryId,
      month,
      amount: Money.fromCents((current?.amount.cents ?? 0) + deltaCents),
      createdAt: current?.createdAt ?? instant,
      updatedAt: instant,
    });
    await this.allocations.save(allocation);
    return allocation;
  }
}
