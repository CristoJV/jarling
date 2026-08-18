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
import { formatMoney } from '@/presentation/utils/money';

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

function formatDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
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
          .map((category) => ({ category, groupName: group.name })),
      ),
    [categoryGroups],
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
      .name ?? 'Choose Account';
  const categoryName = availableCategories.find(
    ({ category }) => category.id === categoryId,
  )?.category.name;
  const destinationAccountName =
    availableAccounts.find(({ account }) => account.id === destinationAccountId)
      ?.account.name ?? 'Choose Destination';

  async function submit() {
    if (amountCents <= 0) {
      setError('Introduce un importe mayor que cero.');
      return;
    }
    if (!accountId) {
      setError('Selecciona una cuenta.');
      return;
    }
    if (kind === 'expense' && !categoryId) {
      setError('Selecciona una categoría para el gasto.');
      return;
    }
    if (kind === 'transfer' && !destinationAccountId) {
      setError('Selecciona una cuenta de destino.');
      return;
    }
    if (kind === 'transfer' && accountId === destinationAccountId) {
      setError('Las cuentas de origen y destino deben ser diferentes.');
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
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FullScreenModal onRequestClose={onDismiss}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Cerrar"
            hitSlop={12}
            onPress={onDismiss}
            style={styles.close}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          <Text style={styles.headerTitle}>
            {existing ? 'Edit Transaction' : 'New Transaction'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => setKeypadVisible(true)}>
            <Text accessibilityLabel="Importe" style={styles.amount}>
              {formatMoney(Money.fromCents(amountCents))}
            </Text>
          </Pressable>

          <Pressable onPress={() => setEditor('kind')} style={styles.kindPill}>
            <MaterialCommunityIcons
              color="#315a3e"
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
                ? 'Transfer'
                : kind === 'expense'
                  ? 'Spending'
                  : 'Inflow'}
            </Text>
            <Text style={styles.chevron}>⌄</Text>
          </Pressable>

          <View style={styles.formCard}>
            {kind !== 'transfer' ? (
              <FieldRow
                icon="currency-eur"
                label={payee || 'Choose Payee'}
                muted={!payee}
                onPress={() => setEditor('payee')}
              />
            ) : null}
            {kind === 'expense' ? (
              <FieldRow
                icon="shape-outline"
                label={categoryName ?? 'Choose Category'}
                muted={!categoryName}
                onPress={() => setEditor('category')}
              />
            ) : null}
            <FieldRow
              icon="cash"
              label={accountName}
              muted={!accountId}
              onPress={() => setEditor('account')}
              overline={kind === 'transfer' ? 'From Account' : 'Account'}
            />
            {kind === 'transfer' ? (
              <FieldRow
                icon="bank-transfer-in"
                label={destinationAccountName}
                muted={!destinationAccountId}
                onPress={() => setEditor('destination-account')}
                overline="To Account"
              />
            ) : null}
            <FieldRow
              icon="calendar-outline"
              label={formatDate(date)}
              onPress={() => setEditor('date')}
              overline="Date"
            />
            {showMore ? (
              <>
                <FieldRow
                  icon="note-text-outline"
                  label={memo || 'Add Memo'}
                  muted={!memo}
                  onPress={() => setEditor('memo')}
                  overline={memo ? 'Memo' : undefined}
                />
                <FieldRow
                  icon={cleared ? 'check-circle' : 'circle-outline'}
                  label={cleared ? 'Cleared' : 'Uncleared'}
                  onPress={() => setCleared((current) => !current)}
                  overline="Status"
                />
              </>
            ) : null}
          </View>

          <Pressable
            accessibilityState={{ expanded: showMore }}
            onPress={() => setShowMore((current) => !current)}
            style={styles.showMore}
          >
            <Text style={styles.showMoreText}>
              {showMore ? 'Show less' : 'Show more'}
            </Text>
            <MaterialCommunityIcons
              color="#315a3e"
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
              disabled={submitting || availableAccounts.length === 0}
              onPress={() => void submit()}
              style={[styles.save, submitting && styles.disabled]}
            >
              <Text style={styles.saveText}>
                {submitting ? 'Saving…' : '✓  Save'}
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
            onSelect={(value) => setKind(value)}
            options={[
              ...(existingTransfer
                ? []
                : [
                    {
                      value: 'expense',
                      label: 'Spending',
                      description: 'Money leaving an account.',
                    } as const,
                    {
                      value: 'income',
                      label: 'Inflow',
                      description: 'Money entering an account.',
                    } as const,
                  ]),
              ...(!existing
                ? [
                    {
                      value: 'transfer',
                      label: 'Transfer',
                      description: 'Move money between two accounts.',
                    } as const,
                  ]
                : existingTransfer
                  ? [
                      {
                        value: 'transfer',
                        label: 'Transfer',
                        description: 'Move money between two accounts.',
                      } as const,
                    ]
                  : []),
            ]}
            selectedValue={kind}
            title="Transaction type"
            placement="center"
          />
        ) : null}
        {editor === 'account' ? (
          <SelectionModal
            onDismiss={() => setEditor(null)}
            onSelect={setAccountId}
            options={availableAccounts
              .filter(
                ({ account }) =>
                  kind !== 'transfer' || account.id !== destinationAccountId,
              )
              .map(({ account }) => ({
                value: account.id,
                label: account.name,
              }))}
            selectedValue={accountId}
            title="Choose Account"
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
            title="Choose Destination Account"
          />
        ) : null}
        {editor === 'category' ? (
          <SelectionModal
            onDismiss={() => setEditor(null)}
            onSelect={setCategoryId}
            options={availableCategories.map(({ category, groupName }) => ({
              value: category.id,
              label: category.name,
              description: groupName,
            }))}
            selectedValue={categoryId}
            title="Choose Category"
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
            title="Choose Date"
            onChange={setDate}
          />
        ) : null}
        {editor === 'memo' ? (
          <NameInputModal
            allowEmpty
            initialValue={memo}
            label="Memo"
            multiline
            onDismiss={() => setEditor(null)}
            onSubmit={async (value) => setMemo(value.trim())}
            submitLabel="Save Memo"
            title="Transaction Memo"
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
  return (
    <Pressable onPress={onPress} style={styles.fieldRow}>
      <View style={styles.fieldIcon}>
        <MaterialCommunityIcons color="#647068" name={icon} size={23} />
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6f3' },
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
    color: '#253028',
    fontSize: 38,
    fontWeight: '300',
    lineHeight: 40,
  },
  headerTitle: { color: '#56615a', fontSize: 13, fontWeight: '700' },
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
    color: '#18201a',
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
    backgroundColor: '#e2ebe4',
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  kindText: { color: '#203b29', fontSize: 17, fontWeight: '700' },
  chevron: { color: '#496451', fontSize: 17 },
  formCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderColor: '#e1e6e1',
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
    borderBottomColor: '#e8ebe7',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldIcon: { width: 36, alignItems: 'center', justifyContent: 'center' },
  fieldCopy: { flex: 1, paddingHorizontal: 12 },
  overline: {
    marginBottom: 2,
    color: '#7b857e',
    fontSize: 12,
    fontWeight: '600',
  },
  fieldLabel: { color: '#253028', fontSize: 17, fontWeight: '600' },
  fieldMuted: { color: '#858e88', fontWeight: '500' },
  rowChevron: { color: '#9aa19c', fontSize: 25 },
  error: {
    width: '100%',
    padding: 12,
    marginTop: 14,
    color: '#b42318',
    backgroundColor: '#fef3f2',
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
  showMoreText: { color: '#315a3e', fontSize: 13, fontWeight: '800' },
  save: {
    minHeight: 54,
    paddingHorizontal: 23,
    backgroundColor: '#315a3e',
    borderRadius: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  actionBar: {
    minHeight: 68,
    paddingVertical: 7,
    paddingHorizontal: 22,
    backgroundColor: '#f4f6f3',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bottomPanel: { backgroundColor: '#f4f6f3' },
  disabled: { opacity: 0.55 },
});
