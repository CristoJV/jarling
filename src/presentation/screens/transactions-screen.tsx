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

export function TransactionsScreen() {
  const router = useRouter();
  const parameters = useLocalSearchParams<{ create?: string }>();
  const [search, setSearch] = useState('');
  const [accountId, setAccountId] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [editor, setEditor] = useState<EditorState>(null);
  const filters = useMemo(
    () => ({
      ...(search.trim() ? { search } : {}),
      ...(accountId ? { accountId } : {}),
      ...(categoryId ? { categoryId } : {}),
    }),
    [accountId, categoryId, search],
  );
  const { data, error, loading, refresh, save, deleteTransaction } =
    useTransactions(filters);
  const visibleEditor: EditorState =
    editor ?? (parameters.create === '1' ? 'create' : null);

  function dismissEditor() {
    setEditor(null);
    if (parameters.create === '1') {
      router.setParams({ create: '' });
    }
  }

  function requestDelete(summary: TransactionSummary) {
    Alert.alert(
      'Eliminar transacción',
      `Se eliminará ${summary.transaction.payee ?? 'esta transacción'} definitivamente.`,
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
        <TextInput
          accessibilityLabel="Buscar transacciones"
          onChangeText={setSearch}
          placeholder="Buscar payee o notas"
          placeholderTextColor="#89918b"
          style={styles.search}
          value={search}
        />
      </View>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterContent}>
            <FilterChip
              label="Todas las cuentas"
              onPress={() => setAccountId(undefined)}
              selected={!accountId}
            />
            {data?.accounts.accounts.map(({ account }) => (
              <FilterChip
                key={account.id}
                label={account.name}
                onPress={() => setAccountId(account.id)}
                selected={accountId === account.id}
              />
            ))}
          </View>
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterContent}>
            <FilterChip
              label="Todas las categorías"
              onPress={() => setCategoryId(undefined)}
              selected={!categoryId}
            />
            {categories.map((category) => (
              <FilterChip
                key={category.id}
                label={category.name}
                onPress={() => setCategoryId(category.id)}
                selected={categoryId === category.id}
              />
            ))}
          </View>
        </ScrollView>
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
              {search || accountId || categoryId
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
          onDismiss={dismissEditor}
          onSave={(input) =>
            save(
              input,
              visibleEditor === 'create'
                ? undefined
                : visibleEditor.transaction.id,
            )
          }
          transaction={visibleEditor === 'create' ? undefined : visibleEditor}
        />
      ) : null}
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: Readonly<{ label: string; selected: boolean; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.filterChip, selected && styles.filterChipSelected]}
    >
      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
        {label}
      </Text>
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
  search: {
    minHeight: 44,
    paddingHorizontal: 14,
    color: '#18201a',
    backgroundColor: '#ecefeb',
    borderRadius: 12,
    fontSize: 15,
  },
  filters: {
    paddingVertical: 9,
    borderBottomColor: '#e4e7e2',
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 7,
  },
  filterContent: { paddingHorizontal: 16, flexDirection: 'row', gap: 7 },
  filterChip: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderColor: '#d8ddd7',
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipSelected: { backgroundColor: '#294d36', borderColor: '#294d36' },
  filterText: { color: '#657068', fontSize: 12, fontWeight: '600' },
  filterTextSelected: { color: '#ffffff' },
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
