import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import {
  type AppliedTransactionSearch,
  type TransactionSearchField,
  upsertTransactionSearch,
} from '@/presentation/utils/transaction-search';
import { categoryDisplayName } from '@/presentation/utils/category-name';

type EditorState = 'create' | TransactionSummary | null;

export function TransactionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const searchLabels: Record<TransactionSearchField, string> = {
    search: t('transactions.anything'),
    payee: t('transactions.payee'),
    memo: t('transactions.memo'),
  };
  const parameters = useLocalSearchParams<{ create?: string }>();
  const [searchDraft, setSearchDraft] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [appliedSearches, setAppliedSearches] = useState<
    readonly AppliedTransactionSearch[]
  >([]);
  const [accountId, setAccountId] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [editor, setEditor] = useState<EditorState>(null);
  const [linkedTransaction, setLinkedTransaction] =
    useState<TransactionSummary>();
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
  const {
    data,
    error,
    loading,
    loadingMore,
    refresh,
    loadMore,
    getLinkedTransaction,
    save,
    deleteTransaction,
  } = useTransactions(filters);
  const visibleEditor: EditorState =
    editor ?? (parameters.create === '1' ? 'create' : null);

  function continueRefiningSearch() {
    setSearchDraft('');
    setSearchFocused(true);
  }

  function applySearch(field: TransactionSearchField) {
    const value = searchDraft.trim();
    if (!value) return;
    setAppliedSearches((current) =>
      upsertTransactionSearch(current, { field, value }),
    );
    continueRefiningSearch();
  }

  function removeSearch(field: TransactionSearchField) {
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
    const transfer = summary.transaction.kind === 'transfer';
    Alert.alert(
      transfer
        ? t('transactions.deleteTransfer')
        : t('transactions.deleteConfirmTitle'),
      transfer
        ? t('transactions.deleteTransferBody')
        : t('transactions.deleteConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => void deleteTransaction(summary.transaction.id),
        },
      ],
    );
  }

  async function edit(summary: TransactionSummary) {
    if (summary.transaction.status === 'reconciled') {
      Alert.alert(
        t('transactions.reconciledTitle'),
        t('transactions.reconciledBody'),
      );
      return;
    }
    setLinkedTransaction(
      summary.transaction.kind === 'transfer' &&
        summary.transaction.transactionGroupId
        ? await getLinkedTransaction(
            summary.transaction.transactionGroupId,
            summary.transaction.id,
          )
        : undefined,
    );
    setEditor(summary);
  }

  const categories =
    data?.categoryGroups.flatMap(({ categories }) => categories) ?? [];
  const selectedCategoryFilter = categories.find(({ id }) => id === categoryId);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t('transactions.title')}</Text>
          <OverflowMenu />
        </View>
        <View style={styles.searchArea}>
          <View style={styles.searchBox}>
            <MaterialCommunityIcons
              color={theme.colors.textMuted}
              name="magnify"
              size={21}
            />
            <TextInput
              accessibilityLabel={t('transactions.search')}
              onBlur={() => setSearchFocused(false)}
              onChangeText={setSearchDraft}
              onFocus={() => setSearchFocused(true)}
              onSubmitEditing={() => applySearch('search')}
              placeholder={t('transactions.search')}
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="search"
              style={styles.search}
              value={searchDraft}
            />
          </View>
          {searchFocused ? (
            <View style={styles.suggestions}>
              <ScrollView
                keyboardShouldPersistTaps="always"
                style={styles.suggestionList}
              >
                {searchDraft.trim() ? (
                  (['search', 'payee', 'memo'] as const).map((field) => (
                    <Pressable
                      key={field}
                      onPress={() => applySearch(field)}
                      style={styles.suggestion}
                    >
                      <MaterialCommunityIcons
                        color={theme.colors.primary}
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
                        {t('transactions.contains', {
                          field: searchLabels[field],
                          value: searchDraft.trim(),
                        })}
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <>
                    <SuggestionSection
                      title={t('transactions.accountsFilter')}
                    />
                    {data?.accounts.accounts.map(({ account }) => (
                      <SuggestionOption
                        icon="bank-outline"
                        key={account.id}
                        label={account.name}
                        onPress={() => {
                          setAccountId(account.id);
                          continueRefiningSearch();
                        }}
                        selected={account.id === accountId}
                      />
                    ))}
                    <SuggestionSection
                      title={t('transactions.categoriesFilter')}
                    />
                    {categories.map((category) => (
                      <SuggestionOption
                        icon="shape-outline"
                        key={category.id}
                        label={categoryDisplayName(category, t)}
                        onPress={() => {
                          setCategoryId(category.id);
                          continueRefiningSearch();
                        }}
                        selected={category.id === categoryId}
                      />
                    ))}
                  </>
                )}
              </ScrollView>
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
                  color={theme.colors.primary}
                  name="close"
                  size={16}
                />
              </Pressable>
            ))}
            {accountId ? (
              <AppliedFilter
                label={t('transactions.accountFilter', {
                  value:
                    data?.accounts.accounts.find(
                      ({ account }) => account.id === accountId,
                    )?.account.name ?? accountId,
                })}
                onRemove={() => setAccountId(undefined)}
              />
            ) : null}
            {categoryId ? (
              <AppliedFilter
                label={t('transactions.categoryFilter', {
                  value:
                    (selectedCategoryFilter
                      ? categoryDisplayName(selectedCategoryFilter, t)
                      : categoryId) ?? '',
                })}
                onRemove={() => setCategoryId(undefined)}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={data?.transactions ?? []}
        keyExtractor={(summary) => summary.transaction.id}
        ListEmptyComponent={
          loading && !data ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {t('transactions.noTransactions')}
              </Text>
              <Text style={styles.emptyDescription}>
                {appliedSearches.length > 0 || accountId || categoryId
                  ? t('transactions.noResults')
                  : t('transactions.emptyHint')}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : null
        }
        ListHeaderComponent={
          error ? <Text style={styles.error}>{error}</Text> : null
        }
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            onRefresh={() => void refresh()}
            refreshing={loading && data !== null}
          />
        }
        renderItem={({ item: summary }) => (
          <TransactionRow
            onDelete={() => requestDelete(summary)}
            onEdit={() => void edit(summary)}
            summary={summary}
          />
        )}
      />

      <Pressable
        accessibilityLabel={t('transactions.add')}
        accessibilityRole="button"
        onPress={() => {
          setLinkedTransaction(undefined);
          setEditor('create');
        }}
        style={styles.fab}
      >
        <Text style={styles.fabText}>+ {t('budget.addTransaction')}</Text>
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
            visibleEditor === 'create' ? undefined : linkedTransaction
          }
          transaction={visibleEditor === 'create' ? undefined : visibleEditor}
        />
      ) : null}
    </SafeAreaView>
  );
}

