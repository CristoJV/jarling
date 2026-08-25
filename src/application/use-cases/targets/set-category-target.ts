import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  createCategoryTarget,
  type CategoryTarget,
  type CustomFundingMode,
  type IsoDayOfWeek,
  type RecurringFundingMode,
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
        fundingMode: RecurringFundingMode;
        includePreviousWeeks?: boolean;
      }>)
  | (SetCategoryTargetBase &
      Readonly<{
        kind: 'monthly';
        dayOfMonth: number;
        fundingMode: RecurringFundingMode;
      }>)
  | (SetCategoryTargetBase &
      Readonly<{
        kind: 'yearly';
        targetDate: string;
        fundingMode: RecurringFundingMode;
      }>)
  | (SetCategoryTargetBase &
      Readonly<{
        kind: 'custom';
        customFundingMode: CustomFundingMode;
        targetDate?: string;
      }>);

type TargetDefinition = Pick<
  CategoryTarget,
  | 'kind'
  | 'amount'
  | 'startsOn'
  | 'dayOfWeek'
  | 'includePreviousWeeks'
  | 'fundingMode'
  | 'dayOfMonth'
  | 'targetDate'
  | 'customFundingMode'
>;

const emptyDefinition = {
  dayOfWeek: undefined,
  includePreviousWeeks: undefined,
  fundingMode: undefined,
  dayOfMonth: undefined,
  targetDate: undefined,
  customFundingMode: undefined,
} as const;

function definition(
  input: SetCategoryTargetInput,
  startsOn: string,
): TargetDefinition {
  const amount = Money.fromCents(input.amountCents);
  switch (input.kind) {
    case 'weekly':
      return {
        ...emptyDefinition,
        kind: input.kind,
        amount,
        startsOn,
        dayOfWeek: input.dayOfWeek,
        includePreviousWeeks: input.includePreviousWeeks ?? false,
        fundingMode: input.fundingMode,
      };
    case 'monthly':
      return {
        ...emptyDefinition,
        kind: input.kind,
        amount,
        startsOn,
        dayOfMonth: input.dayOfMonth,
        fundingMode: input.fundingMode,
      };
    case 'yearly':
      return {
        ...emptyDefinition,
        kind: input.kind,
        amount,
        startsOn,
        targetDate: input.targetDate,
        fundingMode: input.fundingMode,
      };
    case 'custom':
      return {
        ...emptyDefinition,
        kind: input.kind,
        amount,
        startsOn,
        targetDate: input.targetDate,
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
    const { instant, date } = this.clock.now();
    const resetsSchedule =
      !current ||
      current.kind !== input.kind ||
      (current.kind === 'weekly' &&
        input.kind === 'weekly' &&
        current.dayOfWeek !== input.dayOfWeek);
    const fields = definition(input, resetsSchedule ? date : current.startsOn);
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
