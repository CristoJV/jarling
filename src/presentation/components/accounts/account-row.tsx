import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AccountSummary } from '@/application/use-cases/accounts/get-accounts';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';
import { formatMoney } from '@/presentation/utils/money';

type AccountRowProps = Readonly<{
  summary: AccountSummary;
  onPress: () => void;
}>;

export function AccountRow({ summary, onPress }: AccountRowProps) {
  const { account, balance } = summary;
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const typeLabel = {
    checking: t('accounts.checking'),
    savings: t('accounts.savings'),
    cash: t('accounts.cash'),
    credit_card: t('accounts.creditCard'),
    tracking: t('accounts.tracking'),
    loan: t('accounts.loan'),
  }[account.type];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={account.closed}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        account.closed && styles.closed,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.details}>
        <View style={styles.titleLine}>
          <Text style={styles.name}>{account.name}</Text>
          {account.closed ? (
            <Text style={styles.closedBadge}>{t('accounts.closed')}</Text>
          ) : null}
        </View>
        <Text style={styles.meta}>
          {typeLabel} ·{' '}
          {account.onBudget ? t('accounts.onBudget') : t('accounts.tracking')}
        </Text>
      </View>

      <View style={styles.balanceArea}>
        <Text style={[styles.balance, balance.cents < 0 && styles.negative]}>
          {formatMoney(balance)}
        </Text>
        {!account.closed ? (
          <Text style={styles.openAction}>{t('accounts.options')}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    row: {
      minHeight: 84,
      paddingVertical: 16,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    closed: {
      opacity: 0.55,
    },
    pressed: { backgroundColor: theme.colors.surfacePressed },
    details: {
      flex: 1,
      gap: 5,
    },
    titleLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    name: {
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: '600',
    },
    closedBadge: {
      color: theme.colors.textMuted,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.8,
    },
    meta: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    balanceArea: {
      alignItems: 'flex-end',
      gap: 7,
    },
    balance: {
      color: theme.colors.text,
      fontSize: 17,
      fontVariant: ['tabular-nums'],
      fontWeight: '600',
    },
    negative: {
      color: theme.colors.negative,
    },
    openAction: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
  });
