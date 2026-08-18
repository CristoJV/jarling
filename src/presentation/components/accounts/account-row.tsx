import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AccountType } from '@/domain/entities/account';
import type { AccountSummary } from '@/application/use-cases/accounts/get-accounts';
import { formatMoney } from '@/presentation/utils/money';

const typeLabels: Record<AccountType, string> = {
  checking: 'Corriente',
  savings: 'Ahorro',
  cash: 'Efectivo',
  tracking: 'Seguimiento',
};

type AccountRowProps = Readonly<{
  summary: AccountSummary;
  onClose: (accountId: string) => void;
}>;

export function AccountRow({ summary, onClose }: AccountRowProps) {
  const { account, balance } = summary;

  return (
    <View style={[styles.row, account.closed && styles.closed]}>
      <View style={styles.details}>
        <View style={styles.titleLine}>
          <Text style={styles.name}>{account.name}</Text>
          {account.closed ? (
            <Text style={styles.closedBadge}>CERRADA</Text>
          ) : null}
        </View>
        <Text style={styles.meta}>
          {typeLabels[account.type]} ·{' '}
          {account.onBudget ? 'On-budget' : 'Tracking'}
        </Text>
      </View>

      <View style={styles.balanceArea}>
        <Text style={[styles.balance, balance.cents < 0 && styles.negative]}>
          {formatMoney(balance)}
        </Text>
        {!account.closed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cerrar cuenta ${account.name}`}
            hitSlop={8}
            onPress={() => onClose(account.id)}
          >
            <Text style={styles.closeAction}>Cerrar</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 84,
    paddingVertical: 16,
    borderBottomColor: '#e6e8e4',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  closed: {
    opacity: 0.55,
  },
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
    color: '#18201a',
    fontSize: 17,
    fontWeight: '600',
  },
  closedBadge: {
    color: '#687268',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  meta: {
    color: '#687268',
    fontSize: 13,
  },
  balanceArea: {
    alignItems: 'flex-end',
    gap: 7,
  },
  balance: {
    color: '#18201a',
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  negative: {
    color: '#b42318',
  },
  closeAction: {
    color: '#687268',
    fontSize: 12,
    fontWeight: '600',
  },
});
