import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type { CategoryTarget } from '@/domain/entities/category-target';
import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import type { TargetProgress } from '@/domain/services/calculate-target-progress';
import { Money } from '@/domain/value-objects/money';
import {
  buildBudgetProgress,
  type BudgetProgressBar,
  type BudgetProgressSegment,
  type BudgetProgressTone,
} from '@/presentation/utils/budget-progress';
import { formatMoney } from '@/presentation/utils/money';
import {
  categoryDisplayName,
  groupDisplayName,
} from '@/presentation/utils/category-name';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { TranslationKey } from '@/presentation/localization/translations';
import type { TranslationParams } from '@/presentation/localization/translator';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

type CategoryGroupCardProps = Readonly<{
  summary: CategoryGroupSummary;
  valuesByCategoryId: ReadonlyMap<string, BudgetCategoryValues>;
  targetsByCategoryId: ReadonlyMap<string, CategoryTarget>;
  progressByCategoryId: ReadonlyMap<string, TargetProgress>;
  onSelectCategory: (values: BudgetCategoryValues) => void;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}>;

export function CategoryGroupCard({
  summary,
  valuesByCategoryId,
  targetsByCategoryId,
  progressByCategoryId,
  onSelectCategory,
  expanded: controlledExpanded,
  onToggleExpanded,
}: CategoryGroupCardProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [localExpanded, setLocalExpanded] = useState(true);
  const expanded = controlledExpanded ?? localExpanded;
  const visibleCategories = summary.categories.filter(
    (category) => !category.hidden,
  );
  const groupValues = visibleCategories.flatMap((category) => {
    const values = valuesByCategoryId.get(category.id);
    return values ? [values] : [];
  });
  const totalAssigned = Money.fromCents(
    groupValues.reduce((total, values) => total + values.assigned.cents, 0),
  );
  const totalAvailable = Money.fromCents(
    groupValues.reduce((total, values) => total + values.available.cents, 0),
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() =>
          onToggleExpanded
            ? onToggleExpanded()
            : setLocalExpanded((current) => !current)
        }
        style={[
          styles.groupHeader,
          { backgroundColor: theme.colors.surfaceMuted },
        ]}
      >
        <View style={styles.groupCopy}>
          <Text
            style={[
              styles.disclosure,
              { color: theme.colors.primary },
              expanded && styles.disclosureExpanded,
            ]}
          >
            ›
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.groupName, { color: theme.colors.text }]}
          >
            {groupDisplayName(summary.group, t)}
          </Text>
        </View>
        <View style={styles.groupTotals}>
          <SummaryValue
            label={t('budget.assigned')}
            value={formatMoney(totalAssigned)}
          />
          <SummaryValue
            label={t('budget.available')}
            value={formatMoney(totalAvailable)}
            strong
          />
        </View>
      </Pressable>

      {expanded ? (
        visibleCategories.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
            {t('budget.noVisibleCategories')}
          </Text>
        ) : (
          visibleCategories.map((category) => {
            const values = valuesByCategoryId.get(category.id);
            if (!values) return null;
            const target = targetsByCategoryId.get(category.id);
            const progress = progressByCategoryId.get(category.id);
            const status = categoryStatus(values, target, progress, t);
            const needsFunding =
              values.available.cents >= 0 &&
              (progress?.recommended.cents ?? 0) > 0;

            return (
              <Pressable
                key={category.id}
                onPress={() => onSelectCategory(values)}
                style={({ pressed }) => [
                  styles.categoryRow,
                  { borderTopColor: theme.colors.border },
                  pressed && styles.categoryRowPressed,
                  pressed && { backgroundColor: theme.colors.surfacePressed },
                ]}
              >
                <View style={styles.rowTop}>
                  <View style={styles.categoryCopy}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.categoryName,
                        { color: theme.colors.text },
                      ]}
                    >
                      {categoryDisplayName(category, t)}
                    </Text>
                    {target?.kind === 'weekly' && progress ? (
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.targetCaption,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {formatMoney(progress.monthlyTarget)} ·{' '}
                        {formatMoney(target.amount)} {t('targets.weekly')}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.budgetValues}>
                    <Text
                      style={[
                        styles.assigned,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {formatMoney(values.assigned)}
                    </Text>
                    <View
                      style={[
                        styles.availablePill,
                        { backgroundColor: theme.colors.positiveMuted },
                        needsFunding && styles.availablePillWarning,
                        needsFunding && {
                          backgroundColor: theme.colors.warningMuted,
                        },
                        values.available.cents < 0 &&
                          styles.availablePillNegative,
                        values.available.cents < 0 && {
                          backgroundColor: theme.colors.negativeMuted,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.available,
                          { color: theme.colors.positive },
                          needsFunding && styles.availableWarning,
                          needsFunding && { color: theme.colors.warning },
                          values.available.cents < 0 &&
                            styles.availableNegative,
                          values.available.cents < 0 && {
                            color: theme.colors.negative,
                          },
                        ]}
                      >
                        {formatMoney(values.available)}
                      </Text>
                    </View>
                  </View>
                </View>
                {status ? <ProgressStatus {...status} /> : null}
              </Pressable>
            );
          })
        )
      ) : null}
    </View>
  );
}

