import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import type { AccountsOverview } from '@/application/use-cases/accounts/get-accounts';
import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type { TransactionSummary } from '@/application/use-cases/transactions/get-transactions';
import type { TransactionInput } from '@/application/use-cases/transactions/transaction-input';
import type { TransferInput } from '@/application/use-cases/transfers/transfer-input';
import { supportsCategoryInflows } from '@/domain/entities/account';
import type { Category } from '@/domain/entities/category';
import type { BudgetMonthValues } from '@/domain/services/calculate-budget-month';
import { Money } from '@/domain/value-objects/money';
import { SelectCategoryScreen } from '@/presentation/components/categories/select-category-screen';
import { BlinkingCursor } from '@/presentation/components/common/blinking-cursor';
import {
  MoneyKeypad,
  type MoneyCalculatorExpression,
  type MoneyKeypadHandle,
} from '@/presentation/components/common/money-keypad';
import { FullScreenSelectionScreen } from '@/presentation/components/common/full-screen-selection-screen';
import { FormRow } from '@/presentation/components/common/form-row';
import { KeyboardResponsiveScreen } from '@/presentation/components/common/keyboard-responsive-screen';
import { NameInputModal } from '@/presentation/components/common/name-input-modal';
import { NativeDatePicker } from '@/presentation/components/common/native-date-picker';
import { PayeeSelectionScreen } from '@/presentation/components/transactions/payee-selection-screen';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { formatDate, formatMoney } from '@/presentation/utils/money';
import { categoryDisplayName } from '@/presentation/utils/category-name';
import { indexBudgetValuesByCategoryId } from '@/presentation/utils/category-budget-values';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

