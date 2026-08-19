import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import type { AccountsOverview } from '@/application/use-cases/accounts/get-accounts';
import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type { TransactionSummary } from '@/application/use-cases/transactions/get-transactions';
import type { TransactionInput } from '@/application/use-cases/transactions/transaction-input';
import type { TransferInput } from '@/application/use-cases/transfers/transfer-input';
import { Money } from '@/domain/value-objects/money';
import { MoneyKeypad } from '@/presentation/components/common/money-keypad';
import { FullScreenModal } from '@/presentation/components/common/full-screen-modal';
import { NameInputModal } from '@/presentation/components/common/name-input-modal';
import { NativeDatePicker } from '@/presentation/components/common/native-date-picker';
import { SelectionModal } from '@/presentation/components/common/selection-modal';
import { PayeeSelectionScreen } from '@/presentation/components/transactions/payee-selection-screen';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { formatDate, formatMoney } from '@/presentation/utils/money';
import {
  categoryDisplayName,
  groupDisplayName,
} from '@/presentation/utils/category-name';

type TransactionEditorModalProps = Readonly<{
  accounts: AccountsOverview;
  categoryGroups: readonly CategoryGroupSummary[];
  payees: readonly string[];
  transaction?: TransactionSummary;
  linkedTransaction?: TransactionSummary;
  onDismiss: () => void;
  onSave: (input: TransactionInput | TransferInput) => Promise<void>;
}>;

type TransactionKind = 'expense' | 'income' | 'transfer';
type Editor =
  | 'kind'
  | 'account'
  | 'destination-account'
  | 'category'
  | 'payee'
  | 'date'
  | 'memo'
  | null;

