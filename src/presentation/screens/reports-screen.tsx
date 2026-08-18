import { MaterialCommunityIcons } from '@expo/vector-icons';
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

import type {
  ReportMonth,
  ReportsSnapshot,
} from '@/domain/services/calculate-reports';
import { Money } from '@/domain/value-objects/money';
import { OverflowMenu } from '@/presentation/components/common/overflow-menu';
import { useReports } from '@/presentation/hooks/use-reports';
import { formatMoney } from '@/presentation/utils/money';

type ReportKind = 'spending' | 'income' | 'netWorth';

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });

function currentMonth(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string): string {
  const [year, number] = month.split('-').map(Number);
  return monthFormatter.format(new Date(year ?? 0, (number ?? 1) - 1, 1));
}

export function ReportsScreen() {
  const throughMonth = useMemo(() => currentMonth(), []);
  const { reports, error, loading, refresh } = useReports(throughMonth);
  const [kind, setKind] = useState<ReportKind>('spending');

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Reports</Text>
          <Text style={styles.period}>Last 6 months</Text>
        </View>
        <OverflowMenu />
      </View>
      <View style={styles.tabs}>
        <ReportTab
          active={kind === 'spending'}
          icon="chart-donut"
          label="Spending"
          onPress={() => setKind('spending')}
        />
        <ReportTab
          active={kind === 'income'}
          icon="chart-bar"
          label="Income"
          onPress={() => setKind('income')}
        />
        <ReportTab
          active={kind === 'netWorth'}
          icon="chart-line"
          label="Net worth"
          onPress={() => setKind('netWorth')}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => void refresh()}
            refreshing={loading && reports !== null}
          />
        }
      >
        {loading && !reports ? (
          <ActivityIndicator color="#294d36" size="large" />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {reports && kind === 'spending' ? (
          <SpendingReport reports={reports} />
        ) : null}
        {reports && kind === 'income' ? (
          <IncomeReport months={reports.months} />
        ) : null}
        {reports && kind === 'netWorth' ? (
          <NetWorthReport months={reports.months} />
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
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <MaterialCommunityIcons
        color={active ? '#ffffff' : '#536158'}
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
  return (
    <>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>TOTAL SPENDING</Text>
        <Text style={styles.heroAmount}>
          {formatMoney(reports.spending.total)}
        </Text>
        <Text style={styles.heroCaption}>
          {formatMoney(reports.spending.monthlyAverage)} monthly average
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Spending breakdown</Text>
        {reports.spending.categories.length === 0 ? (
          <EmptyReport message="Categorised spending will appear here." />
        ) : (
          reports.spending.categories.map((category) => (
            <View key={category.categoryId} style={styles.categoryRow}>
              <View style={styles.rowHeader}>
                <View style={styles.rowCopy}>
                  <Text numberOfLines={1} style={styles.rowTitle}>
                    {category.categoryName}
                  </Text>
                  <Text style={styles.rowSubtitle}>{category.groupName}</Text>
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

function IncomeReport({
  months,
}: Readonly<{ months: readonly ReportMonth[] }>) {
  const maximum = Math.max(
    1,
    ...months.flatMap((month) => [month.income.cents, month.spending.cents]),
  );
  const totalNet = months.reduce(
    (sum, month) => sum + month.netIncome.cents,
    0,
  );

  return (
    <>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>NET INCOME</Text>
        <Text style={[styles.heroAmount, totalNet < 0 && styles.negative]}>
          {formatMoney(Money.fromCents(totalNet))}
        </Text>
        <Text style={styles.heroCaption}>Income minus spending</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Income vs spending</Text>
        <View style={styles.legend}>
          <Legend color="#4d9461" label="Income" />
          <Legend color="#de776d" label="Spending" />
        </View>
        {months.map((month) => (
          <View key={month.month} style={styles.monthRow}>
            <Text style={styles.monthLabel}>{monthLabel(month.month)}</Text>
            <View style={styles.monthBars}>
              <MetricBar
                color="#4d9461"
                maximum={maximum}
                value={month.income.cents}
              />
              <MetricBar
                color="#de776d"
                maximum={maximum}
                value={month.spending.cents}
              />
            </View>
            <Text
              style={[
                styles.monthNet,
                month.netIncome.cents < 0 && styles.negative,
              ]}
            >
              {formatMoney(month.netIncome)}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

function NetWorthReport({
  months,
}: Readonly<{ months: readonly ReportMonth[] }>) {
  const latest = months.at(-1);
  const maximum = Math.max(
    1,
    ...months.flatMap((month) => [month.assets.cents, month.debt.cents]),
  );

  return (
    <>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>NET WORTH</Text>
        <Text
          style={[
            styles.heroAmount,
            (latest?.netWorth.cents ?? 0) < 0 && styles.negative,
          ]}
        >
          {latest ? formatMoney(latest.netWorth) : '—'}
        </Text>
        <Text style={styles.heroCaption}>Assets minus debt</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Net worth trend</Text>
        <View style={styles.legend}>
          <Legend color="#528f68" label="Assets" />
          <Legend color="#d86b63" label="Debt" />
        </View>
        {months.map((month) => (
          <View key={month.month} style={styles.monthRow}>
            <Text style={styles.monthLabel}>{monthLabel(month.month)}</Text>
            <View style={styles.monthBars}>
              <MetricBar
                color="#528f68"
                maximum={maximum}
                value={month.assets.cents}
              />
              <MetricBar
                color="#d86b63"
                maximum={maximum}
                value={month.debt.cents}
              />
            </View>
            <Text
              style={[
                styles.monthNet,
                month.netWorth.cents < 0 && styles.negative,
              ]}
            >
              {formatMoney(month.netWorth)}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

function MetricBar({
  color,
  maximum,
  value,
}: Readonly<{ color: string; maximum: number; value: number }>) {
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
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function EmptyReport({ message }: Readonly<{ message: string }>) {
  return <Text style={styles.empty}>{message}</Text>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f7f5' },
  header: {
    minHeight: 78,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#18201a',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  period: { marginTop: 2, color: '#6d776f', fontSize: 12, fontWeight: '600' },
  tabs: {
    marginHorizontal: 20,
    padding: 4,
    backgroundColor: '#e8ede8',
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
  tabActive: { backgroundColor: '#294d36' },
  tabText: { color: '#536158', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#ffffff' },
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
    backgroundColor: '#294d36',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: '#c9ddce',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroAmount: {
    marginTop: 8,
    color: '#ffffff',
    fontSize: 34,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  heroCaption: {
    marginTop: 4,
    color: '#c9ddce',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    padding: 18,
    backgroundColor: '#ffffff',
    borderColor: '#e1e5df',
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
  },
  cardTitle: { color: '#202b23', fontSize: 18, fontWeight: '800' },
  categoryRow: { paddingTop: 3, gap: 8 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowCopy: { flex: 1 },
  rowTitle: { color: '#253028', fontSize: 15, fontWeight: '700' },
  rowSubtitle: { marginTop: 2, color: '#7a837c', fontSize: 11 },
  rowAmountCopy: { alignItems: 'flex-end' },
  rowAmount: {
    color: '#253028',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  percentage: { color: '#758078', fontSize: 10, fontWeight: '700' },
  track: {
    height: 8,
    backgroundColor: '#e5e9e5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  spendingBar: { height: '100%', backgroundColor: '#5f9d70', borderRadius: 4 },
  legend: { flexDirection: 'row', gap: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { color: '#667169', fontSize: 11, fontWeight: '700' },
  monthRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monthLabel: { width: 30, color: '#566159', fontSize: 12, fontWeight: '700' },
  monthBars: { flex: 1, gap: 4 },
  metricTrack: {
    height: 7,
    backgroundColor: '#edf0ed',
    borderRadius: 4,
    overflow: 'hidden',
  },
  metricFill: { height: '100%', borderRadius: 4 },
  monthNet: {
    width: 92,
    color: '#285d39',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    textAlign: 'right',
  },
  negative: { color: '#c4574f' },
  empty: {
    paddingVertical: 34,
    color: '#727c74',
    fontSize: 14,
    textAlign: 'center',
  },
  error: {
    padding: 14,
    color: '#b42318',
    backgroundColor: '#fef3f2',
    borderRadius: 12,
  },
});
