import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ReportMonth } from '@/domain/services/calculate-reports';
import type { SpendingIntervalUnit } from '@/domain/services/calculate-spending-report';
import { Money } from '@/domain/value-objects/money';
import { OverflowMenu } from '@/presentation/components/common/overflow-menu';
import { SelectionModal } from '@/presentation/components/common/selection-modal';
import { ReportHero } from '@/presentation/components/reports/report-hero';
import { createReportCategoryColors } from '@/presentation/components/reports/report-category-colors';
import {
  SpendingCategoryBreakdown,
  SpendingReportOverview,
} from '@/presentation/components/reports/spending-report-view';
import { useReports } from '@/presentation/hooks/use-reports';
import { useTranslation } from '@/presentation/localization/localization-provider';
import {
  MAIN_SCREEN_HEADER_HEIGHT,
  MAIN_SCREEN_HORIZONTAL_PADDING,
} from '@/presentation/layout/main-screen-layout';
import type { SupportedLanguage } from '@/presentation/localization/translator';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { formatMoney } from '@/presentation/utils/money';

type ReportKind = 'spending' | 'income' | 'netWorth';
type ReportSelector = 'report' | 'interval' | 'period' | null;

const INTERVAL_COUNTS: Readonly<
  Record<SpendingIntervalUnit, readonly number[]>
> = {
  day: [7, 14, 30, 90],
  week: [4, 8, 12, 26],
  month: [3, 6, 12],
  year: [2, 3, 4],
};

const DEFAULT_INTERVAL_COUNT: Readonly<Record<SpendingIntervalUnit, number>> = {
  day: 14,
  week: 8,
  month: 6,
  year: 3,
};