export type CategoryStatus = Readonly<{
  label: string;
  bar: BudgetProgressBar;
  tone: 'positive' | 'warning' | 'negative';
}>;

export function categoryStatus(
  values: BudgetCategoryValues,
  target?: CategoryTarget,
  progress?: TargetProgress,
  t: (key: TranslationKey, params?: TranslationParams) => string = (key) => key,
): CategoryStatus | null {
  const spent = values.spendingTransactions.reduce(
    (sum, amount) => sum + amount.cents,
    0,
  );
  const funded = Math.max(0, values.available.cents + spent);
  const underfunded =
    values.available.cents >= 0 && (progress?.recommended.cents ?? 0) > 0;
  const bar = buildBudgetProgress({
    spendingCents: values.spendingTransactions.map((amount) => amount.cents),
    availableCents: values.available.cents,
    ...(progress
      ? {
          targetCents: progress.monthlyTarget.cents,
          targetFundedCents: progress.fundedThisMonth.cents,
          ...(progress.occurrenceCount === undefined
            ? {}
            : { targetOccurrences: progress.occurrenceCount }),
        }
      : {}),
    underfunded,
  });

  if (values.available.cents < 0) {
    return {
      label: t('budget.overspent', {
        spent: formatMoney(Money.fromCents(spent)),
        funded: formatMoney(Money.fromCents(funded)),
      }),
      bar,
      tone: 'negative',
    };
  }

  if (target && progress) {
    if (progress.recommended.cents > 0) {
      return {
        label: t('budget.moreNeeded', {
          amount: formatMoney(progress.recommended),
        }),
        bar,
        tone: progress.status === 'overdue' ? 'negative' : 'warning',
      };
    }
    return {
      label: t('budget.funded', {
        funded: formatMoney(
          Money.fromCents(Math.max(0, progress.fundedThisMonth.cents)),
        ),
        goal: formatMoney(progress.monthlyTarget),
      }),
      bar,
      tone: progress.status === 'overdue' ? 'negative' : 'positive',
    };
  }

  if (spent > 0) {
    return {
      label: t('budget.spent', {
        spent: formatMoney(Money.fromCents(spent)),
        funded: formatMoney(Money.fromCents(funded)),
      }),
      bar,
      tone: 'positive',
    };
  }

  return null;
}

function segmentColor(tone: BudgetProgressTone, theme: AppTheme): string {
  switch (tone) {
    case 'available':
      return theme.colors.progressFunded;
    case 'warningSpent':
      return theme.colors.progressWarningSpent;
    case 'warningAvailable':
      return theme.colors.progressWarningFunded;
    case 'overspent':
      return theme.colors.negative;
    default:
      return theme.colors.progressSpent;
  }
}

function segmentBorderColor(
  tone: BudgetProgressBar['segments'][number]['borderTone'],
  theme: AppTheme,
): string {
  switch (tone) {
    case 'positive':
      return theme.colors.progressFunded;
    case 'warning':
      return theme.colors.progressWarningFunded;
    case 'negative':
      return theme.colors.negative;
    default:
      return theme.colors.track;
  }
}

