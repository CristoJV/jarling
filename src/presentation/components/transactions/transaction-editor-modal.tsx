import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AccountsOverview } from '@/application/use-cases/accounts/get-accounts';
import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type { TransactionSummary } from '@/application/use-cases/transactions/get-transactions';
import type { TransactionInput } from '@/application/use-cases/transactions/transaction-input';
import { Money } from '@/domain/value-objects/money';
import { MoneyKeypad } from '@/presentation/components/common/money-keypad';
import { NameInputModal } from '@/presentation/components/common/name-input-modal';
import { SelectionModal } from '@/presentation/components/common/selection-modal';
import { formatMoney } from '@/presentation/utils/money';

type TransactionEditorModalProps = Readonly<{
  accounts: AccountsOverview;
  categoryGroups: readonly CategoryGroupSummary[];
  transaction?: TransactionSummary;
  onDismiss: () => void;
  onSave: (input: TransactionInput) => Promise<void>;
}>;

type Editor = 'kind' | 'account' | 'category' | 'payee' | 'date' | null;

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
  transaction: summary,
  onDismiss,
  onSave,
}: TransactionEditorModalProps) {
  const existing = summary?.transaction;
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
  const [kind, setKind] = useState<'expense' | 'income'>(
    existing && existing.amount.cents >= 0 ? 'income' : 'expense',
  );
  const [amountCents, setAmountCents] = useState(
    Math.abs(existing?.amount.cents ?? 0),
  );
  const [accountId, setAccountId] = useState(
    existing?.accountId ?? availableAccounts[0]?.account.id ?? '',
  );
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [payee, setPayee] = useState(existing?.payee ?? '');
  const [date, setDate] = useState(existing?.date ?? today());
  const [editor, setEditor] = useState<Editor>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const accountName =
    availableAccounts.find(({ account }) => account.id === accountId)?.account
      .name ?? 'Choose Account';
  const categoryName = availableCategories.find(
    ({ category }) => category.id === categoryId,
  )?.category.name;

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

    setSubmitting(true);
    setError(null);
    try {
      const common = {
        accountId,
        amountCents,
        payee: payee.trim() || undefined,
        date,
        notes: existing?.notes,
        status: existing?.status === 'uncleared' ? 'uncleared' : 'cleared',
      } as const;
      await onSave(
        kind === 'expense'
          ? { ...common, kind, categoryId }
          : { ...common, kind },
      );
      onDismiss();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onDismiss} visible>
      <SafeAreaView style={styles.safeArea}>
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
          <Text accessibilityLabel="Importe" style={styles.amount}>
            {formatMoney(Money.fromCents(amountCents))}
          </Text>

          <Pressable onPress={() => setEditor('kind')} style={styles.kindPill}>
            <Text style={styles.kindIcon}>
              {kind === 'expense' ? '−' : '+'}
            </Text>
            <Text style={styles.kindText}>
              {kind === 'expense' ? 'Spending' : 'Inflow'}
            </Text>
            <Text style={styles.chevron}>⌄</Text>
          </Pressable>

          <View style={styles.formCard}>
            <FieldRow
              icon="↔"
              label={payee || 'Choose Payee'}
              muted={!payee}
              onPress={() => setEditor('payee')}
            />
            {kind === 'expense' ? (
              <FieldRow
                icon="▤"
                label={categoryName ?? 'Choose Category'}
                muted={!categoryName}
                onPress={() => setEditor('category')}
              />
            ) : null}
            <FieldRow
              icon="▣"
              label={accountName}
              muted={!accountId}
              onPress={() => setEditor('account')}
              overline="Account"
            />
            <FieldRow
              icon="□"
              label={formatDate(date)}
              onPress={() => setEditor('date')}
              overline="Date"
            />
          </View>

          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <MoneyKeypad onChange={setAmountCents} valueCents={amountCents} />
        </ScrollView>

        <Pressable
          disabled={submitting || availableAccounts.length === 0}
          onPress={() => void submit()}
          style={[styles.save, submitting && styles.disabled]}
        >
          <Text style={styles.saveText}>
            {submitting ? 'Saving…' : '✓  Save'}
          </Text>
        </Pressable>

        {editor === 'kind' ? (
          <SelectionModal
            onDismiss={() => setEditor(null)}
            onSelect={(value) => setKind(value)}
            options={[
              {
                value: 'expense',
                label: 'Spending',
                description: 'Money leaving an account.',
              },
              {
                value: 'income',
                label: 'Inflow',
                description: 'Money entering an account.',
              },
            ]}
            selectedValue={kind}
            title="Transaction type"
          />
        ) : null}
        {editor === 'account' ? (
          <SelectionModal
            onDismiss={() => setEditor(null)}
            onSelect={setAccountId}
            options={availableAccounts.map(({ account }) => ({
              value: account.id,
              label: account.name,
            }))}
            selectedValue={accountId}
            title="Choose Account"
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
          <NameInputModal
            initialValue={payee}
            label="Payee"
            onDismiss={() => setEditor(null)}
            onSubmit={async (value) => setPayee(value.trim())}
            submitLabel="Choose"
            title="Choose Payee"
          />
        ) : null}
        {editor === 'date' ? (
          <NameInputModal
            initialValue={date}
            label="Date (YYYY-MM-DD)"
            onDismiss={() => setEditor(null)}
            onSubmit={async (value) => setDate(value.trim())}
            submitLabel="Choose"
            title="Choose Date"
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

function FieldRow({
  icon,
  label,
  muted = false,
  overline,
  onPress,
}: Readonly<{
  icon: string;
  label: string;
  muted?: boolean;
  overline?: string;
  onPress: () => void;
}>) {
  return (
    <Pressable onPress={onPress} style={styles.fieldRow}>
      <Text style={styles.fieldIcon}>{icon}</Text>
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
    paddingBottom: 100,
    alignSelf: 'center',
    alignItems: 'center',
  },
  amount: {
    marginTop: 18,
    color: '#18201a',
    fontSize: 48,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: -1.5,
  },
  kindPill: {
    minHeight: 54,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 22,
    backgroundColor: '#e2ebe4',
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  kindIcon: { color: '#315a3e', fontSize: 22, fontWeight: '800' },
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
    minHeight: 72,
    paddingHorizontal: 20,
    borderBottomColor: '#e8ebe7',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldIcon: { width: 36, color: '#647068', fontSize: 22, textAlign: 'center' },
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
  save: {
    position: 'absolute',
    right: 22,
    bottom: 22,
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
  disabled: { opacity: 0.55 },
});