function currentDate(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthLabel(month: string, language: SupportedLanguage): string {
  const [year, number] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(language, { month: 'short' }).format(
    new Date(year ?? 0, (number ?? 1) - 1, 1),
  );
}

export function ReportsScreen() {
  const [throughDate] = useState(currentDate);
  const [kind, setKind] = useState<ReportKind>('spending');
  const [spendingInterval, setSpendingInterval] =
    useState<SpendingIntervalUnit>('month');
  const [spendingIntervalCount, setSpendingIntervalCount] = useState(6);
  const [selector, setSelector] = useState<ReportSelector>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();
  const [selectedIntervalKey, setSelectedIntervalKey] = useState<string>();
  const { reports, error, loading, refresh } = useReports(
    throughDate,
    spendingInterval,
    spendingIntervalCount,
  );
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const selectedSpendingReports =
    reports?.spending.interval === spendingInterval &&
    reports.spending.intervalCount === spendingIntervalCount
      ? reports
      : null;

  const effectiveSelectedCategoryId =
    spendingIntervalCount > 1 &&
    selectedSpendingReports?.spending.categories.some(
      ({ categoryId }) => categoryId === selectedCategoryId,
    )
      ? selectedCategoryId
      : undefined;
  const effectiveSelectedIntervalKey =
    spendingIntervalCount > 1 &&
    selectedSpendingReports?.spending.intervals.some(
      ({ key }) => key === selectedIntervalKey,
    )
      ? selectedIntervalKey
      : undefined;
  const categoryColors = useMemo(
    () =>
      createReportCategoryColors(
        selectedSpendingReports?.spending.categories.map(
          ({ categoryId }) => categoryId,
        ) ?? [],
        theme.dark,
      ),
    [selectedSpendingReports, theme.dark],
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.title}>
            {t('reports.title')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSelector('report')}
            style={({ pressed }) => [
              styles.reportKindSelector,
              pressed && styles.reportKindSelectorPressed,
            ]}
          >
            <Text numberOfLines={1} style={styles.reportKindSelectorText}>
              {t(`reports.${kind}`)}
            </Text>
            <MaterialCommunityIcons
              color={theme.colors.primary}
              name="chevron-down-circle"
              size={21}
            />
          </Pressable>
        </View>
        <View style={styles.headerActions}>
          <OverflowMenu />
        </View>
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl
            onRefresh={() => void refresh()}
            refreshing={loading && reports !== null}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.content}>
          {kind === 'spending' ? (
            <>
              <View style={styles.reportSelectors}>
                <ReportSelectorButton
                  label={intervalLabel(spendingInterval, t)}
                  onPress={() => setSelector('interval')}
                />
                <ReportSelectorButton
                  label={periodLabel(spendingIntervalCount, t)}
                  onPress={() => setSelector('period')}
                />
              </View>
              {selectedSpendingReports ? (
                <SpendingReportOverview
                  categoryColors={categoryColors}
                  onClearCategory={() => setSelectedCategoryId(undefined)}
                  onClearInterval={() => setSelectedIntervalKey(undefined)}
                  onSelectInterval={(intervalKey) =>
                    setSelectedIntervalKey((current) =>
                      current === intervalKey ? undefined : intervalKey,
                    )
                  }
                  report={selectedSpendingReports.spending}
                  selectedCategoryId={effectiveSelectedCategoryId}
                  selectedIntervalKey={effectiveSelectedIntervalKey}
                />
              ) : (
                <View style={styles.overviewLoading}>
                  {loading ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : null}
                </View>
              )}
            </>
          ) : null}
          {loading && kind !== 'spending' && !reports ? (
            <ActivityIndicator color={theme.colors.primary} size="large" />
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {selectedSpendingReports && kind === 'spending' ? (
            <SpendingCategoryBreakdown
              categoryColors={categoryColors}
              onSelectCategory={(categoryId) =>
                setSelectedCategoryId((current) =>
                  current === categoryId ? undefined : categoryId,
                )
              }
              report={selectedSpendingReports.spending}
              selectedCategoryId={effectiveSelectedCategoryId}
              selectedIntervalKey={effectiveSelectedIntervalKey}
            />
          ) : null}
          {reports && kind === 'income' ? (
            <MonthlyReport kind="income" months={reports.months} />
          ) : null}
          {reports && kind === 'netWorth' ? (
            <MonthlyReport kind="netWorth" months={reports.months} />
          ) : null}
        </View>
      </ScrollView>

      {selector === 'report' ? (
        <SelectionModal
          onDismiss={() => setSelector(null)}
          onSelect={(value) => {
            setKind(value);
            setSelector(null);
          }}
          options={(['spending', 'income', 'netWorth'] as const).map(
            (value) => ({ value, label: t(`reports.${value}`) }),
          )}
          placement="center"
          selectedValue={kind}
          title={t('reports.title')}
        />
      ) : null}
      {selector === 'interval' ? (
        <SelectionModal
          onDismiss={() => setSelector(null)}
          onSelect={(value) => {
            setSelectedCategoryId(undefined);
            setSelectedIntervalKey(undefined);
            if (value !== spendingInterval) {
              setSpendingIntervalCount(DEFAULT_INTERVAL_COUNT[value]);
            }
            setSpendingInterval(value);
          }}
          options={(['day', 'week', 'month', 'year'] as const).map((value) => ({
            value,
            label: intervalLabel(value, t),
          }))}
          placement="center"
          selectedValue={spendingInterval}
          title={t('reports.interval')}
        />
      ) : null}
      {selector === 'period' ? (
        <SelectionModal
          onDismiss={() => setSelector(null)}
          onSelect={(value) => {
            setSelectedCategoryId(undefined);
            setSelectedIntervalKey(undefined);
            setSpendingIntervalCount(Number(value));
          }}
          options={INTERVAL_COUNTS[spendingInterval].map((count) => ({
            value: String(count),
            label: periodLabel(count, t),
          }))}
          placement="center"
          selectedValue={String(spendingIntervalCount)}
          title={t('reports.period')}
        />
      ) : null}
    </SafeAreaView>
  );
}

function ReportSelectorButton({
  label,
  onPress,
}: Readonly<{ label: string; onPress: () => void }>) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.reportSelector,
        pressed && styles.reportSelectorPressed,
      ]}
    >
      <Text numberOfLines={1} style={styles.reportSelectorText}>
        {label}
      </Text>
      <MaterialCommunityIcons
        color={theme.colors.primary}
        name="chevron-down"
        size={21}
      />
    </Pressable>
  );
}