function ProgressStatus({ label, bar, tone }: CategoryStatus) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.progressSection}>
      <View style={styles.track}>
        {bar.segments.map((segment, index) => (
          <VisualProgressSegment
            key={`${segment.overflow ? 'overflow' : 'base'}-${index}`}
            segment={segment}
          />
        ))}
      </View>
      <Text
        style={[
          styles.progressLabel,
          { color: theme.colors.textMuted },
          tone === 'warning' && styles.progressLabelWarning,
          tone === 'warning' && { color: theme.colors.warning },
          tone === 'negative' && styles.progressLabelNegative,
          tone === 'negative' && { color: theme.colors.negative },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function VisualProgressSegment({
  segment,
}: Readonly<{ segment: BudgetProgressSegment }>) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const filledCents = segment.regions.reduce(
    (total, region) => total + region.cents,
    0,
  );
  const emptyCents = Math.max(0, segment.cents - filledCents);

  return (
    <View
      style={[
        styles.visualSegment,
        {
          flex: segment.cents,
          backgroundColor: theme.colors.track,
          borderColor: segmentBorderColor(segment.borderTone, theme),
        },
      ]}
    >
      {segment.regions.map((region, index) => (
        <View
          key={`${region.tone}-${index}`}
          style={{
            backgroundColor: segmentColor(region.tone, theme),
            flex: region.cents,
          }}
        />
      ))}
      {emptyCents > 0 ? <View style={{ flex: emptyCents }} /> : null}
    </View>
  );
}

function SummaryValue({
  label,
  value,
  strong = false,
}: Readonly<{ label: string; value: string; strong?: boolean }>) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.summaryValue}>
      <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.summaryAmount,
          {
            color: strong ? theme.colors.positive : theme.colors.textSecondary,
          },
          strong && styles.summaryAmountStrong,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 18,
      borderWidth: 1,
      overflow: 'hidden',
    },
    groupHeader: {
      minHeight: 68,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surfaceMuted,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    groupCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    disclosure: {
      width: 18,
      color: theme.colors.primary,
      fontSize: 24,
      fontWeight: '700',
    },
    disclosureExpanded: { transform: [{ rotate: '90deg' }] },
    groupName: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: '800',
    },
    groupTotals: { flexDirection: 'row', gap: 16 },
    summaryValue: { alignItems: 'flex-end', gap: 2 },
    summaryLabel: {
      color: theme.colors.textMuted,
      fontSize: 9,
      fontWeight: '700',
    },
    summaryAmount: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontVariant: ['tabular-nums'],
      fontWeight: '600',
    },
    summaryAmountStrong: { color: theme.colors.positive, fontWeight: '800' },
    empty: { padding: 18, color: theme.colors.textMuted, fontSize: 14 },
    categoryRow: {
      minHeight: 68,
      padding: 16,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    categoryRowPressed: { backgroundColor: theme.colors.surfacePressed },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    categoryCopy: { flex: 1, gap: 2 },
    categoryName: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '500',
    },
    targetCaption: { fontSize: 11, fontWeight: '600' },
    budgetValues: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    assigned: {
      minWidth: 72,
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontVariant: ['tabular-nums'],
      fontWeight: '600',
      textAlign: 'right',
    },
    availablePill: {
      minWidth: 78,
      paddingHorizontal: 9,
      paddingVertical: 6,
      backgroundColor: theme.colors.positiveMuted,
      borderRadius: 16,
    },
    availablePillWarning: { backgroundColor: theme.colors.warningMuted },
    availablePillNegative: { backgroundColor: theme.colors.negativeMuted },
    available: {
      color: theme.colors.positive,
      fontSize: 14,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      textAlign: 'right',
    },
    availableWarning: { color: theme.colors.warning },
    availableNegative: { color: theme.colors.negative },
    progressSection: { marginTop: 10, gap: 5 },
    track: {
      height: 8,
      flexDirection: 'row',
      gap: 3,
    },
    visualSegment: {
      height: '100%',
      borderRadius: 4,
      borderWidth: 1,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    progressLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    progressLabelWarning: { color: theme.colors.warning },
    progressLabelNegative: { color: theme.colors.negative },
  });
