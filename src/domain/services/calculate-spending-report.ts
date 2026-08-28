import type { Account } from '@/domain/entities/account';
import type { Category } from '@/domain/entities/category';
import type { CategoryGroup } from '@/domain/entities/category-group';
import {
  isValidTransactionDate,
  type Transaction,
} from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

export type SpendingIntervalUnit = 'day' | 'week' | 'month' | 'year';

export type SpendingInterval = Readonly<{
  key: string;
  startDate: string;
  endDate: string;
  spending: Money;
  categories: readonly SpendingIntervalCategory[];
}>;

export type SpendingIntervalCategory = Readonly<{
  categoryId: string;
  spending: Money;
  percentageOfInterval: number;
}>;

export type SpendingIntervalExtreme = Readonly<{
  startDate: string;
  endDate: string;
  spending: Money;
}>;

export type SpendingCategoryReport = Readonly<{
  categoryId: string;
  categoryName: string;
  groupId?: string;
  groupName: string;
  total: Money;
  average: Money;
  spendingByInterval: readonly Money[];
  percentageOfTotal: number;
  lowestInterval: SpendingIntervalExtreme;
  highestInterval: SpendingIntervalExtreme;
}>;

export type SpendingReport = Readonly<{
  interval: SpendingIntervalUnit;
  intervalCount: number;
  intervals: readonly SpendingInterval[];
  total: Money;
  average: Money;
  categories: readonly SpendingCategoryReport[];
}>;

type CalculateSpendingReportInput = Readonly<{
  throughDate: string;
  interval: SpendingIntervalUnit;
  intervalCount: number;
  accounts: readonly Account[];
  categories: readonly Category[];
  groups: readonly CategoryGroup[];
  transactions: readonly Transaction[];
}>;

type DateInterval = Readonly<{
  key: string;
  startDate: string;
  endDate: string;
}>;

export function calculateSpendingReport({
  throughDate,
  interval,
  intervalCount,
  accounts,
  categories,
  groups,
  transactions,
}: CalculateSpendingReportInput): SpendingReport {
  const intervals = buildSpendingIntervals({
    throughDate,
    interval,
    intervalCount,
  });
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const spendingByCategory = new Map<string, number[]>();
  const intervalIndexByKey = new Map(
    intervals.map(({ key }, index) => [key, index]),
  );
  const firstDate = intervals[0]!.startDate;

  for (const transaction of transactions) {
    if (transaction.date < firstDate || transaction.date > throughDate) {
      continue;
    }
    const intervalIndex = intervalIndexByKey.get(
      isoDate(startOfInterval(parseDate(transaction.date), interval)),
    );
    if (
      intervalIndex === undefined ||
      transaction.kind !== 'standard' ||
      !transaction.categoryId ||
      accountById.get(transaction.accountId)?.onBudget !== true
    ) {
      continue;
    }

    const values =
      spendingByCategory.get(transaction.categoryId) ??
      Array.from({ length: intervalCount }, () => 0);
    values[intervalIndex] =
      (values[intervalIndex] ?? 0) - transaction.amount.cents;
    spendingByCategory.set(transaction.categoryId, values);
  }

  const categoryRows = [...spendingByCategory]
    .map(([categoryId, values]) => {
      const totalCents = values.reduce((sum, value) => sum + value, 0);
      const category = categoryById.get(categoryId);
      return {
        categoryId,
        categoryName: category?.name ?? 'Unknown category',
        ...(category ? { groupId: category.groupId } : {}),
        groupName: category
          ? (groupById.get(category.groupId)?.name ?? 'Other')
          : 'Other',
        values,
        totalCents,
      };
    })
    .filter(({ totalCents }) => totalCents > 0)
    .sort((left, right) => right.totalCents - left.totalCents);
  const totalCents = categoryRows.reduce(
    (sum, category) => sum + category.totalCents,
    0,
  );
  const intervalTotals = intervals.map((_, index) =>
    categoryRows.reduce(
      (sum, category) => sum + (category.values[index] ?? 0),
      0,
    ),
  );

  return {
    interval,
    intervalCount,
    intervals: intervals.map((dateInterval, index) => {
      const intervalTotalCents = intervalTotals[index] ?? 0;
      return {
        ...dateInterval,
        spending: Money.fromCents(intervalTotalCents),
        categories: categoryRows.flatMap((category) => {
          const spendingCents = category.values[index] ?? 0;
          return spendingCents > 0
            ? [
                {
                  categoryId: category.categoryId,
                  spending: Money.fromCents(spendingCents),
                  percentageOfInterval:
                    intervalTotalCents > 0
                      ? spendingCents / intervalTotalCents
                      : 0,
                },
              ]
            : [];
        }),
      };
    }),
    total: Money.fromCents(totalCents),
    average: Money.fromCents(Math.round(totalCents / intervalCount)),
    categories: categoryRows.map((category) => {
      const lowestIndex = extremeIndex(category.values, 'lowest');
      const highestIndex = extremeIndex(category.values, 'highest');
      return {
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        ...(category.groupId ? { groupId: category.groupId } : {}),
        groupName: category.groupName,
        total: Money.fromCents(category.totalCents),
        average: Money.fromCents(
          Math.round(category.totalCents / intervalCount),
        ),
        spendingByInterval: category.values.map((value) =>
          Money.fromCents(value),
        ),
        percentageOfTotal:
          totalCents === 0 ? 0 : category.totalCents / totalCents,
        lowestInterval: intervalExtreme(
          intervals[lowestIndex]!,
          category.values[lowestIndex] ?? 0,
        ),
        highestInterval: intervalExtreme(
          intervals[highestIndex]!,
          category.values[highestIndex] ?? 0,
        ),
      };
    }),
  };
}

