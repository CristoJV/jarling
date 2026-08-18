import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
  const [translateX] = useState(() => new Animated.Value(0));
  const [open, setOpen] = useState(false);
  const swipeable = transaction.status !== 'reconciled';

  const animateTo = useCallback(
    (value: number) => {
      setOpen(value < 0);
      Animated.spring(translateX, {
        toValue: value,
        useNativeDriver: true,
        speed: 24,
        bounciness: 0,
      }).start();
    },
    [translateX],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          swipeable &&
          Math.abs(gesture.dx) > 6 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          const origin = open ? -88 : 0;
          translateX.setValue(Math.max(-88, Math.min(0, origin + gesture.dx)));
        },
        onPanResponderRelease: (_, gesture) => {
          if (open) animateTo(gesture.dx > 30 ? 0 : -88);
          else animateTo(gesture.dx < -36 ? -88 : 0);
        },
        onPanResponderTerminate: () => animateTo(open ? -88 : 0),
      }),
    [animateTo, open, swipeable, translateX],
  );

  return (
    <View style={styles.swipeContainer}>
      {swipeable ? (
        <Pressable
          accessibilityLabel={`Eliminar ${transaction.payee ?? 'transacción'}`}
          onPress={onDelete}
          style={styles.deleteAction}
        >
          <MaterialCommunityIcons
            color="#ffffff"
            name="trash-can-outline"
            size={27}
          />
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      ) : null}
      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => (open ? animateTo(0) : onEdit())}
          style={styles.row}
        >
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
              {summary.accountName} ·{' '}
              {summary.categoryName ??
                (transaction.transactionGroupId
                  ? 'Transfer'
                  : 'Ready to Assign')}
            </Text>
            <Text style={styles.status}>
              {statusLabels[transaction.status]}
            </Text>
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
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: { overflow: 'hidden', backgroundColor: '#c62828' },
  deleteAction: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 88,
    backgroundColor: '#c62828',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  deleteText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  row: {
    minHeight: 88,
    paddingVertical: 14,
    borderBottomColor: '#e6e8e4',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: '#f7f7f5',
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
});
