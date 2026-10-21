import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type {
  SpendingInterval,
  SpendingIntervalUnit,
  SpendingReport,
} from '@/domain/services/calculate-spending-report';
import type { ReportCategoryColors } from '@/presentation/components/reports/report-category-colors';
import { FilterChip } from '@/presentation/components/common/filter-chip';
import {
  buildSpendingReportViewModel,
  type SpendingCategoryRow,
} from '@/presentation/components/reports/spending-report-view-model';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { SupportedLanguage } from '@/presentation/localization/translator';
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
  onClearCategory,
  report,
  selectedCategoryId,
  selectedIntervalKey,
  onSelectInterval,
}: SelectionProps &
  Readonly<{
    onClearCategory: () => void;
    onSelectInterval: (intervalKey: string) => void;
  }>) {
  const { language } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const view = buildSpendingReportViewModel(
    report,
    selectedIntervalKey,
    selectedCategoryId,
  );

  return (
    <View style={styles.overview}>
      <SpendingIntervalBanner
        categoryColors={categoryColors}
        language={language}
        onClearCategory={onClearCategory}
        report={report}
        view={view}
      />
      <TemporalBreakdown
        categoryColors={categoryColors}
        language={language}
        onSelectInterval={onSelectInterval}
        report={report}
        view={view}
      />
    </View>
  );
}

