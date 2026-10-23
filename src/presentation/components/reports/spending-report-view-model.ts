import {
  calculateSpendingGroupReports,
  type SpendingCategoryReport,
  type SpendingGroupReport,
  type SpendingInterval,
  type SpendingReport,
} from '@/domain/services/calculate-spending-report';
import { Money } from '@/domain/value-objects/money';

export type SpendingSelection =
  | Readonly<{ kind: 'group'; groupId: string }>
  | Readonly<{ kind: 'category'; categoryId: string }>;

export type SpendingCategoryView = Readonly<{
  category: SpendingCategoryReport;
  groupId: string;
  hasActivity: boolean;
  spending: Money;
  percentageOfInterval: number;
}>;

export type SpendingGroupView = Readonly<{
  group: SpendingGroupReport;
  hasActivity: boolean;
  spending: Money;
  percentageOfInterval: number;
  categories: readonly SpendingCategoryView[];
}>;

export type SpendingChartSegment = Readonly<{
  id: string;
  groupId: string;
  kind: 'group' | 'category';
  spending: Money;
}>;

export type SpendingIntervalView = Readonly<{
  interval: SpendingInterval;
  spending: Money;
  groupSegments: readonly SpendingChartSegment[];
  categorySegments: readonly SpendingChartSegment[];
}>;

export type SpendingSelectionView = Readonly<{
  id: string;
  kind: 'group' | 'category';
  groupId: string;
  name: string;
  spending: Money;
  percentageOfInterval: number;
  total: Money;
  average: Money;
}>;

export type SpendingReportViewModel = Readonly<{
  activeInterval: SpendingInterval;
  activeIntervalIndex: number;
  activeSpending: Money;
  currentIntervalKey: string;
  isCurrentInterval: boolean;
  intervals: readonly SpendingIntervalView[];
  groups: readonly SpendingGroupView[];
  selection?: SpendingSelectionView;
  windowAverage: Money;
  windowTotal: Money;
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

function categoryGroupId(category: SpendingCategoryReport): string {
  return category.groupId ?? 'report-group-other';
}

function positivePercentage(cents: number, positiveTotalCents: number): number {
  return cents > 0 && positiveTotalCents > 0 ? cents / positiveTotalCents : 0;
}

export function buildSpendingReportViewModel(
  report: SpendingReport,
  selectedIntervalKey?: string,
  selected?: SpendingSelection,
): SpendingReportViewModel {
  const currentInterval = report.intervals.at(-1)!;
  const activeKey = activeSpendingIntervalKey(report, selectedIntervalKey);
  const activeIntervalIndex = report.intervals.findIndex(
    ({ key }) => key === activeKey,
  );
  const activeInterval = report.intervals[activeIntervalIndex]!;
  const activeCategoryIds = new Set(
    activeInterval.categories.map(({ categoryId }) => categoryId),
  );
  const groupReports = calculateSpendingGroupReports(report);
  const activeCategorySpending = report.categories.map(
    (category) =>
      category.spendingByInterval[activeIntervalIndex] ?? Money.zero(),
  );
  const positiveCategoryTotalCents = activeCategorySpending.reduce(
    (sum, spending) => sum + Math.max(0, spending.cents),
    0,
  );
  const categories = report.categories.map((category, index) => {
    const spending = activeCategorySpending[index] ?? Money.zero();
    return {
      category,
      groupId: categoryGroupId(category),
      hasActivity: activeCategoryIds.has(category.categoryId),
      spending,
      percentageOfInterval: positivePercentage(
        spending.cents,
        positiveCategoryTotalCents,
      ),
    };
  });
  const categoryById = new Map(
    categories.map((category) => [category.category.categoryId, category]),
  );
  const activeGroupSpending = groupReports.map(
    (group) => group.spendingByInterval[activeIntervalIndex] ?? Money.zero(),
  );
  const positiveGroupTotalCents = activeGroupSpending.reduce(
    (sum, spending) => sum + Math.max(0, spending.cents),
    0,
  );
  const groups = groupReports
    .map((group, index) => {
      const spending = activeGroupSpending[index] ?? Money.zero();
      const groupCategories = group.categories
        .map((category) => categoryById.get(category.categoryId)!)
        .sort((left, right) => {
          const spendingDifference = right.spending.cents - left.spending.cents;
          return (
            spendingDifference ||
            left.category.categoryName.localeCompare(
              right.category.categoryName,
            )
          );
        });
      return {
        group,
        hasActivity: groupCategories.some(({ hasActivity }) => hasActivity),
        spending,
        percentageOfInterval: positivePercentage(
          spending.cents,
          positiveGroupTotalCents,
        ),
        categories: groupCategories,
      };
    })
    .sort((left, right) => {
      const spendingDifference = right.spending.cents - left.spending.cents;
      return (
        spendingDifference ||
        left.group.groupName.localeCompare(right.group.groupName)
      );
    });
  const groupById = new Map(
    groups.map((group) => [group.group.groupId, group]),
  );

  let selection: SpendingSelectionView | undefined;
  if (selected?.kind === 'group') {
    const group = groupById.get(selected.groupId);
    if (group) {
      selection = {
        id: group.group.groupId,
        kind: 'group',
        groupId: group.group.groupId,
        name: group.group.groupName,
        spending: group.spending,
        percentageOfInterval: group.percentageOfInterval,
        total: group.group.total,
        average: group.group.average,
      };
    }
  } else if (selected?.kind === 'category') {
    const category = categoryById.get(selected.categoryId);
    if (category) {
      selection = {
        id: category.category.categoryId,
        kind: 'category',
        groupId: category.groupId,
        name: category.category.categoryName,
        spending: category.spending,
        percentageOfInterval: category.percentageOfInterval,
        total: category.category.total,
        average: category.category.average,
      };
    }
  }

  const intervals = report.intervals.map((interval, intervalIndex) => ({
    interval,
    spending: selection
      ? selection.kind === 'group'
        ? (groupById.get(selection.groupId)?.group.spendingByInterval[
            intervalIndex
          ] ?? Money.zero())
        : (categoryById.get(selection.id)?.category.spendingByInterval[
            intervalIndex
          ] ?? Money.zero())
      : interval.spending,
    groupSegments: groups.map(({ group }) => ({
      id: group.groupId,
      groupId: group.groupId,
      kind: 'group' as const,
      spending: group.spendingByInterval[intervalIndex] ?? Money.zero(),
    })),
    categorySegments: categories.map(({ category, groupId }) => ({
      id: category.categoryId,
      groupId,
      kind: 'category' as const,
      spending: category.spendingByInterval[intervalIndex] ?? Money.zero(),
    })),
  }));

  return {
    activeInterval,
    activeIntervalIndex,
    activeSpending: selection?.spending ?? activeInterval.spending,
    currentIntervalKey: currentInterval.key,
    isCurrentInterval: activeInterval.key === currentInterval.key,
    intervals,
    groups,
    ...(selection ? { selection } : {}),
    windowAverage: selection?.average ?? report.average,
    windowTotal: selection?.total ?? report.total,
  };
}