function MonthlyReport({
  kind,
  months,
}: Readonly<{
  kind: 'income' | 'netWorth';
  months: readonly ReportMonth[];
}>) {
  const { language, t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const incomeReport = kind === 'income';
  const maximum = Math.max(
    1,
    ...months.flatMap((month) =>
      incomeReport
        ? [month.income.cents, month.spending.cents]
        : [month.assets.cents, month.debt.cents],
    ),
  );
  const netCents = incomeReport
    ? months.reduce((sum, month) => sum + month.netIncome.cents, 0)
    : (months.at(-1)?.netWorth.cents ?? 0);
  const firstLabel = incomeReport ? t('reports.income') : t('reports.assets');
  const secondLabel = incomeReport ? t('reports.spending') : t('reports.debt');

  return (
    <>
      <ReportHero
        amount={formatMoney(Money.fromCents(netCents))}
        caption={
          incomeReport
            ? t('reports.incomeMinusSpending')
            : t('reports.assetsMinusDebt')
        }
        eyebrow={
          incomeReport ? t('reports.netIncome') : t('reports.netWorthUpper')
        }
        negative={netCents < 0}
      />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {incomeReport
            ? t('reports.incomeVsSpending')
            : t('reports.netWorthTrend')}
        </Text>
        <View style={styles.legend}>
          <Legend color={theme.colors.positive} label={firstLabel} />
          <Legend color={theme.colors.negative} label={secondLabel} />
        </View>
        {months.map((month) => {
          const first = incomeReport ? month.income.cents : month.assets.cents;
          const second = incomeReport ? month.spending.cents : month.debt.cents;
          const net = incomeReport ? month.netIncome : month.netWorth;
          return (
            <View key={month.month} style={styles.monthRow}>
              <Text style={styles.monthLabel}>
                {monthLabel(month.month, language)}
              </Text>
              <View style={styles.monthBars}>
                <MetricBar
                  color={theme.colors.positive}
                  maximum={maximum}
                  value={first}
                />
                <MetricBar
                  color={theme.colors.negative}
                  maximum={maximum}
                  value={second}
                />
              </View>
              <Text style={[styles.monthNet, net.cents < 0 && styles.negative]}>
                {formatMoney(net)}
              </Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

function MetricBar({
  color,
  maximum,
  value,
}: Readonly<{ color: string; maximum: number; value: number }>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.metricTrack}>
      <View
        style={[
          styles.metricFill,
          {
            backgroundColor: color,
            width: `${Math.max(0, Math.min(100, (value / maximum) * 100))}%`,
          },
        ]}
      />
    </View>
  );
}

function Legend({ color, label }: Readonly<{ color: string; label: string }>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function intervalLabel(
  interval: SpendingIntervalUnit,
  t: ReturnType<typeof useTranslation>['t'],
) {
  return t(`reports.interval.${interval}`);
}

function periodLabel(count: number, t: ReturnType<typeof useTranslation>['t']) {
  return t('reports.lastIntervals', { count });
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      minHeight: MAIN_SCREEN_HEADER_HEIGHT,
      paddingHorizontal: MAIN_SCREEN_HORIZONTAL_PADDING,
      backgroundColor: theme.colors.background,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      color: theme.colors.text,
      fontSize: 24,
      fontWeight: '700',
      letterSpacing: -0.6,
    },
    headerCopy: {
      minWidth: 0,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    reportKindSelector: {
      minHeight: 38,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      flexShrink: 1,
    },
    reportKindSelectorPressed: {
      backgroundColor: theme.colors.surfacePressed,
    },
    reportKindSelectorText: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '700',
      flexShrink: 1,
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    reportSelectors: {
      flexDirection: 'row',
      gap: 10,
    },
    overviewLoading: {
      minHeight: 132,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reportSelector: {
      minWidth: 0,
      minHeight: 48,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 15,
      borderWidth: 1,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    reportSelectorPressed: { backgroundColor: theme.colors.surfacePressed },
    reportSelectorText: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    content: {
      width: '100%',
      maxWidth: 820,
      padding: 20,
      paddingBottom: 36,
      alignSelf: 'center',
      gap: 16,
    },
    card: {
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 22,
      borderWidth: 1,
      gap: 14,
    },
    cardTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
    legend: { flexDirection: 'row', gap: 18 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 9, height: 9, borderRadius: 5 },
    legendText: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    monthRow: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    monthLabel: {
      width: 30,
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    monthBars: { flex: 1, gap: 4 },
    metricTrack: {
      height: 7,
      backgroundColor: theme.colors.track,
      borderRadius: 4,
      overflow: 'hidden',
    },
    metricFill: { height: '100%', borderRadius: 4 },
    monthNet: {
      width: 92,
      color: theme.colors.positive,
      fontSize: 12,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      textAlign: 'right',
    },
    negative: { color: theme.colors.negative },
    error: {
      padding: 14,
      color: theme.colors.negative,
      backgroundColor: theme.colors.negativeMuted,
      borderRadius: 12,
    },
  });