function SpendingIntervalBanner({
  categoryColors,
  language,
  onClearCategory,
  report,
  view,
}: Readonly<{
  categoryColors: ReportCategoryColors;
  language: SupportedLanguage;
  onClearCategory: () => void;
  report: SpendingReport;
  view: ReturnType<typeof buildSpendingReportViewModel>;
}>) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const positiveCategories = view.activeInterval.categories.filter(
    ({ spending }) => spending.cents > 0,
  );
  return (
    <View style={styles.periodBanner}>
      <View style={styles.bannerHeading}>
        <Text style={styles.periodRange}>
          {intervalLabel(view.activeInterval, report.interval, language, true)}
        </Text>
        {view.isCurrentInterval ? (
          <Text style={styles.currentBadge}>{t('reports.current')}</Text>
        ) : null}
      </View>
      {view.selectedCategory ? (
        <View style={styles.categoryFilter}>
          <FilterChip
            label={categoryDisplayName(
              {
                id: view.selectedCategory.categoryId,
                name: view.selectedCategory.categoryName,
              },
              t,
            )}
            onPress={onClearCategory}
            onRemove={onClearCategory}
          />
        </View>
      ) : null}
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.periodTotal}>
        {formatMoney(view.activeSpending)}
      </Text>
      <Text style={styles.totalCaption}>
        {t('reports.netSpending')}
        {view.isCurrentInterval
          ? ` · ${t(`reports.toDate.${report.interval}`)}`
          : ''}
      </Text>
      <View style={styles.windowSummary}>
        <Text style={styles.windowLabel}>
          {t('reports.netSpendingForPeriod', {
            period: periodPhrase(report.intervals.length, report.interval, t),
          })}
        </Text>
        <Text style={styles.windowTotal}>{formatMoney(view.windowTotal)}</Text>
        <Text style={styles.windowAverage}>
          {t('reports.averageValue', {
            amount: formatMoney(view.windowAverage),
          })}
        </Text>
      </View>
      <View
        accessibilityLabel={t('reports.selectedSpendingComposition')}
        accessibilityRole="summary"
        style={styles.periodComposition}
      >
        {positiveCategories.map((category) => (
          <View
            key={category.categoryId}
            style={{
              backgroundColor:
                view.selectedCategory &&
                category.categoryId !== view.selectedCategory.categoryId
                  ? 'transparent'
                  : categoryColors[category.categoryId],
              width: `${category.percentageOfInterval * 100}%`,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function SpendingCategoryBreakdown({
  categoryColors,
  onSelectCategory,
  report,
  selectedCategoryId,
  selectedIntervalKey,
}: SelectionProps &
  Readonly<{ onSelectCategory: (categoryId: string) => void }>) {
  const { language, t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const view = buildSpendingReportViewModel(
    report,
    selectedIntervalKey,
    selectedCategoryId,
  );
  const hasCategories =
    view.spendingCategories.length > 0 ||
    view.netCreditCategories.length > 0 ||
    view.zeroNetCategories.length > 0 ||
    view.noSpendingCategories.length > 0;

  return (
    <View style={styles.breakdown}>
      <View style={styles.breakdownHeader}>
        <Text numberOfLines={1} style={styles.breakdownTitle}>
          {t('reports.spendingBreakdown')}
        </Text>
        <Text numberOfLines={1} style={styles.breakdownPeriod}>
          {intervalLabel(view.activeInterval, report.interval, language, true)}
        </Text>
      </View>
      {!hasCategories ? (
        <Text style={styles.empty}>{t('reports.emptySelectedInterval')}</Text>
      ) : (
        <>
          {view.spendingCategories.map((row) => (
            <CategoryRow
              color={categoryColors[row.category.categoryId]!}
              key={row.category.categoryId}
              kind="spending"
              onPress={() => onSelectCategory(row.category.categoryId)}
              row={row}
              selected={row.category.categoryId === selectedCategoryId}
            />
          ))}
          {view.netCreditCategories.length > 0 ? (
            <View style={styles.creditGroup}>
              <Text style={styles.creditGroupTitle}>
                {t('reports.netCredits')}
              </Text>
              {view.netCreditCategories.map((row) => (
                <CategoryRow
                  color={categoryColors[row.category.categoryId]!}
                  key={row.category.categoryId}
                  kind="credit"
                  onPress={() => onSelectCategory(row.category.categoryId)}
                  row={row}
                  selected={row.category.categoryId === selectedCategoryId}
                />
              ))}
            </View>
          ) : null}
          {view.zeroNetCategories.length > 0 ? (
            <View style={styles.creditGroup}>
              <Text style={styles.creditGroupTitle}>
                {t('reports.zeroNetActivity')}
              </Text>
              {view.zeroNetCategories.map((row) => (
                <CategoryRow
                  color={categoryColors[row.category.categoryId]!}
                  key={row.category.categoryId}
                  kind="zero"
                  onPress={() => onSelectCategory(row.category.categoryId)}
                  row={row}
                  selected={row.category.categoryId === selectedCategoryId}
                />
              ))}
            </View>
          ) : null}
          {view.noSpendingCategories.length > 0 ? (
            <View style={styles.creditGroup}>
              <Text style={styles.creditGroupTitle}>
                {t('reports.noSpendingInPeriod')}
              </Text>
              {view.noSpendingCategories.map((row) => (
                <CategoryRow
                  color={categoryColors[row.category.categoryId]!}
                  key={row.category.categoryId}
                  kind="zero"
                  onPress={() => onSelectCategory(row.category.categoryId)}
                  row={row}
                  selected={row.category.categoryId === selectedCategoryId}
                />
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function CategoryRow({
  color,
  kind,
  onPress,
  row,
  selected,
}: Readonly<{
  color: string;
  kind: 'spending' | 'credit' | 'zero';
  onPress: () => void;
  row: SpendingCategoryRow;
  selected: boolean;
}>) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryRow,
        selected && styles.categoryRowSelected,
        pressed && styles.categoryRowPressed,
      ]}
    >
      <View style={styles.rowHeader}>
        <View style={styles.rowCopy}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {categoryDisplayName(
              { id: row.category.categoryId, name: row.category.categoryName },
              t,
            )}
          </Text>
          <Text style={styles.rowSubtitle}>
            {row.category.groupId
              ? groupDisplayName(
                  {
                    id: row.category.groupId,
                    name: row.category.groupName,
                  },
                  t,
                )
              : row.category.groupName}
          </Text>
        </View>
        <View style={styles.rowAmountCopy}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={[styles.rowAmount, kind === 'credit' && styles.creditAmount]}
          >
            {formatMoney(row.spending)}
          </Text>
          <Text style={styles.percentage}>
            {kind === 'credit'
              ? t('reports.netCredit')
              : formatPercentage(row.percentageOfInterval)}
          </Text>
        </View>
      </View>
      {kind !== 'credit' ? (
        <View style={styles.track}>
          <View
            style={[
              styles.spendingBar,
              {
                backgroundColor: color,
                width: `${row.percentageOfInterval * 100}%`,
              },
            ]}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

function TemporalBreakdown({
  categoryColors,
  language,
  onSelectInterval,
  report,
  view,
}: Readonly<{
  categoryColors: ReportCategoryColors;
  language: SupportedLanguage;
  onSelectInterval: (intervalKey: string) => void;
  report: SpendingReport;
  view: ReturnType<typeof buildSpendingReportViewModel>;
}>) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const rowsScrollRef = useRef<ScrollView>(null);
  const rows = view.intervalRows.map(
    ({ interval, percentageOfWindow, spending }) => {
      const selected = interval.key === view.activeInterval.key;
      const current = interval.key === view.currentIntervalKey;
      const positiveCents = Math.max(0, interval.spending.cents);
      return (
        <Pressable
          accessibilityLabel={t(
            spending.cents < 0
              ? 'reports.creditIntervalSummary'
              : 'reports.intervalSummary',
            {
              interval: intervalLabel(
                interval,
                report.interval,
                language,
                true,
              ),
              amount: formatMoney(spending),
              percentage: formatPercentage(percentageOfWindow),
            },
          )}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          key={interval.key}
          onPress={() => onSelectInterval(interval.key)}
          style={({ pressed }) => [
            styles.intervalRow,
            selected && styles.intervalRowSelected,
            pressed && styles.intervalRowPressed,
          ]}
        >
          <View style={styles.intervalRowHeader}>
            <View style={styles.intervalLabelGroup}>
              <Text numberOfLines={1} style={styles.intervalLabel}>
                {intervalLabel(interval, report.interval, language)}
              </Text>
              {current ? (
                <Text style={styles.rowCurrentBadge}>
                  {t('reports.current')}
                </Text>
              ) : null}
            </View>
            <View style={styles.intervalAmountGroup}>
              <Text
                numberOfLines={1}
                style={[
                  styles.intervalAmount,
                  spending.cents < 0 && styles.creditAmount,
                ]}
              >
                {formatMoney(spending)}
              </Text>
              <Text style={styles.intervalPercentage}>
                {spending.cents < 0
                  ? t('reports.netCredit')
                  : t('reports.percentageOfPeriod', {
                      percentage: formatPercentage(percentageOfWindow),
                    })}
              </Text>
            </View>
          </View>
          <View style={styles.intervalTrack}>
            <View
              style={[
                styles.intervalFill,
                {
                  width: `${(positiveCents / view.maximumIntervalSpendingCents) * 100}%`,
                },
              ]}
            >
              {interval.categories
                .filter(({ spending }) => spending.cents > 0)
                .map((category) => (
                  <View
                    key={category.categoryId}
                    style={{
                      backgroundColor:
                        view.selectedCategory &&
                        category.categoryId !== view.selectedCategory.categoryId
                          ? 'transparent'
                          : categoryColors[category.categoryId],
                      width: `${category.percentageOfInterval * 100}%`,
                    }}
                  />
                ))}
            </View>
          </View>
        </Pressable>
      );
    },
  );

  return (
    <View style={styles.intervalBreakdown}>
      <View style={styles.intervalHeader}>
        <Text numberOfLines={1} style={styles.intervalTitle}>
          {t(`reports.breakdownBy.${report.interval}`)}
        </Text>
        {!view.isCurrentInterval ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              onSelectInterval(view.currentIntervalKey);
              rowsScrollRef.current?.scrollTo({ animated: true, y: 0 });
            }}
            style={({ pressed }) => [
              styles.currentAction,
              pressed && styles.currentActionPressed,
            ]}
          >
            <MaterialCommunityIcons
              color={theme.colors.primary}
              name="calendar-today"
              size={13}
            />
            <Text style={styles.currentActionText}>
              {t('reports.goToCurrent')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {view.intervalRows.length > 3 ? (
        <ScrollView
          contentContainerStyle={styles.intervalRows}
          nestedScrollEnabled
          ref={rowsScrollRef}
          showsVerticalScrollIndicator
          style={styles.intervalRowsScroll}
        >
          {rows}
        </ScrollView>
      ) : (
        <View style={styles.intervalRows}>{rows}</View>
      )}
    </View>
  );
}

function formatPercentage(value: number) {
  return `${Math.round(value * 100)}%`;
}

function periodPhrase(
  count: number,
  interval: SpendingIntervalUnit,
  t: ReturnType<typeof useTranslation>['t'],
) {
  return count === 1
    ? t(`reports.lastOne.${interval}`)
    : t(`reports.last.${interval}`, { count });
}

function intervalLabel(
  interval: Pick<SpendingInterval, 'startDate' | 'endDate'>,
  unit: SpendingIntervalUnit,
  language: SupportedLanguage,
  fullYear = false,
) {
  const start = new Date(`${interval.startDate}T12:00:00Z`);
  const end = new Date(`${interval.endDate}T12:00:00Z`);
  const month = new Intl.DateTimeFormat(language, {
    month: 'short',
    timeZone: 'UTC',
  });
  switch (unit) {
    case 'day':
      return new Intl.DateTimeFormat(language, {
        day: 'numeric',
        month: 'short',
        ...(fullYear ? { year: 'numeric' as const } : {}),
        timeZone: 'UTC',
      }).format(start);
    case 'week': {
      const year = fullYear ? ` ${end.getUTCFullYear()}` : '';
      return start.getUTCMonth() === end.getUTCMonth()
        ? `${start.getUTCDate()}–${end.getUTCDate()} ${month.format(end)}${year}`
        : `${start.getUTCDate()} ${month.format(start)}–${end.getUTCDate()} ${month.format(end)}${year}`;
    }
    case 'month':
      return new Intl.DateTimeFormat(language, {
        month: 'short',
        year: fullYear ? 'numeric' : '2-digit',
        timeZone: 'UTC',
      }).format(start);
    case 'year':
      return String(start.getUTCFullYear());
  }
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    overview: { gap: 16 },
    periodBanner: {
      minHeight: 184,
      padding: 16,
      backgroundColor: theme.colors.primaryMuted,
      borderColor: theme.colors.primary,
      borderRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bannerHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    periodRange: {
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: '800',
      textAlign: 'center',
    },
    currentBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      color: theme.colors.primary,
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      fontSize: 9,
      fontWeight: '800',
      overflow: 'hidden',
    },
    categoryFilter: { maxWidth: '100%', marginTop: 6 },
    periodTotal: {
      marginTop: 6,
      color: theme.colors.text,
      fontSize: 28,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      textAlign: 'center',
    },
    totalCaption: {
      marginTop: 1,
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
    },
    windowSummary: { marginTop: 10, alignItems: 'center' },
    windowLabel: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
      textAlign: 'center',
    },
    windowTotal: {
      marginTop: 1,
      color: theme.colors.text,
      fontSize: 16,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      textAlign: 'center',
    },
    windowAverage: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      textAlign: 'center',
    },
    periodComposition: {
      width: '100%',
      height: 14,
      marginTop: 11,
      backgroundColor: theme.colors.track,
      borderRadius: 7,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    intervalBreakdown: {
      padding: 14,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 22,
      borderWidth: 1,
      gap: 10,
    },
    intervalHeader: {
      minHeight: 38,
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
    currentAction: {
      height: 28,
      paddingHorizontal: 8,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    currentActionPressed: { backgroundColor: theme.colors.surfacePressed },
    currentActionText: {
      color: theme.colors.primary,
      fontSize: 10,
      fontWeight: '800',
    },
    intervalRows: { gap: 8 },
    intervalRowsScroll: { maxHeight: 202 },
    intervalRow: {
      minHeight: 62,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderColor: 'transparent',
      borderRadius: 11,
      borderWidth: 1,
      justifyContent: 'center',
      gap: 6,
    },
    intervalRowSelected: {
      backgroundColor: theme.colors.primaryMuted,
      borderColor: theme.colors.primary,
    },
    intervalRowPressed: { backgroundColor: theme.colors.surfacePressed },
    intervalRowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    intervalLabelGroup: {
      minWidth: 0,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    intervalLabel: {
      minWidth: 0,
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: '800',
      flexShrink: 1,
    },
    rowCurrentBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      color: theme.colors.primary,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      fontSize: 8,
      fontWeight: '800',
      overflow: 'hidden',
    },
    intervalAmountGroup: { alignItems: 'flex-end', flexShrink: 0 },
    intervalAmount: {
      color: theme.colors.text,
      fontSize: 13,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      textAlign: 'right',
    },
    intervalPercentage: {
      color: theme.colors.textMuted,
      fontSize: 9,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      textAlign: 'right',
    },
    intervalTrack: {
      width: '100%',
      height: 9,
      backgroundColor: theme.colors.track,
      borderRadius: 5,
      overflow: 'hidden',
    },
    intervalFill: {
      height: '100%',
      borderRadius: 5,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    breakdown: {
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 22,
      borderWidth: 1,
      gap: 10,
    },
    breakdownHeader: {
      minHeight: 34,
      marginBottom: 4,
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
    },
    breakdownTitle: {
      minWidth: 0,
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '800',
      flex: 1,
    },
    breakdownPeriod: {
      maxWidth: '42%',
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'right',
    },
    categoryRow: {
      paddingHorizontal: 8,
      paddingVertical: 10,
      borderColor: 'transparent',
      borderRadius: 12,
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
    rowAmountCopy: { maxWidth: '48%', alignItems: 'flex-end' },
    rowAmount: {
      color: theme.colors.text,
      fontSize: 14,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      textAlign: 'right',
    },
    creditAmount: { color: theme.colors.positive },
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
    creditGroup: {
      marginTop: 6,
      paddingTop: 12,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: 2,
    },
    creditGroupTitle: {
      paddingHorizontal: 8,
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },
    empty: {
      paddingVertical: 34,
      color: theme.colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
    },
  });
