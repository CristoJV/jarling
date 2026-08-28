import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type {
  SpendingIntervalExtreme,
  SpendingIntervalUnit,
  SpendingReport,
} from '@/domain/services/calculate-spending-report';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { SupportedLanguage } from '@/presentation/localization/translator';
import type { ReportCategoryColors } from '@/presentation/components/reports/report-category-colors';
import { FilterChip } from '@/presentation/components/common/filter-chip';
import {
  categorySelectionMetrics,
  formatReportPeriod,
  intervalSelectionMetrics,
} from '@/presentation/components/reports/spending-report-selection';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import {
  categoryDisplayName,
  groupDisplayName,
} from '@/presentation/utils/category-name';
import { formatMoney } from '@/presentation/utils/money';

type SelectionProps = Readonly<{
  categoryColors: ReportCategoryColors;
  report: SpendingReport;
  selectedCategoryId?: string;
  selectedIntervalKey?: string;
}>;

export function SpendingReportOverview({
  categoryColors,
  report,
  selectedCategoryId,
  selectedIntervalKey,
  onClearCategory,
  onClearInterval,
  onSelectInterval,
}: SelectionProps &
  Readonly<{
    onClearCategory: () => void;
    onClearInterval: () => void;
    onSelectInterval: (intervalKey: string) => void;
  }>) {
  const { language, t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const selectedCategoryIndex = report.categories.findIndex(
    ({ categoryId }) => categoryId === selectedCategoryId,
  );
  const selectedCategory = report.categories[selectedCategoryIndex];
  const selectedInterval = report.intervals.find(
    ({ key }) => key === selectedIntervalKey,
  );
  const multipleIntervals = report.intervalCount > 1;

  return (
    <View style={styles.overview}>
      <SpendingPeriodBanner
        categoryColors={categoryColors}
        language={language}
        report={report}
      />
      {selectedInterval || selectedCategory ? (
        <View style={styles.activeFilters}>
          {selectedInterval ? (
            <FilterChip
              label={compactIntervalLabel(
                selectedInterval,
                report.interval,
                language,
              )}
              onPress={onClearInterval}
              onRemove={onClearInterval}
            />
          ) : null}
          {selectedCategory ? (
            <FilterChip
              label={categoryDisplayName(
                {
                  id: selectedCategory.categoryId,
                  name: selectedCategory.categoryName,
                },
                t,
              )}
              onPress={onClearCategory}
              onRemove={onClearCategory}
            />
          ) : null}
        </View>
      ) : null}

      {multipleIntervals ? (
        <TemporalBreakdown
          categoryColors={categoryColors}
          language={language}
          onSelectInterval={onSelectInterval}
          selectedCategoryId={selectedCategory?.categoryId}
          selectedIntervalKey={selectedIntervalKey}
          report={report}
        />
      ) : null}
    </View>
  );
}

function SpendingPeriodBanner({
  categoryColors,
  language,
  report,
}: Readonly<{
  categoryColors: ReportCategoryColors;
  language: SupportedLanguage;
  report: SpendingReport;
}>) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.periodBanner}>
      <Text style={styles.periodRange}>
        {formatReportPeriod(report, language)}
      </Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.periodTotal}>
        {formatMoney(report.total)}
      </Text>
      <Text style={styles.periodAverage}>
        {formatMoney(report.average)}/{t(`reports.unit.${report.interval}`)}
      </Text>
      <View
        accessibilityLabel={t('reports.spendingComposition')}
        accessibilityRole="summary"
        style={styles.periodComposition}
      >
        {report.categories.map((category) => (
          <View
            key={category.categoryId}
            style={{
              backgroundColor: categoryColors[category.categoryId],
              width: `${category.percentageOfTotal * 100}%`,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function SpendingCategoryBreakdown({
  categoryColors,
  report,
  selectedCategoryId,
  selectedIntervalKey,
  onSelectCategory,
}: SelectionProps &
  Readonly<{
    onSelectCategory: (categoryId: string) => void;
  }>) {
  const { language, t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const multipleIntervals = report.intervalCount > 1;

  return (
    <View style={styles.breakdown}>
      <View style={styles.breakdownHeader}>
        <Text numberOfLines={1} style={styles.breakdownTitle}>
          {t('reports.spendingBreakdown')}
        </Text>
      </View>
      {report.categories.length === 0 ? (
        <Text style={styles.empty}>{t('reports.emptySpending')}</Text>
      ) : (
        report.categories.map((category) => {
          const selected = category.categoryId === selectedCategoryId;
          const color = categoryColors[category.categoryId]!;
          const {
            spending: displayedSpending,
            percentage: displayedPercentage,
          } = categorySelectionMetrics(report, category, selectedIntervalKey);
          const content = (
            <>
              <View style={styles.rowHeader}>
                <View style={styles.rowCopy}>
                  <Text numberOfLines={1} style={styles.rowTitle}>
                    {categoryDisplayName(
                      {
                        id: category.categoryId,
                        name: category.categoryName,
                      },
                      t,
                    )}
                  </Text>
                  <Text style={styles.rowSubtitle}>
                    {category.groupId
                      ? groupDisplayName(
                          { id: category.groupId, name: category.groupName },
                          t,
                        )
                      : category.groupName}
                  </Text>
                </View>
                <View style={styles.rowAmountCopy}>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    numberOfLines={1}
                    style={styles.rowAmount}
                  >
                    {formatMoney(displayedSpending)}
                    {multipleIntervals ? (
                      <Text style={styles.rowAverage}>
                        {' | '}
                        {formatMoney(category.average)}/
                        {t(`reports.unit.${report.interval}`)}
                      </Text>
                    ) : null}
                  </Text>
                  <Text style={styles.percentage}>
                    {formatPercentage(displayedPercentage)}
                  </Text>
                </View>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.spendingBar,
                    {
                      backgroundColor: color,
                      width: `${Math.max(
                        displayedPercentage > 0 ? 2 : 0,
                        displayedPercentage * 100,
                      )}%`,
                    },
                  ]}
                />
              </View>
              {multipleIntervals ? (
                <View style={styles.extremes}>
                  <Text style={styles.extremeText}>
                    {t('reports.minimum', {
                      amount: formatMoney(category.lowestInterval.spending),
                      interval: compactIntervalLabel(
                        category.lowestInterval,
                        report.interval,
                        language,
                      ),
                    })}
                  </Text>
                  <Text style={[styles.extremeText, styles.maximumText]}>
                    {t('reports.maximum', {
                      amount: formatMoney(category.highestInterval.spending),
                      interval: compactIntervalLabel(
                        category.highestInterval,
                        report.interval,
                        language,
                      ),
                    })}
                  </Text>
                </View>
              ) : null}
            </>
          );

          return multipleIntervals ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={category.categoryId}
              onPress={() => onSelectCategory(category.categoryId)}
              style={({ pressed }) => [
                styles.categoryRow,
                selected && styles.categoryRowSelected,
                pressed && styles.categoryRowPressed,
              ]}
            >
              {content}
            </Pressable>
          ) : (
            <View key={category.categoryId} style={styles.categoryRow}>
              {content}
            </View>
          );
        })
      )}
    </View>
  );
}

function TemporalBreakdown({
  categoryColors,
  language,
  onSelectInterval,
  selectedCategoryId,
  selectedIntervalKey,
  report,
}: Readonly<{
  categoryColors: ReportCategoryColors;
  language: SupportedLanguage;
  onSelectInterval: (intervalKey: string) => void;
  selectedCategoryId?: string;
  selectedIntervalKey?: string;
  report: SpendingReport;
}>) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const maximum = Math.max(
    1,
    ...report.intervals.map(({ spending }) => Math.max(0, spending.cents)),
  );

  return (
    <View style={styles.intervalBreakdown}>
      <View style={styles.intervalHeader}>
        <Text numberOfLines={1} style={styles.intervalTitle}>
          {t(`reports.breakdownBy.${report.interval}`)}
        </Text>
      </View>
      <IntervalRows
        categoryColors={categoryColors}
        language={language}
        maximum={maximum}
        onSelectInterval={onSelectInterval}
        selectedCategoryId={selectedCategoryId}
        selectedIntervalKey={selectedIntervalKey}
        report={report}
      />
    </View>
  );
}

function IntervalRows({
  categoryColors,
  language,
  maximum,
  onSelectInterval,
  selectedCategoryId,
  selectedIntervalKey,
  report,
}: Readonly<{
  categoryColors: ReportCategoryColors;
  language: SupportedLanguage;
  maximum: number;
  onSelectInterval: (intervalKey: string) => void;
  selectedCategoryId?: string;
  selectedIntervalKey?: string;
  report: SpendingReport;
}>) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const intervalScrollRef = useRef<ScrollView>(null);
  const rows = report.intervals.map((item) => {
    const positiveCents = Math.max(0, item.spending.cents);
    const { spending: displayedSpending, percentage: displayedPercentage } =
      intervalSelectionMetrics(report, item, selectedCategoryId);
    const selected = item.key === selectedIntervalKey;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        key={item.key}
        onPress={() => onSelectInterval(item.key)}
        style={({ pressed }) => [
          styles.intervalRow,
          selected && styles.intervalRowSelected,
          pressed && styles.intervalRowPressed,
        ]}
      >
        <Text numberOfLines={1} style={styles.intervalLabel}>
          {compactIntervalLabel(item, report.interval, language)}
        </Text>
        <View style={styles.intervalTrack}>
          <View
            style={[
              styles.intervalFill,
              {
                width: `${(positiveCents / maximum) * 100}%`,
              },
            ]}
          >
            {item.categories.map((category) => (
              <View
                key={category.categoryId}
                style={{
                  backgroundColor:
                    selectedCategoryId &&
                    category.categoryId !== selectedCategoryId
                      ? theme.colors.border
                      : categoryColors[category.categoryId],
                  width: `${Math.max(0, category.percentageOfInterval) * 100}%`,
                }}
              />
            ))}
          </View>
        </View>
        <Text numberOfLines={1} style={styles.intervalAmount}>
          {formatMoney(displayedSpending)}
        </Text>
        <Text style={styles.intervalPercentage}>
          {formatPercentage(displayedPercentage)}
        </Text>
      </Pressable>
    );
  });

  return report.intervals.length > 5 ? (
    <ScrollView
      contentContainerStyle={styles.intervalRows}
      nestedScrollEnabled
      onContentSizeChange={() =>
        intervalScrollRef.current?.scrollToEnd({ animated: false })
      }
      ref={intervalScrollRef}
      showsVerticalScrollIndicator
      style={styles.intervalRowsScroll}
    >
      {rows}
    </ScrollView>
  ) : (
    <View style={styles.intervalRows}>{rows}</View>
  );
}

