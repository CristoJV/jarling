import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  createCategoryTarget,
  type CategoryTarget,
  type CustomFundingMode,
  type IsoDayOfWeek,
  type WeeklyFundingMode,
  updateCategoryTarget,
} from '@/domain/entities/category-target';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { CategoryTargetRepository } from '@/domain/repositories/category-target-repository';
import { Money } from '@/domain/value-objects/money';

type SetCategoryTargetBase = Readonly<{
  categoryId: string;
  amountCents: number;
}>;

export type SetCategoryTargetInput =
  | (SetCategoryTargetBase &
      Readonly<{
        kind: 'weekly';
        dayOfWeek: IsoDayOfWeek;
        weeklyFundingMode: WeeklyFundingMode;
      }>)
  | (SetCategoryTargetBase & Readonly<{ kind: 'monthly'; dayOfMonth: number }>)
  | (SetCategoryTargetBase & Readonly<{ kind: 'yearly'; targetDate: string }>)
  | (SetCategoryTargetBase &
      Readonly<{ kind: 'custom'; customFundingMode: CustomFundingMode }>);

type TargetDefinition = Pick<
  CategoryTarget,
  | 'kind'
  | 'amount'
  | 'dayOfWeek'
  | 'weeklyFundingMode'
  | 'dayOfMonth'
  | 'targetDate'
  | 'customFundingMode'
>;

const emptyDefinition = {
  dayOfWeek: undefined,
  weeklyFundingMode: undefined,
  dayOfMonth: undefined,
  targetDate: undefined,
  customFundingMode: undefined,
} as const;

function definition(input: SetCategoryTargetInput): TargetDefinition {
  const amount = Money.fromCents(input.amountCents);
  switch (input.kind) {
    case 'weekly':
      return {
        ...emptyDefinition,
        kind: input.kind,
        amount,
        dayOfWeek: input.dayOfWeek,
        weeklyFundingMode: input.weeklyFundingMode,
      };
    case 'monthly':
      return {
        ...emptyDefinition,
        kind: input.kind,
        amount,
        dayOfMonth: input.dayOfMonth,
      };
    case 'yearly':
      return {
        ...emptyDefinition,
        kind: input.kind,
        amount,
        targetDate: input.targetDate,
      };
    case 'custom':
      return {
        ...emptyDefinition,
        kind: input.kind,
        amount,
        customFundingMode: input.customFundingMode,
      };
  }
}

export class SetCategoryTarget {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly targets: CategoryTargetRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: SetCategoryTargetInput): Promise<CategoryTarget> {
    if (!(await this.categories.findById(input.categoryId))) {
      throw new CategoryNotFoundError(input.categoryId);
    }

    const current = await this.targets.findByCategory(input.categoryId);
    const { instant } = this.clock.now();
    const fields = definition(input);
    const target = current
      ? updateCategoryTarget(current, { ...fields, updatedAt: instant })
      : createCategoryTarget({
          id: this.ids.next(),
          categoryId: input.categoryId,
          ...fields,
          createdAt: instant,
          updatedAt: instant,
        });

    return this.unitOfWork.run(async () => {
      await this.targets.save(target);
      return target;
    });
  }
}
