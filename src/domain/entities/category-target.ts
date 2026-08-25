import { InvalidCategoryTargetError } from '@/domain/errors/invalid-category-target-error';
import type { Money } from '@/domain/value-objects/money';

export const TARGET_KINDS = ['weekly', 'monthly', 'yearly', 'custom'] as const;
export type TargetKind = (typeof TARGET_KINDS)[number];
export type IsoDayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type RecurringFundingMode = 'set_aside' | 'refill_up_to';
export type CustomFundingMode = 'set_aside' | 'fill_up_to' | 'balance';

export type CategoryTarget = Readonly<{
  id: string;
  categoryId: string;
  kind: TargetKind;
  amount: Money;
  startsOn: string;
  dayOfWeek?: IsoDayOfWeek;
  includePreviousWeeks?: boolean;
  fundingMode?: RecurringFundingMode;
  dayOfMonth?: number; // 0 means last day; otherwise 1..31
  targetDate?: string;
  customFundingMode?: CustomFundingMode;
  createdAt: string;
  updatedAt: string;
}>;

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function hasOnlyWeeklyFields(target: CategoryTarget): boolean {
  return (
    target.dayOfMonth === undefined &&
    target.targetDate === undefined &&
    target.customFundingMode === undefined
  );
}

function hasOnlyMonthlyFields(target: CategoryTarget): boolean {
  return (
    target.dayOfWeek === undefined &&
    target.includePreviousWeeks === undefined &&
    target.targetDate === undefined &&
    target.customFundingMode === undefined
  );
}

function hasOnlyYearlyFields(target: CategoryTarget): boolean {
  return (
    target.dayOfWeek === undefined &&
    target.includePreviousWeeks === undefined &&
    target.dayOfMonth === undefined &&
    target.customFundingMode === undefined
  );
}

function hasOnlyCustomFields(target: CategoryTarget): boolean {
  return (
    target.dayOfWeek === undefined &&
    target.includePreviousWeeks === undefined &&
    target.fundingMode === undefined &&
    target.dayOfMonth === undefined
  );
}

export function createCategoryTarget(
  properties: CategoryTarget,
): CategoryTarget {
  const target: CategoryTarget =
    properties.kind === 'weekly' &&
    properties.includePreviousWeeks === undefined
      ? { ...properties, includePreviousWeeks: false }
      : properties;

  if (target.amount.cents <= 0) {
    throw new InvalidCategoryTargetError('amount must be positive');
  }
  if (!isValidDate(target.startsOn)) {
    throw new InvalidCategoryTargetError('startsOn must be a valid date');
  }

  switch (target.kind) {
    case 'weekly':
      if (
        !target.dayOfWeek ||
        target.dayOfWeek < 1 ||
        target.dayOfWeek > 7 ||
        typeof target.includePreviousWeeks !== 'boolean' ||
        !['set_aside', 'refill_up_to'].includes(target.fundingMode ?? '') ||
        !hasOnlyWeeklyFields(target)
      ) {
        throw new InvalidCategoryTargetError(
          'weekly targets require a weekday and funding mode',
        );
      }
      break;
    case 'monthly':
      if (
        target.dayOfMonth === undefined ||
        !['set_aside', 'refill_up_to'].includes(target.fundingMode ?? '') ||
        !Number.isInteger(target.dayOfMonth) ||
        target.dayOfMonth < 0 ||
        target.dayOfMonth > 31 ||
        !hasOnlyMonthlyFields(target)
      ) {
        throw new InvalidCategoryTargetError(
          'monthly targets require a day from 1 to 31 or last day',
        );
      }
      break;
    case 'yearly':
      if (
        !target.targetDate ||
        !['set_aside', 'refill_up_to'].includes(target.fundingMode ?? '') ||
        !isValidDate(target.targetDate) ||
        !hasOnlyYearlyFields(target)
      ) {
        throw new InvalidCategoryTargetError(
          'yearly targets require only a valid date',
        );
      }
      break;
    case 'custom':
      if (
        !['set_aside', 'fill_up_to', 'balance'].includes(
          target.customFundingMode ?? '',
        ) ||
        (target.targetDate !== undefined && !isValidDate(target.targetDate)) ||
        !hasOnlyCustomFields(target)
      ) {
        throw new InvalidCategoryTargetError(
          'custom targets require a funding mode and an optional valid date',
        );
      }
      break;
  }

  return { ...target };
}

export function updateCategoryTarget(
  current: CategoryTarget,
  changes: Omit<CategoryTarget, 'id' | 'categoryId' | 'createdAt'>,
): CategoryTarget {
  return createCategoryTarget({ ...current, ...changes });
}
