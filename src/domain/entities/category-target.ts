import { InvalidCategoryTargetError } from '@/domain/errors/invalid-category-target-error';
import type { Money } from '@/domain/value-objects/money';

export const TARGET_KINDS = ['weekly', 'monthly', 'yearly', 'custom'] as const;
export type TargetKind = (typeof TARGET_KINDS)[number];
export type IsoDayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type WeeklyFundingMode = 'set_aside' | 'refill_up_to';
export type CustomFundingMode = 'set_aside' | 'fill_up_to' | 'balance';

export type CategoryTarget = Readonly<{
  id: string;
  categoryId: string;
  kind: TargetKind;
  amount: Money;
  dayOfWeek?: IsoDayOfWeek;
  weeklyFundingMode?: WeeklyFundingMode;
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
    target.weeklyFundingMode === undefined &&
    target.targetDate === undefined &&
    target.customFundingMode === undefined
  );
}

function hasOnlyYearlyFields(target: CategoryTarget): boolean {
  return (
    target.dayOfWeek === undefined &&
    target.weeklyFundingMode === undefined &&
    target.dayOfMonth === undefined &&
    target.customFundingMode === undefined
  );
}

function hasOnlyCustomFields(target: CategoryTarget): boolean {
  return (
    target.dayOfWeek === undefined &&
    target.weeklyFundingMode === undefined &&
    target.dayOfMonth === undefined &&
    target.targetDate === undefined
  );
}

export function createCategoryTarget(
  properties: CategoryTarget,
): CategoryTarget {
  if (properties.amount.cents <= 0) {
    throw new InvalidCategoryTargetError('amount must be positive');
  }

  switch (properties.kind) {
    case 'weekly':
      if (
        !properties.dayOfWeek ||
        properties.dayOfWeek < 1 ||
        properties.dayOfWeek > 7 ||
        !['set_aside', 'refill_up_to'].includes(
          properties.weeklyFundingMode ?? '',
        ) ||
        !hasOnlyWeeklyFields(properties)
      ) {
        throw new InvalidCategoryTargetError(
          'weekly targets require a weekday and funding mode',
        );
      }
      break;
    case 'monthly':
      if (
        properties.dayOfMonth === undefined ||
        !Number.isInteger(properties.dayOfMonth) ||
        properties.dayOfMonth < 0 ||
        properties.dayOfMonth > 31 ||
        !hasOnlyMonthlyFields(properties)
      ) {
        throw new InvalidCategoryTargetError(
          'monthly targets require a day from 1 to 31 or last day',
        );
      }
      break;
    case 'yearly':
      if (
        !properties.targetDate ||
        !isValidDate(properties.targetDate) ||
        !hasOnlyYearlyFields(properties)
      ) {
        throw new InvalidCategoryTargetError(
          'yearly targets require only a valid date',
        );
      }
      break;
    case 'custom':
      if (
        !['set_aside', 'fill_up_to', 'balance'].includes(
          properties.customFundingMode ?? '',
        ) ||
        !hasOnlyCustomFields(properties)
      ) {
        throw new InvalidCategoryTargetError(
          'custom targets require only a funding mode',
        );
      }
      break;
  }

  return { ...properties };
}

export function updateCategoryTarget(
  current: CategoryTarget,
  changes: Omit<CategoryTarget, 'id' | 'categoryId' | 'createdAt'>,
): CategoryTarget {
  return createCategoryTarget({ ...current, ...changes });
}
