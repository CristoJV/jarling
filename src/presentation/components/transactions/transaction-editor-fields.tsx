import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Money } from '@/domain/value-objects/money';
import { BlinkingCursor } from '@/presentation/components/common/blinking-cursor';
import { FormRow } from '@/presentation/components/common/form-row';
import type { MoneyCalculatorExpression } from '@/presentation/components/common/money-keypad';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { formatDate, formatMoney } from '@/presentation/utils/money';

export type TransactionEditorKind = 'expense' | 'income' | 'transfer';
export type TransactionEditorVisualEditor =
  | 'kind'
  | 'account'
  | 'destination-account'
  | 'category'
  | 'payee'
  | 'date'
  | 'memo';

type TransactionEditorFieldsProps = Readonly<{
  accountId: string;
  accountName: string;
  amountCents: number;
  amountExpression: MoneyCalculatorExpression | null;
  canEditStatus: boolean;
  categoryName?: string;
  cleared: boolean;
  date: string;
  destinationAccountId: string;
  destinationAccountName: string;
  error: string | null;
  keypadVisible: boolean;
  kind: TransactionEditorKind;
  language: string;
  memo: string;
  payee: string;
  showMore: boolean;
  showsCategoryDestination: boolean;
  onEdit: (editor: TransactionEditorVisualEditor) => void;
  onOpenAccount: (editor: 'account' | 'destination-account') => void;
  onShowKeypad: () => void;
  onToggleMore: () => void;
  onToggleStatus: () => void;
}>;

export function TransactionEditorFields({
  accountId,
  accountName,
  amountCents,
  amountExpression,
  canEditStatus,
  categoryName,
  cleared,
  date,
  destinationAccountId,
  destinationAccountName,
  error,
  keypadVisible,
  kind,
  language,
  memo,
  payee,
  showMore,
  showsCategoryDestination,
  onEdit,
  onOpenAccount,
  onShowKeypad,
  onToggleMore,
  onToggleStatus,
}: TransactionEditorFieldsProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <>
      <Pressable onPress={onShowKeypad} style={styles.amountField}>
        <Text
          accessibilityLabel={t('transactions.amount')}
          adjustsFontSizeToFit
          minimumFontScale={0.58}
          numberOfLines={1}
          style={styles.amount}
        >
          {amountExpression
            ? `${formatMoney(Money.fromCents(amountExpression.leftCents))} ${amountExpression.operator} ${formatMoney(Money.fromCents(amountExpression.rightCents))}`
            : formatMoney(Money.fromCents(amountCents))}
        </Text>
        {keypadVisible ? <BlinkingCursor height={38} /> : null}
      </Pressable>

      <Pressable onPress={() => onEdit('kind')} style={styles.kindPill}>
        <MaterialCommunityIcons
          color={theme.colors.primary}
          name={
            kind === 'transfer'
              ? 'bank-transfer'
              : kind === 'expense'
                ? 'minus-box-outline'
                : 'plus-box-outline'
          }
          size={22}
        />
        <Text style={styles.kindText}>
          {kind === 'transfer'
            ? t('transactions.transfer')
            : kind === 'expense'
              ? t('transactions.spending')
              : t('transactions.inflow')}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>

      <View style={styles.formCard}>
        {kind !== 'transfer' ? (
          <FormRow
            icon="currency-eur"
            label={payee || t('transactions.choosePayee')}
            muted={!payee}
            onPress={() => onEdit('payee')}
          />
        ) : null}
        {showsCategoryDestination ? (
          <FormRow
            icon={categoryName ? 'shape-outline' : undefined}
            label={
              categoryName ??
              (kind === 'income'
                ? t('transactions.readyToAssign')
                : t('transactions.uncategorized'))
            }
            muted={!categoryName}
            onPress={() => onEdit('category')}
          />
        ) : null}
        <FormRow
          icon="cash"
          label={accountName}
          muted={!accountId}
          onPress={() => onOpenAccount('account')}
          overline={
            kind === 'transfer'
              ? t('transactions.fromAccount')
              : t('transactions.account')
          }
        />
        {kind === 'transfer' ? (
          <FormRow
            icon="bank-transfer-in"
            label={destinationAccountName}
            muted={!destinationAccountId}
            onPress={() => onOpenAccount('destination-account')}
            overline={t('transactions.toAccount')}
          />
        ) : null}
        <FormRow
          icon="calendar-outline"
          label={formatDate(date, language)}
          onPress={() => onEdit('date')}
          overline={t('transactions.date')}
        />
        {showMore ? (
          <>
            <FormRow
              icon="note-text-outline"
              label={memo || t('transactions.addMemo')}
              muted={!memo}
              onPress={() => onEdit('memo')}
              overline={memo ? t('transactions.memo') : undefined}
            />
            {canEditStatus ? (
              <FormRow
                icon={cleared ? 'check-circle' : 'circle-outline'}
                label={
                  cleared
                    ? t('transactions.cleared')
                    : t('transactions.uncleared')
                }
                onPress={onToggleStatus}
                overline={t('transactions.status')}
              />
            ) : null}
          </>
        ) : null}
      </View>

      <Pressable
        accessibilityState={{ expanded: showMore }}
        onPress={onToggleMore}
        style={styles.showMore}
      >
        <Text style={styles.showMoreText}>
          {showMore ? t('transactions.showLess') : t('transactions.showMore')}
        </Text>
        <MaterialCommunityIcons
          color={theme.colors.primary}
          name={showMore ? 'chevron-up' : 'chevron-down'}
          size={20}
        />
      </Pressable>

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    amount: {
      color: theme.colors.text,
      fontSize: 42,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      letterSpacing: -1.5,
    },
    amountField: {
      minHeight: 58,
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    kindPill: {
      minHeight: 46,
      paddingHorizontal: 20,
      marginTop: 10,
      marginBottom: 12,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 27,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    kindText: { color: theme.colors.primary, fontSize: 17, fontWeight: '700' },
    chevron: { color: theme.colors.primary, fontSize: 17 },
    formCard: {
      width: '100%',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 24,
      borderWidth: 1,
      overflow: 'hidden',
      shadowColor: '#102216',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.06,
      shadowRadius: 18,
      elevation: theme.elevation.card,
    },
    error: {
      width: '100%',
      padding: 12,
      marginTop: 14,
      color: theme.colors.negative,
      backgroundColor: theme.colors.negativeMuted,
      borderRadius: 12,
      fontSize: 13,
    },
    showMore: {
      minHeight: 42,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    showMoreText: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: '800',
    },
  });
