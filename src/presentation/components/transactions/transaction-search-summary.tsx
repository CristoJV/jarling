import { ScrollView, StyleSheet, Text } from 'react-native';

import type { TransactionAmountSummary } from '@/domain/services/calculate-transaction-amount-summary';
import { Money } from '@/domain/value-objects/money';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';
import { formatMoney } from '@/presentation/utils/money';

type Props = Readonly<{
  summary: TransactionAmountSummary;
}>;

export function TransactionSearchSummary({ summary }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const hasIncome = summary.income.cents > 0;
  const hasSpending = summary.spending.cents > 0;
  const income = prefixedMoney(summary.income.cents, '+');
  const spending = prefixedMoney(summary.spending.cents, '−');
  const net = signedMoney(summary.net.cents);
  const netStyle =
    summary.net.cents > 0
      ? styles.positive
      : summary.net.cents < 0
        ? styles.negative
        : styles.neutral;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
    >
      <Text accessibilityRole="summary" numberOfLines={1} style={styles.text}>
        <Text style={styles.heading}>{t('transactions.totals')}: </Text>
        {hasIncome && hasSpending ? (
          <>
            <Text style={netStyle}>{net}</Text> (
            <Text style={styles.positive}>
              {income} {t('transactions.totalIncome')}
            </Text>{' '}
            ·{' '}
            <Text style={styles.negative}>
              {spending} {t('transactions.totalSpending')}
            </Text>
            )
          </>
        ) : hasIncome ? (
          <Text style={styles.positive}>
            {income} {t('transactions.totalIncome')}
          </Text>
        ) : hasSpending ? (
          <Text style={styles.negative}>
            {spending} {t('transactions.totalSpending')}
          </Text>
        ) : (
          <Text style={styles.neutral}>{formatMoney(Money.zero())}</Text>
        )}
      </Text>
    </ScrollView>
  );
}

function prefixedMoney(cents: number, prefix: '+' | '−'): string {
  return `${prefix}${formatMoney(Money.fromCents(cents))}`;
}

function signedMoney(cents: number): string {
  const sign = cents > 0 ? '+' : cents < 0 ? '−' : '';
  return `${sign}${formatMoney(Money.fromCents(Math.abs(cents)))}`;
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flexGrow: 0 },
    content: {
      minHeight: 36,
      paddingHorizontal: 16,
      paddingTop: 9,
      paddingBottom: 2,
      alignItems: 'center',
    },
    text: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontVariant: ['tabular-nums'],
    },
    heading: { color: theme.colors.text, fontWeight: '700' },
    positive: { color: theme.colors.positive, fontWeight: '700' },
    negative: { color: theme.colors.negative, fontWeight: '700' },
    neutral: { color: theme.colors.textSecondary, fontWeight: '700' },
  });
