import { StyleSheet, Text, View } from 'react-native';

import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import { calculateCategoryPeriodUsage } from '@/domain/services/calculate-budget-month';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';
import { formatBudgetMonth } from '@/presentation/utils/calendar';
import { formatMoney } from '@/presentation/utils/money';

type CategoryBalanceBreakdownProps = Readonly<{
  month: string;
  values: BudgetCategoryValues;
}>;

export function CategoryBalanceBreakdown({
  month,
  values,
}: CategoryBalanceBreakdownProps) {
  const { language, t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const monthName = formatBudgetMonth(month, language, { month: 'long' });
  const { startingAvailable } = calculateCategoryPeriodUsage(values);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{t('categoryDetails.balance')}</Text>
      <Text
        style={[
          styles.balance,
          values.available.cents < 0 && styles.balanceNegative,
        ]}
      >
        {formatMoney(values.available)}
      </Text>
      <View style={styles.breakdown}>
        <BalanceRow
          label={t('categoryDetails.availableFromPrevious')}
          value={formatMoney(values.availableFromPreviousMonth)}
        />
        <BalanceRow
          label={t('categoryDetails.assignedForMonth', { month: monthName })}
          value={formatMoney(values.assigned)}
        />
        <BalanceRow
          label={t('categoryDetails.startingAvailableForMonth', {
            month: monthName,
          })}
          value={formatMoney(startingAvailable)}
        />
        <BalanceRow
          label={t('categoryDetails.activityInMonth', { month: monthName })}
          value={formatMoney(values.activity)}
        />
        <BalanceRow
          label={t('budget.available')}
          value={formatMoney(values.available)}
          strong
        />
      </View>
    </View>
  );
}

function BalanceRow({
  label,
  value,
  strong = false,
}: Readonly<{ label: string; value: string; strong?: boolean }>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      padding: 20,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 22,
      alignItems: 'center',
      gap: 8,
    },
    eyebrow: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    balance: {
      color: theme.colors.positive,
      fontSize: 38,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    balanceNegative: { color: theme.colors.negative },
    breakdown: {
      width: '100%',
      paddingTop: 12,
      marginTop: 4,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
    },
    label: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontSize: 13,
    },
    value: {
      color: theme.colors.text,
      fontSize: 14,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
    },
    strong: { color: theme.colors.primary, fontSize: 16 },
  });
