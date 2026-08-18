import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TransactionSummary } from '@/application/use-cases/transactions/get-transactions';
import { formatMoney } from '@/presentation/utils/money';

type TransactionRowProps = Readonly<{
  summary: TransactionSummary;
  onDelete: () => void;
  onEdit: () => void;
}>;

const statusLabels = {
  uncleared: 'Pendiente',
  cleared: 'Confirmada',
  reconciled: 'Conciliada',
} as const;

export function TransactionRow({
  summary,
  onDelete,
  onEdit,
}: TransactionRowProps) {
  const { transaction } = summary;

  return (
    <Pressable accessibilityRole="button" onPress={onEdit} style={styles.row}>
      <View style={styles.dateBox}>
        <Text style={styles.day}>{transaction.date.slice(8, 10)}</Text>
        <Text style={styles.month}>{transaction.date.slice(5, 7)}</Text>
      </View>
      <View style={styles.details}>
        <Text numberOfLines={1} style={styles.payee}>
          {transaction.payee ??
            (transaction.amount.cents >= 0 ? 'Income' : 'Expense')}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {summary.accountName} · {summary.categoryName ?? 'Ready to Assign'}
        </Text>
        <Text style={styles.status}>{statusLabels[transaction.status]}</Text>
      </View>
      <View style={styles.amountArea}>
        <Text
          style={[
            styles.amount,
            transaction.amount.cents < 0 ? styles.expense : styles.income,
          ]}
        >
          {formatMoney(transaction.amount)}
        </Text>
        {transaction.status !== 'reconciled' ? (
          <Pressable
            accessibilityLabel={`Eliminar ${transaction.payee ?? 'transacción'}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onDelete}
          >
            <Text style={styles.delete}>Eliminar</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 88,
    paddingVertical: 14,
    borderBottomColor: '#e6e8e4',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  dateBox: {
    width: 42,
    height: 48,
    backgroundColor: '#edf1ed',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    color: '#26332b',
    fontSize: 17,
    fontWeight: '700',
  },
  month: {
    color: '#6b756d',
    fontSize: 10,
    fontWeight: '700',
  },
  details: {
    flex: 1,
    gap: 3,
  },
  payee: {
    color: '#18201a',
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: '#687268',
    fontSize: 12,
  },
  status: {
    color: '#7b837d',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  amountArea: {
    alignItems: 'flex-end',
    gap: 8,
  },
  amount: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  expense: {
    color: '#a33b31',
  },
  income: {
    color: '#24643a',
  },
  delete: {
    color: '#8a5a50',
    fontSize: 11,
    fontWeight: '600',
  },
});
