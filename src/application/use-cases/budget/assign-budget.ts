import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  assertValidBudgetMonth,
  createBudgetAllocation,
  type BudgetAllocation,
} from '@/domain/entities/budget-allocation';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { InsufficientReadyToAssignError } from '@/domain/errors/insufficient-ready-to-assign-error';
import type { BudgetAllocationRepository } from '@/domain/repositories/budget-allocation-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import { Money } from '@/domain/value-objects/money';

import type { GetBudgetMonth } from './get-budget-month';

export type AssignBudgetInput = Readonly<{
  categoryId: string;
  month: string;
  amountCents: number;
}>;

export class AssignBudget {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly allocations: BudgetAllocationRepository,
    private readonly getBudgetMonth: Pick<GetBudgetMonth, 'execute'>,
    private readonly unitOfWork: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: AssignBudgetInput): Promise<BudgetAllocation> {
    assertValidBudgetMonth(input.month);
    const amount = Money.fromCents(input.amountCents);

    return this.unitOfWork.run(async () => {
      if (!(await this.categories.findById(input.categoryId))) {
        throw new CategoryNotFoundError(input.categoryId);
      }

      const [current, budget] = await Promise.all([
        this.allocations.findByCategoryAndMonth(input.categoryId, input.month),
        this.getBudgetMonth.execute(input.month),
      ]);
      const difference = amount.cents - (current?.amount.cents ?? 0);

      if (difference > 0 && difference > budget.readyToAssign.cents) {
        throw new InsufficientReadyToAssignError(
          Money.fromCents(difference),
          budget.readyToAssign,
        );
      }

      const { instant } = this.clock.now();
      const allocation = createBudgetAllocation({
        id: current?.id ?? this.ids.next(),
        categoryId: input.categoryId,
        month: input.month,
        amount,
        createdAt: current?.createdAt ?? instant,
        updatedAt: instant,
      });
      await this.allocations.save(allocation);
      return allocation;
    });
  }
}