function formatPercentage(value: number) {
  return `${Math.round(value * 100)}%`;
}

function compactIntervalLabel(
  interval: Pick<SpendingIntervalExtreme, 'startDate' | 'endDate'>,
  unit: SpendingIntervalUnit,
  language: SupportedLanguage,
) {
  const start = new Date(`${interval.startDate}T12:00:00Z`);
  const end = new Date(`${interval.endDate}T12:00:00Z`);
  const month = new Intl.DateTimeFormat(language, {
    month: 'short',
    timeZone: 'UTC',
  });
  switch (unit) {
    case 'day':
      return `${start.getUTCDate()} ${month.format(start)}`;
    case 'week':
      return start.getUTCMonth() === end.getUTCMonth()
        ? `${start.getUTCDate()}–${end.getUTCDate()} ${month.format(end)}`
        : `${start.getUTCDate()} ${month.format(start)}–${end.getUTCDate()} ${month.format(end)}`;
    case 'month':
      return `${month.format(start)} ${String(start.getUTCFullYear()).slice(2)}`;
    case 'year':
      return String(start.getUTCFullYear());
  }
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    overview: { gap: 16 },
    activeFilters: {
      minHeight: 32,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 7,
    },
    periodBanner: {
      minHeight: 174,
      padding: 18,
      backgroundColor: theme.colors.primaryMuted,
      borderColor: theme.colors.primary,
      borderRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    periodRange: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
    },
    periodTotal: {
      marginTop: 12,
      color: theme.colors.text,
      fontSize: 29,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      textAlign: 'center',
    },
    periodAverage: {
      marginTop: 2,
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      textAlign: 'center',
    },
    periodComposition: {
      width: '100%',
      height: 16,
      marginTop: 18,
      backgroundColor: theme.colors.track,
      borderRadius: 8,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    intervalBreakdown: {
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 22,
      borderWidth: 1,
      gap: 10,
    },
    intervalHeader: {
      minHeight: 34,
      marginBottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    intervalTitle: {
      minWidth: 0,
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: '800',
      flex: 1,
    },
    intervalRow: {
      height: 36,
      paddingHorizontal: 8,
      borderColor: 'transparent',
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    intervalRowSelected: {
      backgroundColor: theme.colors.primaryMuted,
      borderColor: theme.colors.primary,
    },
    intervalRowPressed: { backgroundColor: theme.colors.surfacePressed },
    intervalLabel: {
      width: 72,
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    intervalTrack: {
      height: 10,
      backgroundColor: theme.colors.track,
      borderRadius: 5,
      overflow: 'hidden',
      flex: 1,
    },
    intervalFill: {
      height: '100%',
      borderRadius: 5,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    intervalRows: { gap: 8 },
    intervalRowsScroll: { maxHeight: 212 },
    intervalAmount: {
      color: theme.colors.text,
      fontSize: 11,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      textAlign: 'right',
      flexShrink: 0,
    },
    intervalPercentage: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      textAlign: 'right',
      flexShrink: 0,
    },
    breakdown: {
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 22,
      borderWidth: 1,
      gap: 10,
    },
    breakdownTitle: {
      minWidth: 0,
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '800',
      flex: 1,
    },
    breakdownHeader: {
      minHeight: 34,
      marginBottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    categoryRow: {
      paddingHorizontal: 8,
      paddingVertical: 10,
      borderColor: 'transparent',
      borderRadius: 14,
      borderWidth: 1,
      gap: 8,
    },
    categoryRowSelected: {
      backgroundColor: theme.colors.primaryMuted,
      borderColor: theme.colors.primary,
    },
    categoryRowPressed: { backgroundColor: theme.colors.surfacePressed },
    rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowCopy: { flex: 1 },
    rowTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
    rowSubtitle: { marginTop: 2, color: theme.colors.textMuted, fontSize: 11 },
    rowAmountCopy: { maxWidth: '58%', alignItems: 'flex-end' },
    rowAmount: {
      color: theme.colors.text,
      fontSize: 14,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      textAlign: 'right',
    },
    rowAverage: { color: theme.colors.textMuted, fontSize: 11 },
    percentage: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    track: {
      height: 8,
      backgroundColor: theme.colors.track,
      borderRadius: 4,
      overflow: 'hidden',
    },
    spendingBar: { height: '100%', borderRadius: 4 },
    extremes: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    extremeText: {
      flex: 1,
      color: theme.colors.textMuted,
      fontSize: 10,
      fontVariant: ['tabular-nums'],
      fontWeight: '600',
    },
    maximumText: { textAlign: 'right' },
    empty: {
      paddingVertical: 34,
      color: theme.colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
    },
  });
