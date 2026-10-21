import type {
  SpendingCategoryReport,
  SpendingInterval,
  SpendingReport,
} from '@/domain/services/calculate-spending-report';
import { Money } from '@/domain/value-objects/money';

export type SpendingIntervalRow = Readonly<{
  interval: SpendingInterval;
  spending: Money;
  percentageOfWindow: number;
}>;

export type SpendingCategoryRow = Readonly<{
  category: SpendingCategoryReport;
  hasActivity: boolean;
  spending: Money;
  percentageOfInterval: number;
}>;

export type SpendingReportViewModel = Readonly<{
  activeInterval: SpendingInterval;
  activeSpending: Money;
  currentIntervalKey: string;
  isCurrentInterval: boolean;
  maximumIntervalSpendingCents: number;
  intervalRows: readonly SpendingIntervalRow[];
  selectedCategory?: SpendingCategoryReport;
  windowAverage: Money;
  windowTotal: Money;
  spendingCategories: readonly SpendingCategoryRow[];
  netCreditCategories: readonly SpendingCategoryRow[];
  zeroNetCategories: readonly SpendingCategoryRow[];
  noSpendingCategories: readonly SpendingCategoryRow[];
}>;

export function activeSpendingIntervalKey(
  report: SpendingReport,
  selectedIntervalKey?: string,
): string {
  const selected = report.intervals.find(
    ({ key }) => key === selectedIntervalKey,
  );
  return selected?.key ?? report.intervals.at(-1)!.key;
}

export function buildSpendingReportViewModel(
  report: SpendingReport,
  selectedIntervalKey?: string,
  selectedCategoryId?: string,
): SpendingReportViewModel {
  const currentInterval = report.intervals.at(-1)!;
  const activeKey = activeSpendingIntervalKey(report, selectedIntervalKey);
  const activeInterval = report.intervals.find(({ key }) => key === activeKey)!;
  const activeIntervalIndex = report.intervals.findIndex(
    ({ key }) => key === activeKey,
  );
  const selectedCategory = report.categories.find(
    ({ categoryId }) => categoryId === selectedCategoryId,
  );
  const displayedSpending = report.intervals.map((interval, index) =>
    selectedCategory
      ? (selectedCategory.spendingByInterval[index] ?? Money.zero())
      : interval.spending,
  );
  const positiveWindowTotalCents = displayedSpending.reduce(
    (sum, spending) => sum + Math.max(0, spending.cents),
    0,
  );
  const activeCategoryIds = new Set(
    activeInterval.categories.map(({ categoryId }) => categoryId),
  );
  const activeCategorySpending = report.categories.map(
    (category) =>
      category.spendingByInterval[activeIntervalIndex] ?? Money.zero(),
  );
  const positiveActiveTotalCents = activeCategorySpending.reduce(
    (sum, spending) => sum + Math.max(0, spending.cents),
    0,
  );
  const categoryRows = report.categories.map((category, index) => {
    const spending = activeCategorySpending[index] ?? Money.zero();
    return {
      category,
      hasActivity: activeCategoryIds.has(category.categoryId),
      spending,
      percentageOfInterval:
        spending.cents > 0 && positiveActiveTotalCents > 0
          ? spending.cents / positiveActiveTotalCents
          : 0,
    };
  });
  const intervalRows = report.intervals.map((interval, index) => {
    const spending = displayedSpending[index] ?? Money.zero();
    return {
      interval,
      spending,
      percentageOfWindow:
        spending.cents > 0 && positiveWindowTotalCents > 0
          ? spending.cents / positiveWindowTotalCents
          : 0,
    };
  });

  return {
    activeInterval,
    activeSpending:
      displayedSpending[activeIntervalIndex] ?? activeInterval.spending,
    currentIntervalKey: currentInterval.key,
    isCurrentInterval: activeInterval.key === currentInterval.key,
    maximumIntervalSpendingCents: Math.max(
      1,
      ...report.intervals.map(({ spending }) => Math.max(0, spending.cents)),
    ),
    intervalRows: [...intervalRows].reverse(),
    ...(selectedCategory ? { selectedCategory } : {}),
    windowAverage: selectedCategory?.average ?? report.average,
    windowTotal: selectedCategory?.total ?? report.total,
    spendingCategories: categoryRows
      .filter(({ spending }) => spending.cents > 0)
      .sort((left, right) => right.spending.cents - left.spending.cents),
    netCreditCategories: categoryRows
      .filter(({ spending }) => spending.cents < 0)
      .sort((left, right) => left.spending.cents - right.spending.cents),
    zeroNetCategories: categoryRows.filter(
      ({ hasActivity, spending }) => hasActivity && spending.cents === 0,
    ),
    noSpendingCategories: categoryRows.filter(
      ({ hasActivity, spending }) => !hasActivity && spending.cents === 0,
    ),
  };
}
