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
import { requiresReconciliationWarning } from '@/domain/services/transaction-edit-policy';
import { SelectCategoryScreen } from '@/presentation/components/categories/select-category-screen';
import {
  MoneyKeypad,
  type MoneyCalculatorExpression,
  type MoneyKeypadHandle,
} from '@/presentation/components/common/money-keypad';
import { FullScreenSelectionScreen } from '@/presentation/components/common/full-screen-selection-screen';
import { KeyboardResponsiveScreen } from '@/presentation/components/common/keyboard-responsive-screen';
import { NameInputModal } from '@/presentation/components/common/name-input-modal';
import { NativeDatePicker } from '@/presentation/components/common/native-date-picker';
import { PayeeSelectionScreen } from '@/presentation/components/transactions/payee-selection-screen';
import {
  TransactionEditorFields,
  type TransactionEditorKind,
} from '@/presentation/components/transactions/transaction-editor-fields';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';
import { categoryDisplayName } from '@/presentation/utils/category-name';
import { indexBudgetValuesByCategoryId } from '@/presentation/utils/category-budget-values';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';
import { localIsoDate } from '@/presentation/utils/calendar';

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

type Editor =
  | 'kind'
  | 'account'
  | 'destination-account'
  | 'category'
  | 'payee'
  | 'date'
  | 'memo'
  | null;

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
  const styles = useThemedStyles(createStyles);
  const existing = summary?.transaction;
  const linked = linkedSummary?.transaction;
  const existingOpeningBalance = existing?.kind === 'opening_balance';
  const existingTechnicalTransaction =
    existingOpeningBalance || existing?.kind === 'reconciliation_adjustment';
  const existingTransfer = Boolean(existing?.transactionGroupId && linked);
  const transferLegs = [existing, linked].filter(
    (transaction) => transaction !== undefined,
  );
  const reconciledTransactions = transferLegs.filter(
    (transaction) => transaction.status === 'reconciled',
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
  const initialKind: TransactionEditorKind = existingTransfer
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
  const initialDate = existing?.date ?? localIsoDate();
  const initialMemo = existing?.notes ?? '';
  const initialCleared = existing?.status !== 'uncleared';
  const [kind, setKind] = useState<TransactionEditorKind>(initialKind);
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
  const showsCategoryDestination =
    !existingTechnicalTransaction &&
    (kind === 'expense' ||
      categoryInflowEnabled ||
      (kind === 'income' && Boolean(categoryId)));
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
    if (!hasUnsavedChanges) {
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
  }, [hasUnsavedChanges, onDismiss, t]);

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

  async function submit(
    resolvedAmountCents?: number,
    reconciliationConfirmed = false,
  ) {
    if (submitting) return;
    const finalAmountCents =
      resolvedAmountCents ?? keypadRef.current?.resolve() ?? amountCents;
    if (
      finalAmountCents < 0 ||
      (finalAmountCents === 0 && !existingOpeningBalance)
    ) {
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

    const common = {
      amountCents: finalAmountCents,
      date,
      notes: memo.trim() || undefined,
      status: cleared ? 'cleared' : 'uncleared',
    } as const;
    const input: TransactionInput | TransferInput =
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
              ...(!existingTechnicalTransaction && categoryId
                ? { categoryId }
                : {}),
              payee: payee.trim() || undefined,
            }
          : {
              ...common,
              direction: 'inflow',
              accountId,
              ...(!existingTechnicalTransaction && categoryId
                ? { categoryId }
                : {}),
              payee: payee.trim() || undefined,
            };
    const changesReconciliation = reconciledTransactions.some((transaction) =>
      requiresReconciliationWarning([transaction], {
        amountCents:
          kind === 'transfer'
            ? transaction.amount.cents < 0
              ? -finalAmountCents
              : finalAmountCents
            : kind === 'expense'
              ? -finalAmountCents
              : finalAmountCents,
        date,
      }),
    );
    if (changesReconciliation && !reconciliationConfirmed) {
      Alert.alert(
        t('transactions.reconciledEditTitle'),
        t('transactions.reconciledEditBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('transactions.saveAnyway'),
            onPress: () => void submit(finalAmountCents, true),
          },
        ],
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave(input);
      onDismiss();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('form.couldNotSave'));
    } finally {
      setSubmitting(false);
    }
  }

  function openAccountEditor(value: 'account' | 'destination-account') {
    const reason =
      reconciledTransactions.length > 0
        ? 'reconciled'
        : existingOpeningBalance
          ? 'opening_balance'
          : null;
    if (!reason) {
      openEditor(value);
      return;
    }
    Alert.alert(
      t('transactions.accountLockedTitle'),
      reason === 'reconciled'
        ? t('transactions.reconciledAccountLockedBody')
        : t('transactions.openingBalanceAccountLockedBody'),
    );
  }

  function selectKind(value: TransactionEditorKind) {
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
      reconciledTransactions.length === 0 &&
      !existingOpeningBalance &&
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
            <TransactionEditorFields
              accountId={accountId}
              accountName={accountName}
              amountCents={amountCents}
              amountExpression={amountExpression}
              canEditStatus={
                existing?.status !== 'reconciled' &&
                !existingTechnicalTransaction
              }
              categoryName={categoryName}
              cleared={cleared}
              date={date}
              destinationAccountId={destinationAccountId}
              destinationAccountName={destinationAccountName}
              error={error}
              keypadVisible={keypadVisible}
              kind={kind}
              language={language}
              memo={memo}
              onEdit={openEditor}
              onOpenAccount={openAccountEditor}
              onShowKeypad={() => setKeypadVisible(true)}
              onToggleMore={() => {
                keypadRef.current?.resolve();
                setKeypadVisible(false);
                setShowMore((current) => !current);
              }}
              onToggleStatus={() => setCleared((current) => !current)}
              payee={payee}
              showMore={showMore}
              showsCategoryDestination={showsCategoryDestination}
            />
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
