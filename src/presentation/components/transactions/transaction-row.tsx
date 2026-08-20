import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useMemo, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import type { TransactionSummary } from '@/application/use-cases/transactions/get-transactions';
import { formatMoney } from '@/presentation/utils/money';
import { categoryDisplayName } from '@/presentation/utils/category-name';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

type TransactionRowProps = Readonly<{
  summary: TransactionSummary;
  onDelete: () => void;
  onEdit: () => void;
}>;

export function TransactionRow({
  summary,
  onDelete,
  onEdit,
}: TransactionRowProps) {
  const { transaction } = summary;
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const [translateX] = useState(() => new Animated.Value(0));
  const swipeable = transaction.status !== 'reconciled';
  const payeeLabel =
    transaction.kind === 'opening_balance'
      ? t('transactions.openingBalance')
      : transaction.kind === 'reconciliation_adjustment'
        ? t('transactions.reconciliationAdjustment')
        : transaction.kind === 'transfer'
          ? t('transactions.transfer')
          : (transaction.payee ??
            (transaction.amount.cents >= 0
              ? t('transactions.income')
              : t('transactions.expense')));

  const animateTo = useCallback(
    (value: number) => {
      Animated.spring(translateX, {
        toValue: value,
        useNativeDriver: true,
        speed: 24,
        bounciness: 0,
      }).start();
    },
    [translateX],
  );

  const triggerDelete = useCallback(
    (direction: number) => {
      Animated.timing(translateX, {
        toValue: direction * width,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        onDelete();
        translateX.setValue(0);
      });
    },
    [onDelete, translateX, width],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          swipeable &&
          Math.abs(gesture.dx) > 6 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          translateX.setValue(Math.max(-160, Math.min(160, gesture.dx)));
        },
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) >= 96 || Math.abs(gesture.vx) >= 0.75) {
            triggerDelete(gesture.dx < 0 ? -1 : 1);
          } else {
            animateTo(0);
          }
        },
        onPanResponderTerminate: () => animateTo(0),
      }),
    [animateTo, swipeable, translateX, triggerDelete],
  );

  return (
    <View style={styles.swipeContainer}>
      {swipeable ? (
        <View pointerEvents="none" style={styles.deleteBackground}>
          <MaterialCommunityIcons
            color={theme.colors.onNegative}
            name="trash-can-outline"
            size={27}
          />
          <Text style={[styles.deleteText, { color: theme.colors.onNegative }]}>
            {t('common.delete')}
          </Text>
          <View style={styles.deleteSpacer} />
          <Text style={[styles.deleteText, { color: theme.colors.onNegative }]}>
            {t('common.delete')}
          </Text>
          <MaterialCommunityIcons
            color={theme.colors.onNegative}
            name="trash-can-outline"
            size={27}
          />
        </View>
      ) : null}
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.movingRow, { transform: [{ translateX }] }]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          style={styles.row}
        >
          <View style={styles.dateBox}>
            <Text style={styles.day}>{transaction.date.slice(8, 10)}</Text>
            <Text style={styles.month}>{transaction.date.slice(5, 7)}</Text>
          </View>
          <View style={styles.details}>
            <Text numberOfLines={1} style={styles.payee}>
              {payeeLabel}
            </Text>
            <Text numberOfLines={1} style={styles.meta}>
              {summary.accountName} ·{' '}
              {(summary.categoryName && transaction.categoryId
                ? categoryDisplayName(
                    { id: transaction.categoryId, name: summary.categoryName },
                    t,
                  )
                : undefined) ??
                (transaction.transactionGroupId
                  ? t('transactions.transfer')
                  : t('transactions.readyToAssign'))}
            </Text>
          </View>
          <View
            accessibilityLabel={
              transaction.status === 'reconciled'
                ? t('transactions.reconciled')
                : transaction.status === 'cleared'
                  ? t('transactions.cleared')
                  : t('transactions.pending')
            }
            style={styles.amountArea}
          >
            <Text
              style={[
                styles.amount,
                transaction.amount.cents < 0 ? styles.expense : styles.income,
              ]}
            >
              {formatMoney(transaction.amount)}
            </Text>
            <MaterialCommunityIcons
              color={
                transaction.status === 'reconciled'
                  ? theme.colors.textSecondary
                  : transaction.status === 'cleared'
                    ? theme.colors.positive
                    : theme.colors.textMuted
              }
              name={
                transaction.status === 'reconciled'
                  ? 'lock-outline'
                  : transaction.status === 'cleared'
                    ? 'check-circle-outline'
                    : 'clock-outline'
              }
              size={18}
            />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    swipeContainer: { width: '100%', overflow: 'hidden' },
    movingRow: { width: '100%', backgroundColor: theme.colors.background },
    deleteBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 22,
      backgroundColor: theme.colors.negative,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },
    deleteSpacer: { flex: 1 },
    deleteText: {
      color: theme.colors.onPrimary,
      fontSize: 11,
      fontWeight: '800',
    },
    row: {
      minHeight: 88,
      paddingVertical: 14,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
      backgroundColor: theme.colors.background,
    },
    dateBox: {
      width: 42,
      height: 48,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    day: {
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    month: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
    },
    details: {
      flex: 1,
      gap: 3,
    },
    payee: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    meta: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    amountArea: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    amount: {
      fontSize: 16,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
    },
    expense: {
      color: theme.colors.negative,
    },
    income: {
      color: theme.colors.positive,
    },
  });
