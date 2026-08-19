import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
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

import type {
  ReportMonth,
  ReportsSnapshot,
} from '@/domain/services/calculate-reports';
import { Money } from '@/domain/value-objects/money';
import { OverflowMenu } from '@/presentation/components/common/overflow-menu';
import { useReports } from '@/presentation/hooks/use-reports';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { SupportedLanguage } from '@/presentation/localization/translator';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { formatMoney } from '@/presentation/utils/money';
import {
  categoryDisplayName,
  groupDisplayName,
} from '@/presentation/utils/category-name';

type ReportKind = 'spending' | 'income' | 'netWorth';

function currentMonth(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string, language: SupportedLanguage): string {
  const [year, number] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(language, { month: 'short' }).format(
    new Date(year ?? 0, (number ?? 1) - 1, 1),
  );
}

export function ReportsScreen() {
  const [throughMonth] = useState(currentMonth);
  const { reports, error, loading, refresh } = useReports(throughMonth);
  const [kind, setKind] = useState<ReportKind>('spending');
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('reports.title')}</Text>
          <Text style={styles.period}>{t('reports.lastSixMonths')}</Text>
        </View>
        <OverflowMenu />
      </View>
      <View style={styles.tabs}>
        <ReportTab
          active={kind === 'spending'}
          icon="chart-donut"
          label={t('reports.spending')}
          onPress={() => setKind('spending')}
        />
        <ReportTab
          active={kind === 'income'}
          icon="chart-bar"
          label={t('reports.income')}
          onPress={() => setKind('income')}
        />
        <ReportTab
          active={kind === 'netWorth'}
          icon="chart-line"
          label={t('reports.netWorth')}
          onPress={() => setKind('netWorth')}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => void refresh()}
            refreshing={loading && reports !== null}
            tintColor={theme.colors.primary}
          />
        }
      >
        {loading && !reports ? (
          <ActivityIndicator color={theme.colors.primary} size="large" />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {reports && kind === 'spending' ? (
          <SpendingReport reports={reports} />
        ) : null}
        {reports && kind === 'income' ? (
          <MonthlyReport kind="income" months={reports.months} />
        ) : null}
        {reports && kind === 'netWorth' ? (
          <MonthlyReport kind="netWorth" months={reports.months} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReportTab({
  active,
  icon,
  label,
  onPress,
}: Readonly<{
  active: boolean;
  icon: 'chart-donut' | 'chart-bar' | 'chart-line';
  label: string;
  onPress: () => void;
}>) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <MaterialCommunityIcons
        color={active ? theme.colors.onPrimary : theme.colors.textSecondary}
        name={icon}
        size={18}
      />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SpendingReport({ reports }: Readonly<{ reports: ReportsSnapshot }>) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  return (
    <>
      <Hero
        amount={formatMoney(reports.spending.total)}
        caption={t('reports.monthlyAverage', {
          amount: formatMoney(reports.spending.monthlyAverage),
        })}
        eyebrow={t('reports.totalSpending')}
      />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('reports.spendingBreakdown')}</Text>
        {reports.spending.categories.length === 0 ? (
          <Text style={styles.empty}>{t('reports.emptySpending')}</Text>
        ) : (
          reports.spending.categories.map((category) => (
            <View key={category.categoryId} style={styles.categoryRow}>
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
                  <Text style={styles.rowAmount}>
                    {formatMoney(category.spending)}
                  </Text>
                  <Text style={styles.percentage}>
                    {Math.round(category.percentage * 100)}%
                  </Text>
                </View>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.spendingBar,
                    { width: `${Math.max(2, category.percentage * 100)}%` },
                  ]}
                />
              </View>
            </View>
          ))
        )}
      </View>
    </>
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
      <Hero
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

function Hero({
  amount,
  caption,
  eyebrow,
  negative = false,
}: Readonly<{
  amount: string;
  caption: string;
  eyebrow: string;
  negative?: boolean;
}>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.heroCard}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={[styles.heroAmount, negative && styles.heroNegative]}>
        {amount}
      </Text>
      <Text style={styles.heroCaption}>{caption}</Text>
    </View>
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

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      minHeight: 78,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
    period: {
      marginTop: 2,
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    tabs: {
      marginHorizontal: 20,
      padding: 4,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 18,
      flexDirection: 'row',
      gap: 4,
    },
    tab: {
      minHeight: 46,
      paddingHorizontal: 8,
      borderRadius: 14,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    tabActive: { backgroundColor: theme.colors.primary },
    tabText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    tabTextActive: { color: theme.colors.onPrimary },
    content: {
      width: '100%',
      maxWidth: 820,
      padding: 20,
      paddingBottom: 36,
      alignSelf: 'center',
      gap: 16,
    },
    heroCard: {
      minHeight: 154,
      padding: 24,
      backgroundColor: theme.colors.primary,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eyebrow: {
      color: theme.colors.onPrimary,
      opacity: 0.78,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.1,
    },
    heroAmount: {
      marginTop: 8,
      color: theme.colors.onPrimary,
      fontSize: 34,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    heroNegative: { color: theme.colors.negativeMuted },
    heroCaption: {
      marginTop: 4,
      color: theme.colors.onPrimary,
      opacity: 0.78,
      fontSize: 13,
      fontWeight: '600',
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
    categoryRow: { paddingTop: 3, gap: 8 },
    rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowCopy: { flex: 1 },
    rowTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
    rowSubtitle: { marginTop: 2, color: theme.colors.textMuted, fontSize: 11 },
    rowAmountCopy: { alignItems: 'flex-end' },
    rowAmount: {
      color: theme.colors.text,
      fontSize: 14,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
    },
    percentage: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
    },
    track: {
      height: 8,
      backgroundColor: theme.colors.track,
      borderRadius: 4,
      overflow: 'hidden',
    },
    spendingBar: {
      height: '100%',
      backgroundColor: theme.colors.positive,
      borderRadius: 4,
    },
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
    empty: {
      paddingVertical: 34,
      color: theme.colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
    },
    error: {
      padding: 14,
      color: theme.colors.negative,
      backgroundColor: theme.colors.negativeMuted,
      borderRadius: 12,
    },
  });
