import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
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
import { TransactionRow } from '@/presentation/components/transactions/transaction-row';
import { useTransactions } from '@/presentation/hooks/use-transactions';
import { usePrefetchTransactionReferenceData } from '@/presentation/hooks/use-prefetch-transaction-reference-data';
import { useTranslation } from '@/presentation/localization/localization-provider';
import {
  MAIN_SCREEN_HEADER_HEIGHT,
  MAIN_SCREEN_HORIZONTAL_PADDING,
} from '@/presentation/layout/main-screen-layout';
import { routes } from '@/presentation/navigation/routes';
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

export function TransactionsScreen() {
  usePrefetchTransactionReferenceData();
  const parameters = useLocalSearchParams<{ category?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const searchLabels: Record<TransactionSearchField, string> = {
    search: t('transactions.anything'),
    payee: t('transactions.payee'),
    memo: t('transactions.memo'),
  };
  const searchInputRef = useRef<TextInput>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [appliedSearches, setAppliedSearches] = useState<
    readonly AppliedTransactionSearch[]
  >([]);
  const [accountId, setAccountId] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const uncategorized = parameters.category === 'uncategorized';
  const filters = useMemo(
    () => ({
      ...Object.fromEntries(
        appliedSearches.map(({ field, value }) => [field, value]),
      ),
      ...(accountId ? { accountId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(uncategorized ? { uncategorized: true } : {}),
    }),
    [accountId, appliedSearches, categoryId, uncategorized],
  );
  const {
    data,
    error,
    loading,
    loadingMore,
    refresh,
    loadMore,
    deleteTransaction,
  } = useTransactions(filters);

  const hasFilters =
    appliedSearches.length > 0 ||
    Boolean(accountId) ||
    Boolean(categoryId) ||
    uncategorized;

  function activateSearch() {
    setSearchActive(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function closeSearch() {
    setSearchDraft('');
    setSearchActive(false);
    Keyboard.dismiss();
  }

  function finishSearchStep() {
    setSearchDraft('');
    setSearchActive(false);
    Keyboard.dismiss();
  }

  function applySearch(field: TransactionSearchField) {
    const value = searchDraft.trim();
    if (!value) return;
    setAppliedSearches((current) =>
      upsertTransactionSearch(current, { field, value }),
    );
    finishSearchStep();
  }

  function removeSearch(field: TransactionSearchField) {
    setAppliedSearches((current) =>
      current.filter((filter) => filter.field !== field),
    );
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

  function edit(summary: TransactionSummary) {
    if (summary.transaction.status === 'reconciled') {
      Alert.alert(
        t('transactions.reconciledTitle'),
        t('transactions.reconciledBody'),
      );
      return;
    }
    router.push(routes.transaction(summary.transaction.id));
  }

  const categories =
    data?.categoryGroups.flatMap(({ categories }) => categories) ?? [];
  const selectedCategoryFilter = categories.find(({ id }) => id === categoryId);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        {searchActive ? (
          <>
            <Pressable
              accessibilityLabel={t('common.back')}
              hitSlop={8}
              onPress={closeSearch}
              style={styles.headerButton}
            >
              <MaterialCommunityIcons
                color={theme.colors.text}
                name="arrow-left"
                size={24}
              />
            </Pressable>
            <TextInput
              accessibilityLabel={t('transactions.search')}
              autoFocus
              onChangeText={setSearchDraft}
              onSubmitEditing={() => applySearch('search')}
              placeholder={
                hasFilters
                  ? t('transactions.refineSearch')
                  : t('transactions.search')
              }
              placeholderTextColor={theme.colors.textMuted}
              ref={searchInputRef}
              returnKeyType="search"
              style={styles.search}
              value={searchDraft}
            />
            <Pressable
              accessibilityLabel={
                searchDraft ? t('transactions.clearSearch') : t('common.close')
              }
              hitSlop={8}
              onPress={() => (searchDraft ? setSearchDraft('') : closeSearch())}
              style={styles.headerButton}
            >
              <MaterialCommunityIcons
                color={theme.colors.text}
                name="close"
                size={23}
              />
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>{t('transactions.title')}</Text>
            <Pressable
              accessibilityLabel={t('transactions.search')}
              hitSlop={8}
              onPress={activateSearch}
              style={styles.headerButton}
            >
              <MaterialCommunityIcons
                color={theme.colors.text}
                name="magnify"
                size={25}
              />
            </Pressable>
          </>
        )}
      </View>

      {hasFilters ? (
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
          {uncategorized ? (
            <AppliedFilter
              label={t('transactions.categoryFilter', {
                value: t('transactions.uncategorized'),
              })}
              onRemove={() => router.setParams({ category: '' })}
            />
          ) : null}
        </View>
      ) : null}

      {searchActive ? (
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
                <SuggestionSection title={t('transactions.accountsFilter')} />
                {data?.accounts.accounts.map(({ account }) => (
                  <SuggestionOption
                    icon="bank-outline"
                    key={account.id}
                    label={account.name}
                    onPress={() => {
                      setAccountId(account.id);
                      finishSearchStep();
                    }}
                    selected={account.id === accountId}
                  />
                ))}
                <SuggestionSection title={t('transactions.categoriesFilter')} />
                <SuggestionOption
                  key="uncategorized"
                  label={t('transactions.uncategorized')}
                  onPress={() => {
                    setCategoryId(undefined);
                    router.setParams({ category: 'uncategorized' });
                    finishSearchStep();
                  }}
                  selected={uncategorized}
                />
                {categories.map((category) => (
                  <SuggestionOption
                    icon="shape-outline"
                    key={category.id}
                    label={categoryDisplayName(category, t)}
                    onPress={() => {
                      router.setParams({ category: '' });
                      setCategoryId(category.id);
                      finishSearchStep();
                    }}
                    selected={category.id === categoryId && !uncategorized}
                  />
                ))}
              </>
            )}
          </ScrollView>
        </View>
      ) : null}

      <FlatList
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
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
                {hasFilters
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
            onEdit={() => edit(summary)}
            summary={summary}
          />
        )}
      />

      <Pressable
        accessibilityLabel={t('transactions.add')}
        accessibilityRole="button"
        onPress={() => router.push(routes.newTransaction())}
        style={styles.fab}
      >
        <Text style={styles.fabText}>+ {t('budget.addTransaction')}</Text>
      </Pressable>
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
  icon?: 'bank-outline' | 'shape-outline';
  label: string;
  selected: boolean;
  onPress: () => void;
}>) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onPress} style={styles.suggestion}>
      {icon ? (
        <MaterialCommunityIcons
          color={theme.colors.primary}
          name={icon}
          size={20}
        />
      ) : null}
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
      minHeight: MAIN_SCREEN_HEADER_HEIGHT,
      paddingHorizontal: MAIN_SCREEN_HORIZONTAL_PADDING,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      color: theme.colors.text,
      fontSize: 24,
      fontWeight: '700',
      letterSpacing: -0.6,
    },
    headerButton: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
    },
    search: {
      flex: 1,
      minHeight: 44,
      paddingHorizontal: 10,
      color: theme.colors.text,
      fontSize: 15,
    },
    suggestions: {
      position: 'absolute',
      top: MAIN_SCREEN_HEADER_HEIGHT,
      left: 12,
      right: 12,
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
      zIndex: 50,
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
    appliedSearches: {
      minHeight: 44,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },
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
