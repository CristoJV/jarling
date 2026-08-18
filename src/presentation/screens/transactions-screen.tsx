import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { TransactionSummary } from '@/application/use-cases/transactions/get-transactions';
import { OverflowMenu } from '@/presentation/components/common/overflow-menu';
import { TransactionEditorModal } from '@/presentation/components/transactions/transaction-editor-modal';
import { TransactionRow } from '@/presentation/components/transactions/transaction-row';
import { useTransactions } from '@/presentation/hooks/use-transactions';

type EditorState = 'create' | TransactionSummary | null;
type SearchField = 'search' | 'payee' | 'memo';
type AppliedSearch = Readonly<{ field: SearchField; value: string }>;

const searchLabels: Record<SearchField, string> = {
  search: 'Anything',
  payee: 'Payee',
  memo: 'Memo',
};

export function TransactionsScreen() {
  const router = useRouter();
  const parameters = useLocalSearchParams<{ create?: string }>();
  const [searchDraft, setSearchDraft] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [appliedSearches, setAppliedSearches] = useState<
    readonly AppliedSearch[]
  >([]);
  const [accountId, setAccountId] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [editor, setEditor] = useState<EditorState>(null);
  const filters = useMemo(
    () => ({
      ...Object.fromEntries(
        appliedSearches.map(({ field, value }) => [field, value]),
      ),
      ...(accountId ? { accountId } : {}),
      ...(categoryId ? { categoryId } : {}),
    }),
    [accountId, appliedSearches, categoryId],
  );
  const { data, error, loading, refresh, save, deleteTransaction } =
    useTransactions(filters);
  const visibleEditor: EditorState =
    editor ?? (parameters.create === '1' ? 'create' : null);

  function applySearch(field: SearchField) {
    const value = searchDraft.trim();
    if (!value) return;
    setAppliedSearches((current) => [
      ...current.filter((filter) => filter.field !== field),
      { field, value },
    ]);
    setSearchDraft('');
    setSearchFocused(false);
  }

  function removeSearch(field: SearchField) {
    setAppliedSearches((current) =>
      current.filter((filter) => filter.field !== field),
    );
  }

  function dismissEditor() {
    setEditor(null);
    if (parameters.create === '1') {
      router.setParams({ create: '' });
    }
  }

  function requestDelete(summary: TransactionSummary) {
    const transfer = Boolean(summary.transaction.transactionGroupId);
    Alert.alert(
      transfer ? 'Eliminar transferencia' : 'Eliminar transacción',
      transfer
        ? 'Se eliminarán los dos movimientos enlazados definitivamente.'
        : `Se eliminará ${summary.transaction.payee ?? 'esta transacción'} definitivamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void deleteTransaction(summary.transaction.id),
        },
      ],
    );
  }

  function edit(summary: TransactionSummary) {
    if (summary.transaction.status === 'reconciled') {
      Alert.alert(
        'Transacción conciliada',
        'No se puede modificar una transacción conciliada.',
      );
      return;
    }
    setEditor(summary);
  }

  const categories =
    data?.categoryGroups.flatMap(({ categories }) => categories) ?? [];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Transactions</Text>
          <OverflowMenu />
        </View>
        <View style={styles.searchArea}>
          <View style={styles.searchBox}>
            <MaterialCommunityIcons color="#667169" name="magnify" size={21} />
            <TextInput
              accessibilityLabel="Buscar transacciones"
              onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
              onChangeText={setSearchDraft}
              onFocus={() => setSearchFocused(true)}
              onSubmitEditing={() => applySearch('search')}
              placeholder="Search transactions"
              placeholderTextColor="#89918b"
              returnKeyType="search"
              style={styles.search}
              value={searchDraft}
            />
          </View>
          {searchFocused ? (
            <View style={styles.suggestions}>
              {searchDraft.trim() ? (
                (['search', 'payee', 'memo'] as const).map((field) => (
                  <Pressable
                    key={field}
                    onPress={() => applySearch(field)}
                    style={styles.suggestion}
                  >
                    <MaterialCommunityIcons
                      color="#315a3e"
                      name={
                        field === 'payee'
                          ? 'currency-eur'
                          : field === 'memo'
                            ? 'note-text-outline'
                            : 'magnify'
                      }
                      size={20}
                    />
                    <Text style={styles.suggestionText}>
                      {searchLabels[field]} contains: “{searchDraft.trim()}”
                    </Text>
                  </Pressable>
                ))
              ) : (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  style={styles.suggestionList}
                >
                  <SuggestionSection title="Accounts" />
                  {data?.accounts.accounts.map(({ account }) => (
                    <SuggestionOption
                      icon="bank-outline"
                      key={account.id}
                      label={account.name}
                      onPress={() => {
                        setAccountId(account.id);
                        setSearchFocused(false);
                      }}
                      selected={account.id === accountId}
                    />
                  ))}
                  <SuggestionSection title="Categories" />
                  {categories.map((category) => (
                    <SuggestionOption
                      icon="shape-outline"
                      key={category.id}
                      label={category.name}
                      onPress={() => {
                        setCategoryId(category.id);
                        setSearchFocused(false);
                      }}
                      selected={category.id === categoryId}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}
        </View>
        {appliedSearches.length > 0 || accountId || categoryId ? (
          <View style={styles.appliedSearches}>
            {appliedSearches.map(({ field, value }) => (
              <Pressable
                key={field}
                onPress={() => removeSearch(field)}
                style={styles.appliedSearch}
              >
                <Text style={styles.appliedSearchText}>
                  {searchLabels[field]}: {value}
                </Text>
                <MaterialCommunityIcons
                  color="#315a3e"
                  name="close"
                  size={16}
                />
              </Pressable>
            ))}
            {accountId ? (
              <AppliedFilter
                label={`Account: ${data?.accounts.accounts.find(({ account }) => account.id === accountId)?.account.name ?? accountId}`}
                onRemove={() => setAccountId(undefined)}
              />
            ) : null}
            {categoryId ? (
              <AppliedFilter
                label={`Category: ${categories.find(({ id }) => id === categoryId)?.name ?? categoryId}`}
                onRemove={() => setCategoryId(undefined)}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => void refresh()}
            refreshing={loading && data !== null}
          />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && !data ? <ActivityIndicator color="#294d36" /> : null}
        {data?.transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No hay transacciones</Text>
            <Text style={styles.emptyDescription}>
              {appliedSearches.length > 0 || accountId || categoryId
                ? 'No hay resultados para estos filtros.'
                : 'Registra tu primer ingreso o gasto.'}
            </Text>
          </View>
        ) : null}
        {data?.transactions.map((summary) => (
          <TransactionRow
            key={summary.transaction.id}
            onDelete={() => requestDelete(summary)}
            onEdit={() => edit(summary)}
            summary={summary}
          />
        ))}
      </ScrollView>

      <Pressable
        accessibilityLabel="Añadir transacción"
        accessibilityRole="button"
        onPress={() => setEditor('create')}
        style={styles.fab}
      >
        <Text style={styles.fabText}>+ Transaction</Text>
      </Pressable>

      {visibleEditor && data ? (
        <TransactionEditorModal
          accounts={data.accounts}
          categoryGroups={data.categoryGroups}
          payees={data.payees}
          onDismiss={dismissEditor}
          onSave={(input) =>
            save(
              input,
              visibleEditor === 'create'
                ? undefined
                : visibleEditor.transaction.id,
              visibleEditor === 'create'
                ? undefined
                : visibleEditor.transaction.transactionGroupId,
            )
          }
          linkedTransaction={
            visibleEditor === 'create' ||
            !visibleEditor.transaction.transactionGroupId
              ? undefined
              : data.allTransactions.find(
                  ({ transaction }) =>
                    transaction.transactionGroupId ===
                      visibleEditor.transaction.transactionGroupId &&
                    transaction.id !== visibleEditor.transaction.id,
                )
          }
          transaction={visibleEditor === 'create' ? undefined : visibleEditor}
        />
      ) : null}
    </SafeAreaView>
  );
}

function SuggestionSection({ title }: Readonly<{ title: string }>) {
  return (
    <View style={styles.suggestionSection}>
      <Text style={styles.suggestionSectionText}>{title}</Text>
      <View style={styles.suggestionSeparator} />
    </View>
  );
}

function SuggestionOption({
  icon,
  label,
  selected,
  onPress,
}: Readonly<{
  icon: 'bank-outline' | 'shape-outline';
  label: string;
  selected: boolean;
  onPress: () => void;
}>) {
  return (
    <Pressable onPress={onPress} style={styles.suggestion}>
      <MaterialCommunityIcons color="#315a3e" name={icon} size={20} />
      <Text style={styles.suggestionText}>{label}</Text>
      {selected ? (
        <MaterialCommunityIcons color="#315a3e" name="check" size={19} />
      ) : null}
    </Pressable>
  );
}

function AppliedFilter({
  label,
  onRemove,
}: Readonly<{ label: string; onRemove: () => void }>) {
  return (
    <Pressable onPress={onRemove} style={styles.appliedSearch}>
      <Text style={styles.appliedSearchText}>{label}</Text>
      <MaterialCommunityIcons color="#315a3e" name="close" size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f7f5' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomColor: '#dfe3dc',
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#18201a',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  searchArea: { position: 'relative', zIndex: 20 },
  searchBox: {
    minHeight: 44,
    paddingHorizontal: 14,
    backgroundColor: '#ecefeb',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  search: {
    flex: 1,
    minHeight: 44,
    color: '#18201a',
    fontSize: 15,
  },
  suggestions: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: '#ffffff',
    borderColor: '#dce1dc',
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 10,
  },
  suggestionList: { maxHeight: 380 },
  suggestion: {
    minHeight: 52,
    paddingHorizontal: 12,
    borderBottomColor: '#edf0ed',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestionText: {
    flex: 1,
    color: '#253028',
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionSection: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  suggestionSectionText: {
    color: '#737d76',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  suggestionSeparator: { height: 1, backgroundColor: '#e4e8e4', flex: 1 },
  appliedSearches: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  appliedSearch: {
    minHeight: 32,
    paddingHorizontal: 10,
    backgroundColor: '#e2ece4',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appliedSearchText: { color: '#315a3e', fontSize: 11, fontWeight: '700' },
  content: {
    width: '100%',
    maxWidth: 760,
    paddingHorizontal: 20,
    paddingBottom: 120,
    alignSelf: 'center',
  },
  error: {
    padding: 12,
    marginTop: 12,
    color: '#b42318',
    backgroundColor: '#fef3f2',
    borderRadius: 10,
  },
  emptyState: { paddingVertical: 70, alignItems: 'center', gap: 8 },
  emptyTitle: { color: '#253028', fontSize: 20, fontWeight: '700' },
  emptyDescription: { color: '#687268', fontSize: 15, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 22,
    minHeight: 52,
    paddingHorizontal: 20,
    backgroundColor: '#294d36',
    borderRadius: 26,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
});