function today(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function TransactionEditorModal({
  accounts,
  categoryGroups,
  payees,
  transaction: summary,
  linkedTransaction: linkedSummary,
  onDismiss,
  onSave,
}: TransactionEditorModalProps) {
  const insets = useSafeAreaInsets();
  const { language, t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const existing = summary?.transaction;
  const linked = linkedSummary?.transaction;
  const existingTransfer = Boolean(existing?.transactionGroupId && linked);
  const transferLegs = [existing, linked].filter(
    (transaction) => transaction !== undefined,
  );
  const sourceLeg = existingTransfer
    ? transferLegs.find(({ amount }) => amount.cents < 0)
    : undefined;
  const destinationLeg = existingTransfer
    ? transferLegs.find(({ amount }) => amount.cents > 0)
    : undefined;
  const availableAccounts = useMemo(
    () => accounts.accounts.filter(({ account }) => !account.closed),
    [accounts],
  );
  const availableCategories = useMemo(
    () =>
      categoryGroups.flatMap(({ group, categories }) =>
        categories
          .filter((category) => !category.hidden)
          .map((category) => ({
            category,
            groupName: groupDisplayName(group, t),
          })),
      ),
    [categoryGroups, t],
  );
  const [kind, setKind] = useState<TransactionKind>(
    existingTransfer
      ? 'transfer'
      : existing && existing.amount.cents >= 0
        ? 'income'
        : 'expense',
  );
  const [amountCents, setAmountCents] = useState(
    Math.abs(existing?.amount.cents ?? 0),
  );
  const [accountId, setAccountId] = useState(
    sourceLeg?.accountId ??
      existing?.accountId ??
      availableAccounts[0]?.account.id ??
      '',
  );
  const [destinationAccountId, setDestinationAccountId] = useState(
    destinationLeg?.accountId ??
      availableAccounts.find(({ account }) => account.id !== accountId)?.account
        .id ??
      '',
  );
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [payee, setPayee] = useState(existing?.payee ?? '');
  const [date, setDate] = useState(existing?.date ?? today());
  const [memo, setMemo] = useState(existing?.notes ?? '');
  const [cleared, setCleared] = useState(existing?.status !== 'uncleared');
  const [showMore, setShowMore] = useState(false);
  const [keypadVisible, setKeypadVisible] = useState(true);
  const [editor, setEditor] = useState<Editor>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const accountName =
    availableAccounts.find(({ account }) => account.id === accountId)?.account
      .name ?? t('transactions.chooseAccount');
  const selectableSourceAccounts =
    kind === 'expense'
      ? availableAccounts.filter(({ account }) => account.onBudget)
      : availableAccounts;
  const selectedCategory = availableCategories.find(
    ({ category }) => category.id === categoryId,
  )?.category;
  const categoryName = selectedCategory
    ? categoryDisplayName(selectedCategory, t)
    : undefined;
  const destinationAccountName =
    availableAccounts.find(({ account }) => account.id === destinationAccountId)
      ?.account.name ?? t('transactions.chooseDestination');

  function openEditor(value: Exclude<Editor, null>) {
    setKeypadVisible(false);
    setEditor(value);
  }

  async function submit() {
    if (amountCents <= 0) {
      setError(t('transactions.amountRequired'));
      return;
    }
    if (!accountId) {
      setError(t('transactions.accountRequired'));
      return;
    }
    if (kind === 'expense' && !categoryId) {
      setError(t('transactions.categoryRequired'));
      return;
    }
    if (kind === 'transfer' && !destinationAccountId) {
      setError(t('transactions.destinationRequired'));
      return;
    }
    if (kind === 'transfer' && accountId === destinationAccountId) {
      setError(t('transactions.differentAccounts'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const common = {
        amountCents,
        date,
        notes: memo.trim() || undefined,
        status: cleared ? 'cleared' : 'uncleared',
      } as const;
      await onSave(
        kind === 'transfer'
          ? {
              ...common,
              kind,
              sourceAccountId: accountId,
              destinationAccountId,
            }
          : kind === 'expense'
            ? {
                ...common,
                kind,
                accountId,
                categoryId,
                payee: payee.trim() || undefined,
              }
            : {
                ...common,
                kind,
                accountId,
                payee: payee.trim() || undefined,
              },
      );
      onDismiss();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('form.couldNotSave'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FullScreenModal onRequestClose={onDismiss}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel={t('common.close')}
            hitSlop={12}
            onPress={onDismiss}
            style={styles.close}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          <Text style={styles.headerTitle}>
            {existing ? t('transactions.edit') : t('transactions.new')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => setKeypadVisible(true)}>
            <Text
              accessibilityLabel={t('transactions.amount')}
              style={styles.amount}
            >
              {formatMoney(Money.fromCents(amountCents))}
            </Text>
          </Pressable>

          <Pressable onPress={() => openEditor('kind')} style={styles.kindPill}>
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
              <FieldRow
                icon="currency-eur"
                label={payee || t('transactions.choosePayee')}
                muted={!payee}
                onPress={() => openEditor('payee')}
              />
            ) : null}
            {kind === 'expense' ? (
              <FieldRow
                icon="shape-outline"
                label={categoryName ?? t('transactions.chooseCategory')}
                muted={!categoryName}
                onPress={() => openEditor('category')}
              />
            ) : null}
            <FieldRow
              icon="cash"
              label={accountName}
              muted={!accountId}
              onPress={() => openEditor('account')}
              overline={
                kind === 'transfer'
                  ? t('transactions.fromAccount')
                  : t('transactions.account')
              }
            />
            {kind === 'transfer' ? (
              <FieldRow
                icon="bank-transfer-in"
                label={destinationAccountName}
                muted={!destinationAccountId}
                onPress={() => openEditor('destination-account')}
                overline={t('transactions.toAccount')}
              />
            ) : null}
            <FieldRow
              icon="calendar-outline"
              label={formatDate(date, language)}
              onPress={() => openEditor('date')}
              overline={t('transactions.date')}
            />
            {showMore ? (
              <>
                <FieldRow
                  icon="note-text-outline"
                  label={memo || t('transactions.addMemo')}
                  muted={!memo}
                  onPress={() => openEditor('memo')}
                  overline={memo ? t('transactions.memo') : undefined}
                />
                <FieldRow
                  icon={cleared ? 'check-circle' : 'circle-outline'}
                  label={
                    cleared
                      ? t('transactions.cleared')
                      : t('transactions.uncleared')
                  }
                  onPress={() => setCleared((current) => !current)}
                  overline={t('transactions.status')}
                />
              </>
            ) : null}
          </View>

          <Pressable
            accessibilityState={{ expanded: showMore }}
            onPress={() => {
              setKeypadVisible(false);
              setShowMore((current) => !current);
            }}
            style={styles.showMore}
          >
            <Text style={styles.showMoreText}>
              {showMore
                ? t('transactions.showLess')
                : t('transactions.showMore')}
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
        </ScrollView>

        <View style={[styles.bottomPanel, { paddingBottom: insets.bottom }]}>
          <View style={styles.actionBar}>
            <Pressable
              disabled={submitting || selectableSourceAccounts.length === 0}
              onPress={() => void submit()}
              style={[styles.save, submitting && styles.disabled]}
            >
              <Text style={styles.saveText}>
                {submitting
                  ? t('transactions.saving')
                  : `✓  ${t('common.save')}`}
              </Text>
            </Pressable>
          </View>
          {keypadVisible ? (
            <MoneyKeypad
              calculator
              onChange={setAmountCents}
              onDone={() => setKeypadVisible(false)}
              valueCents={amountCents}
            />
          ) : null}
        </View>

        {editor === 'kind' ? (
          <SelectionModal
            onDismiss={() => setEditor(null)}
            onSelect={(value) => {
              setKind(value);
              if (
                value === 'expense' &&
                !availableAccounts.find(
                  ({ account }) => account.id === accountId,
                )?.account.onBudget
              ) {
                setAccountId(
                  availableAccounts.find(({ account }) => account.onBudget)
                    ?.account.id ?? '',
                );
              }
            }}
            options={[
              ...(existingTransfer
                ? []
                : [
                    {
                      value: 'expense',
                      label: t('transactions.spending'),
                      description: t('transactions.spendingDescription'),
                    } as const,
                    {
                      value: 'income',
                      label: t('transactions.inflow'),
                      description: t('transactions.inflowDescription'),
                    } as const,
                  ]),
              ...(!existing
                ? [
                    {
                      value: 'transfer',
                      label: t('transactions.transfer'),
                      description: t('transactions.transferDescription'),
                    } as const,
                  ]
                : existingTransfer
                  ? [
                      {
                        value: 'transfer',
                        label: t('transactions.transfer'),
                        description: t('transactions.transferDescription'),
                      } as const,
                    ]
                  : []),
            ]}
            selectedValue={kind}
            title={t('transactions.type')}
            placement="center"
          />
        ) : null}
        {editor === 'account' ? (
          <SelectionModal
            onDismiss={() => setEditor(null)}
            onSelect={setAccountId}
            options={selectableSourceAccounts
              .filter(
                ({ account }) =>
                  kind !== 'transfer' || account.id !== destinationAccountId,
              )
              .map(({ account }) => ({
                value: account.id,
                label: account.name,
              }))}
            selectedValue={accountId}
            title={t('transactions.chooseAccount')}
          />
        ) : null}
        {editor === 'destination-account' ? (
          <SelectionModal
            onDismiss={() => setEditor(null)}
            onSelect={setDestinationAccountId}
            options={availableAccounts
              .filter(({ account }) => account.id !== accountId)
              .map(({ account }) => ({
                value: account.id,
                label: account.name,
              }))}
            selectedValue={destinationAccountId}
            title={t('transactions.chooseDestinationAccount')}
          />
        ) : null}
        {editor === 'category' ? (
          <SelectionModal
            onDismiss={() => setEditor(null)}
            onSelect={setCategoryId}
            options={availableCategories.map(({ category, groupName }) => ({
              value: category.id,
              label: categoryDisplayName(category, t),
              description: groupName,
            }))}
            selectedValue={categoryId}
            title={t('transactions.chooseCategory')}
          />
        ) : null}
        {editor === 'payee' ? (
          <PayeeSelectionScreen
            payees={payees}
            selectedPayee={payee || undefined}
            onDismiss={() => setEditor(null)}
            onSelect={setPayee}
          />
        ) : null}
        {editor === 'date' ? (
          <NativeDatePicker
            value={date}
            onDismiss={() => setEditor(null)}
            title={t('transactions.chooseDate')}
            onChange={setDate}
          />
        ) : null}
        {editor === 'memo' ? (
          <NameInputModal
            allowEmpty
            initialValue={memo}
            label={t('transactions.memo')}
            multiline
            placement="center"
            onDismiss={() => setEditor(null)}
            onSubmit={async (value) => setMemo(value.trim())}
            submitLabel={t('transactions.saveMemo')}
            title={t('transactions.memoTitle')}
          />
        ) : null}
      </SafeAreaView>
    </FullScreenModal>
  );
}

function FieldRow({
  icon,
  label,
  muted = false,
  overline,
  onPress,
}: Readonly<{
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  muted?: boolean;
  overline?: string;
  onPress: () => void;
}>) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onPress} style={styles.fieldRow}>
      <View style={styles.fieldIcon}>
        <MaterialCommunityIcons
          color={theme.colors.textMuted}
          name={icon}
          size={23}
        />
      </View>
      <View style={styles.fieldCopy}>
        {overline ? <Text style={styles.overline}>{overline}</Text> : null}
        <Text style={[styles.fieldLabel, muted && styles.fieldMuted]}>
          {label}
        </Text>
      </View>
      <Text style={styles.rowChevron}>›</Text>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      minHeight: 56,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    close: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeText: {
      color: theme.colors.text,
      fontSize: 38,
      fontWeight: '300',
      lineHeight: 40,
    },
    headerTitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    headerSpacer: { width: 42 },
    content: {
      width: '100%',
      maxWidth: 620,
      paddingHorizontal: 20,
      paddingBottom: 12,
      alignSelf: 'center',
      alignItems: 'center',
    },
    amount: {
      marginTop: 4,
      color: theme.colors.text,
      fontSize: 42,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      letterSpacing: -1.5,
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
      elevation: 2,
    },
    fieldRow: {
      minHeight: 58,
      paddingHorizontal: 20,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
    },
    fieldIcon: { width: 36, alignItems: 'center', justifyContent: 'center' },
    fieldCopy: { flex: 1, paddingHorizontal: 12 },
    overline: {
      marginBottom: 2,
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    fieldLabel: { color: theme.colors.text, fontSize: 17, fontWeight: '600' },
    fieldMuted: { color: theme.colors.textMuted, fontWeight: '500' },
    rowChevron: { color: theme.colors.textMuted, fontSize: 25 },
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
    save: {
      minHeight: 54,
      paddingHorizontal: 23,
      backgroundColor: theme.colors.primary,
      borderRadius: 18,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveText: {
      color: theme.colors.onPrimary,
      fontSize: 17,
      fontWeight: '800',
    },
    actionBar: {
      minHeight: 68,
      paddingVertical: 7,
      paddingHorizontal: 22,
      backgroundColor: theme.colors.background,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    bottomPanel: { backgroundColor: theme.colors.background },
    disabled: { opacity: 0.55 },
  });