type TransactionEditorScreenProps = Readonly<{
  accounts: AccountsOverview;
  budget: BudgetMonthValues;
  categoryGroups: readonly CategoryGroupSummary[];
  payees: readonly string[];
  transaction?: TransactionSummary;
  linkedTransaction?: TransactionSummary;
  onCreateCategory: (input: {
    groupId: string;
    name: string;
  }) => Promise<Category>;
  onDismiss: () => void;
  onLoadBudgetMonth: (month: string) => Promise<BudgetMonthValues>;
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

export function TransactionEditorScreen({
  accounts,
  budget,
  categoryGroups,
  payees,
  transaction: summary,
  linkedTransaction: linkedSummary,
  onCreateCategory,
  onDismiss,
  onLoadBudgetMonth,
  onSave,
}: TransactionEditorScreenProps) {
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
      categoryGroups.flatMap(({ categories }) =>
        categories.filter((category) => !category.hidden),
      ),
    [categoryGroups],
  );
  const initialKind: TransactionKind = existingTransfer
    ? 'transfer'
    : existing && existing.amount.cents >= 0
      ? 'income'
      : 'expense';
  const initialAmountCents = Math.abs(existing?.amount.cents ?? 0);
  const initialAccountId =
    sourceLeg?.accountId ??
    existing?.accountId ??
    availableAccounts[0]?.account.id ??
    '';
  const initialDestinationAccountId =
    destinationLeg?.accountId ??
    availableAccounts.find(({ account }) => account.id !== initialAccountId)
      ?.account.id ??
    '';
  const initialCategoryId = existing?.categoryId ?? '';
  const initialPayee = existing?.payee ?? '';
  const initialDate = existing?.date ?? today();
  const initialMemo = existing?.notes ?? '';
  const initialCleared = existing?.status !== 'uncleared';
  const [kind, setKind] = useState<TransactionKind>(initialKind);
  const [amountCents, setAmountCents] = useState(initialAmountCents);
  const [amountExpression, setAmountExpression] =
    useState<MoneyCalculatorExpression | null>(null);
  const [accountId, setAccountId] = useState(initialAccountId);
  const [destinationAccountId, setDestinationAccountId] = useState(
    initialDestinationAccountId,
  );
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [payee, setPayee] = useState(initialPayee);
  const [date, setDate] = useState(initialDate);
  const [memo, setMemo] = useState(initialMemo);
  const [cleared, setCleared] = useState(initialCleared);
  const [showMore, setShowMore] = useState(false);
  const [keypadVisible, setKeypadVisible] = useState(true);
  const [editor, setEditor] = useState<Editor>(null);
  const [categoryBudget, setCategoryBudget] = useState(budget);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const restoreKeypad = useRef(false);
  const keypadRef = useRef<MoneyKeypadHandle>(null);
  const budgetValuesByCategoryId = useMemo(
    () => indexBudgetValuesByCategoryId(categoryBudget),
    [categoryBudget],
  );

  useEffect(() => {
    const month = date.slice(0, 7);
    if (month === categoryBudget.month) return;
    let active = true;
    onLoadBudgetMonth(month).then(
      (value) => {
        if (active) setCategoryBudget(value);
      },
      (cause: unknown) => {
        if (active) setError(domainErrorMessage(cause, t));
      },
    );
    return () => {
      active = false;
    };
  }, [categoryBudget.month, date, onLoadBudgetMonth, t]);
  const discardAlertVisible = useRef(false);
  const [initialValues] = useState(() => ({
    kind: initialKind,
    amountCents: initialAmountCents,
    accountId: initialAccountId,
    destinationAccountId: initialDestinationAccountId,
    categoryId: initialCategoryId,
    payee: initialPayee,
    date: initialDate,
    memo: initialMemo,
    cleared: initialCleared,
  }));

  const accountName =
    availableAccounts.find(({ account }) => account.id === accountId)?.account
      .name ?? t('transactions.chooseAccount');
  const selectableSourceAccounts =
    kind === 'expense'
      ? availableAccounts.filter(({ account }) => account.onBudget)
      : availableAccounts;
  const selectedCategory = availableCategories.find(
    (category) => category.id === categoryId,
  );
  const selectedAccount = availableAccounts.find(
    ({ account }) => account.id === accountId,
  )?.account;
  const categoryInflowEnabled =
    kind === 'income' &&
    selectedAccount !== undefined &&
    supportsCategoryInflows(selectedAccount);
  const categoryName = selectedCategory
    ? categoryDisplayName(selectedCategory, t)
    : undefined;
  const destinationAccountName =
    availableAccounts.find(({ account }) => account.id === destinationAccountId)
      ?.account.name ?? t('transactions.chooseDestination');
  const hasUnsavedChanges =
    kind !== initialValues.kind ||
    amountCents !== initialValues.amountCents ||
    accountId !== initialValues.accountId ||
    destinationAccountId !== initialValues.destinationAccountId ||
    categoryId !== initialValues.categoryId ||
    payee !== initialValues.payee ||
    date !== initialValues.date ||
    memo !== initialValues.memo ||
    cleared !== initialValues.cleared;

  const requestDismiss = useCallback(() => {
    if (existing || !hasUnsavedChanges) {
      onDismiss();
      return;
    }
    if (discardAlertVisible.current) return;
    discardAlertVisible.current = true;
    Alert.alert(
      t('transactions.discardTitle'),
      t('transactions.discardBody'),
      [
        {
          text: t('transactions.continueEditing'),
          style: 'cancel',
          onPress: () => {
            discardAlertVisible.current = false;
          },
        },
        {
          text: t('transactions.discard'),
          style: 'destructive',
          onPress: () => {
            discardAlertVisible.current = false;
            onDismiss();
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          discardAlertVisible.current = false;
        },
      },
    );
  }, [existing, hasUnsavedChanges, onDismiss, t]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (editor) return false;
        requestDismiss();
        return true;
      },
    );
    return () => subscription.remove();
  }, [editor, requestDismiss]);

  function openEditor(value: Exclude<Editor, null>) {
    restoreKeypad.current = keypadVisible;
    if (keypadVisible) keypadRef.current?.resolve();
    setKeypadVisible(false);
    setEditor(value);
  }

  function closeEditor() {
    setEditor(null);
    setKeypadVisible(restoreKeypad.current);
    restoreKeypad.current = false;
  }

  async function submit(resolvedAmountCents?: number) {
    if (submitting) return;
    const finalAmountCents =
      resolvedAmountCents ?? keypadRef.current?.resolve() ?? amountCents;
    if (finalAmountCents <= 0) {
      setError(t('transactions.amountRequired'));
      return;
    }
    if (!accountId) {
      setError(t('transactions.accountRequired'));
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
        amountCents: finalAmountCents,
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
                direction: 'outflow',
                accountId,
                ...(categoryId ? { categoryId } : {}),
                payee: payee.trim() || undefined,
              }
            : {
                ...common,
                direction: 'inflow',
                accountId,
                ...(categoryId ? { categoryId } : {}),
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

  function selectKind(value: TransactionKind) {
    if (
      value !== kind &&
      (value === 'expense' || value === 'income') &&
      (kind === 'expense' || kind === 'income')
    ) {
      setCategoryId('');
    }
    setKind(value);
    if (
      value === 'expense' &&
      !availableAccounts.find(({ account }) => account.id === accountId)
        ?.account.onBudget
    ) {
      setAccountId(
        availableAccounts.find(({ account }) => account.onBudget)?.account.id ??
          '',
      );
    }
  }

  function selectAccount(value: string) {
    setAccountId(value);
    const account = availableAccounts.find(
      ({ account: candidate }) => candidate.id === value,
    )?.account;
    if (
      kind === 'income' &&
      categoryId &&
      (!account || !supportsCategoryInflows(account))
    ) {
      setCategoryId('');
    }
  }

  function renderSelectionOverlay() {
    if (editor === 'kind') {
      return (
        <FullScreenSelectionScreen
          overlay
          onBack={closeEditor}
          onSelect={selectKind}
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
        />
      );
    }

    if (editor === 'account') {
      return (
        <FullScreenSelectionScreen
          overlay
          onBack={closeEditor}
          onSelect={selectAccount}
          options={selectableSourceAccounts
            .filter(
              ({ account }) =>
                kind !== 'transfer' || account.id !== destinationAccountId,
            )
            .map(({ account }) => ({ value: account.id, label: account.name }))}
          selectedValue={accountId}
          title={t('transactions.chooseAccount')}
        />
      );
    }

    if (editor === 'destination-account') {
      return (
        <FullScreenSelectionScreen
          overlay
          onBack={closeEditor}
          onSelect={setDestinationAccountId}
          options={availableAccounts
            .filter(({ account }) => account.id !== accountId)
            .map(({ account }) => ({ value: account.id, label: account.name }))}
          selectedValue={destinationAccountId}
          title={t('transactions.chooseDestinationAccount')}
        />
      );
    }

    if (editor === 'category') {
      return (
        <SelectCategoryScreen
          allowCreateCategory
          budgetValuesByCategoryId={budgetValuesByCategoryId}
          groups={categoryGroups}
          overlay
          onBack={closeEditor}
          onCreateCategory={onCreateCategory}
          onSelect={(selection) =>
            setCategoryId(
              selection.kind === 'category' ? selection.category.id : '',
            )
          }
          selectedCategoryId={categoryId || undefined}
          selectedSpecial={
            categoryId
              ? undefined
              : kind === 'income'
                ? 'ready-to-assign'
                : 'uncategorized'
          }
          showReadyToAssign={kind === 'income'}
          showUncategorized={kind === 'expense'}
          {...(kind === 'income'
            ? {
                readyToAssignDescription: t(
                  'transactions.inflowRtaDescription',
                ),
                categorySectionDescription: t(
                  'transactions.inflowCategoryDescription',
                ),
                categorySectionTitle: t('transactions.inflowCategoriesTitle'),
              }
            : {})}
          title={t('transactions.chooseCategory')}
        />
      );
    }

    if (editor === 'payee') {
      return (
        <PayeeSelectionScreen
          overlay
          onBack={closeEditor}
          onSelect={setPayee}
          payees={payees}
          selectedPayee={payee || undefined}
        />
      );
    }

    return null;
  }

  return (
    <View style={styles.root}>
      <KeyboardResponsiveScreen>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={t('common.close')}
              hitSlop={12}
              onPress={requestDismiss}
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
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              onPress={() => setKeypadVisible(true)}
              style={styles.amountField}
            >
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

            <Pressable
              onPress={() => openEditor('kind')}
              style={styles.kindPill}
            >
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
                  onPress={() => openEditor('payee')}
                />
              ) : null}
              {kind === 'expense' ||
              categoryInflowEnabled ||
              (kind === 'income' && categoryId) ? (
                <FormRow
                  icon={categoryName ? 'shape-outline' : undefined}
                  label={
                    categoryName ??
                    (kind === 'income'
                      ? t('transactions.readyToAssign')
                      : t('transactions.uncategorized'))
                  }
                  muted={!categoryName}
                  onPress={() => openEditor('category')}
                />
              ) : null}
              <FormRow
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
                <FormRow
                  icon="bank-transfer-in"
                  label={destinationAccountName}
                  muted={!destinationAccountId}
                  onPress={() => openEditor('destination-account')}
                  overline={t('transactions.toAccount')}
                />
              ) : null}
              <FormRow
                icon="calendar-outline"
                label={formatDate(date, language)}
                onPress={() => openEditor('date')}
                overline={t('transactions.date')}
              />
              {showMore ? (
                <>
                  <FormRow
                    icon="note-text-outline"
                    label={memo || t('transactions.addMemo')}
                    muted={!memo}
                    onPress={() => openEditor('memo')}
                    overline={memo ? t('transactions.memo') : undefined}
                  />
                  <FormRow
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
                keypadRef.current?.resolve();
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
                onExpressionChange={setAmountExpression}
                ref={keypadRef}
                valueCents={amountCents}
              />
            ) : null}
          </View>

          {editor === 'date' ? (
            <NativeDatePicker
              value={date}
              onDismiss={closeEditor}
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
              onDismiss={closeEditor}
              onSubmit={async (value) => setMemo(value.trim())}
              submitLabel={t('transactions.saveMemo')}
              title={t('transactions.memoTitle')}
            />
          ) : null}
        </SafeAreaView>
      </KeyboardResponsiveScreen>
      {renderSelectionOverlay()}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
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
    save: {
      minHeight: 54,
      paddingHorizontal: 23,
      backgroundColor: theme.colors.primary,
      borderRadius: 18,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: theme.elevation.floating,
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