export function buildSpendingIntervals({
  throughDate,
  interval,
  intervalCount,
}: Readonly<{
  throughDate: string;
  interval: SpendingIntervalUnit;
  intervalCount: number;
}>): readonly DateInterval[] {
  if (!isValidTransactionDate(throughDate)) {
    throw new RangeError('throughDate must be a valid ISO date');
  }
  if (!Number.isSafeInteger(intervalCount) || intervalCount < 1) {
    throw new RangeError('intervalCount must be a positive integer');
  }

  const through = parseDate(throughDate);
  const currentStart = startOfInterval(through, interval);
  return Array.from({ length: intervalCount }, (_, index) => {
    const offset = index - intervalCount + 1;
    const start = shiftInterval(currentStart, interval, offset);
    const nextStart = shiftInterval(start, interval, 1);
    return {
      key: isoDate(start),
      startDate: isoDate(start),
      endDate: isoDate(addDays(nextStart, -1)),
    };
  });
}

function extremeIndex(values: readonly number[], kind: 'lowest' | 'highest') {
  let selected = 0;
  for (let index = 1; index < values.length; index += 1) {
    const candidate = values[index] ?? 0;
    const current = values[selected] ?? 0;
    if (
      (kind === 'lowest' && candidate < current) ||
      (kind === 'highest' && candidate > current)
    ) {
      selected = index;
    }
  }
  return selected;
}

function intervalExtreme(
  interval: DateInterval,
  spendingCents: number,
): SpendingIntervalExtreme {
  return {
    startDate: interval.startDate,
    endDate: interval.endDate,
    spending: Money.fromCents(spendingCents),
  };
}

function startOfInterval(date: Date, interval: SpendingIntervalUnit) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  switch (interval) {
    case 'day':
      return new Date(Date.UTC(year, month, date.getUTCDate()));
    case 'week':
      return addDays(date, -((date.getUTCDay() + 6) % 7));
    case 'month':
      return new Date(Date.UTC(year, month, 1));
    case 'year':
      return new Date(Date.UTC(year, 0, 1));
  }
}

function shiftInterval(
  date: Date,
  interval: SpendingIntervalUnit,
  amount: number,
) {
  switch (interval) {
    case 'day':
      return addDays(date, amount);
    case 'week':
      return addDays(date, amount * 7);
    case 'month':
      return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1),
      );
    case 'year':
      return new Date(Date.UTC(date.getUTCFullYear() + amount, 0, 1));
  }
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