function SuggestionSection({ title }: Readonly<{ title: string }>) {
  const styles = useThemedStyles(createStyles);
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
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onPress} style={styles.suggestion}>
      <MaterialCommunityIcons
        color={theme.colors.primary}
        name={icon}
        size={20}
      />
      <Text style={styles.suggestionText}>{label}</Text>
      {selected ? (
        <MaterialCommunityIcons
          color={theme.colors.primary}
          name="check"
          size={19}
        />
      ) : null}
    </Pressable>
  );
}

function AppliedFilter({
  label,
  onRemove,
}: Readonly<{ label: string; onRemove: () => void }>) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onRemove} style={styles.appliedSearch}>
      <Text style={styles.appliedSearchText}>{label}</Text>
      <MaterialCommunityIcons
        color={theme.colors.primary}
        name="close"
        size={16}
      />
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 14,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 12,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      color: theme.colors.text,
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.6,
    },
    searchArea: { position: 'relative', zIndex: 20 },
    searchBox: {
      minHeight: 44,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    search: {
      flex: 1,
      minHeight: 44,
      color: theme.colors.text,
      fontSize: 15,
    },
    suggestions: {
      position: 'absolute',
      top: 50,
      left: 0,
      right: 0,
      padding: 8,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
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
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    suggestionText: {
      flex: 1,
      color: theme.colors.text,
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
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    suggestionSeparator: {
      height: 1,
      backgroundColor: theme.colors.border,
      flex: 1,
    },
    appliedSearches: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    appliedSearch: {
      minHeight: 32,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    appliedSearchText: {
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: '700',
    },
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
      color: theme.colors.negative,
      backgroundColor: theme.colors.negativeMuted,
      borderRadius: 10,
    },
    emptyState: { paddingVertical: 70, alignItems: 'center', gap: 8 },
    emptyTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
    emptyDescription: {
      color: theme.colors.textMuted,
      fontSize: 15,
      textAlign: 'center',
    },
    fab: {
      position: 'absolute',
      right: 22,
      bottom: 22,
      minHeight: 52,
      paddingHorizontal: 20,
      backgroundColor: theme.colors.primary,
      borderRadius: 26,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fabText: { color: theme.colors.onPrimary, fontSize: 14, fontWeight: '700' },
  });
