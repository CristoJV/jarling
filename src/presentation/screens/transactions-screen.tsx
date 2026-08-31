import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { TransactionSummary } from '@/application/use-cases/transactions/get-transactions';
import type { TransactionStatus } from '@/domain/entities/transaction';
import { SelectCategoryScreen } from '@/presentation/components/categories/select-category-screen';
import { FullScreenSelectionScreen } from '@/presentation/components/common/full-screen-selection-screen';
import { NativeDatePicker } from '@/presentation/components/common/native-date-picker';
import { TransactionFilters } from '@/presentation/components/transactions/transaction-filters';
import { TransactionRow } from '@/presentation/components/transactions/transaction-row';
import { TransactionSearchHeader } from '@/presentation/components/transactions/transaction-search-header';
import { TransactionSearchSuggestions } from '@/presentation/components/transactions/transaction-search-suggestions';
import { usePrefetchTransactionReferenceData } from '@/presentation/hooks/use-prefetch-transaction-reference-data';
import { useTransactions } from '@/presentation/hooks/use-transactions';
import { useTranslation } from '@/presentation/localization/localization-provider';
import { routes } from '@/presentation/navigation/routes';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { categoryDisplayName } from '@/presentation/utils/category-name';
import {
  createTransactionDatePreset,
  setCustomTransactionDate,
  type TransactionDateFilter,
  type TransactionDatePreset,
  todayIsoDate,
} from '@/presentation/utils/transaction-date-filter';
import {
  type AppliedTransactionSearch,
  buildTransactionQuery,
  type TransactionFilterChip,
  type TransactionFilterKey,
  type TransactionSearchField,
  upsertTransactionSearch,
} from '@/presentation/utils/transaction-search';

const UNCATEGORIZED_SUGGESTION_ID = '__uncategorized__';

export function TransactionsScreen() {
  usePrefetchTransactionReferenceData();
  const parameters = useLocalSearchParams<{ category?: string }>();
  const router = useRouter();
  const { language, t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [appliedSearches, setAppliedSearches] = useState<
    readonly AppliedTransactionSearch[]
  >([]);
  const [accountId, setAccountId] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [status, setStatus] = useState<TransactionStatus | undefined>();
  const [dateFilter, setDateFilter] = useState<TransactionDateFilter>();
  const [selection, setSelection] = useState<'account' | 'category' | null>(
    null,
  );
  const [dateBoundary, setDateBoundary] = useState<'from' | 'to' | null>(null);
  const uncategorized = parameters.category === 'uncategorized';
  const filters = useMemo(
    () =>
      buildTransactionQuery({
        searches: appliedSearches,
        accountId,
        categoryId,
        dateFilter,
        status,
        uncategorized,
      }),
    [accountId, appliedSearches, categoryId, dateFilter, status, uncategorized],
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

  const searchLabels: Record<TransactionSearchField, string> = {
    search: t('transactions.anything'),
    payee: t('transactions.payee'),
    memo: t('transactions.memo'),
  };
  const statusLabels: Record<TransactionStatus, string> = {
    uncleared: t('transactions.uncleared'),
    cleared: t('transactions.cleared'),
    reconciled: t('transactions.reconciled'),
  };
  const categories =
    data?.categoryGroups.flatMap(({ categories }) => categories) ?? [];
  const accountSuggestions =
    data?.accounts.accounts.map(({ account }) => ({
      id: account.id,
      label: account.name,
    })) ?? [];
  const categorySuggestions = [
    {
      id: UNCATEGORIZED_SUGGESTION_ID,
      label: t('transactions.uncategorized'),
    },
    ...categories.map((category) => ({
      id: category.id,
      label: categoryDisplayName(category, t),
    })),
  ];
  const activeFilters = buildFilterChips({
    accountId,
    accountSuggestions,
    appliedSearches,
    categoryId,
    categorySuggestions,
    dateFilter,
    language,
    searchLabels,
    status,
    statusLabels,
    t,
    uncategorized,
  });
  const hasFilters = activeFilters.length > 0;

  function closeSearch() {
    setSearchDraft('');
    setSearchActive(false);
    Keyboard.dismiss();
  }

  function finishSearchStep() {
    closeSearch();
  }

  function applyTextSearch(field: TransactionSearchField) {
    const value = searchDraft.trim();
    if (!value) return;
    setAppliedSearches((current) =>
      upsertTransactionSearch(current, { field, value }),
    );
    finishSearchStep();
  }

  function selectAccount(nextAccountId: string) {
    setAccountId(nextAccountId);
    finishSearchStep();
  }

  function selectCategory(nextCategoryId: string) {
    router.setParams({ category: '' });
    setCategoryId(nextCategoryId);
    finishSearchStep();
  }

  function selectUncategorized() {
    setCategoryId(undefined);
    router.setParams({ category: 'uncategorized' });
    finishSearchStep();
  }

  function selectStatus(nextStatus: TransactionStatus) {
    setStatus(nextStatus);
    finishSearchStep();
  }

  function selectDatePreset(preset: TransactionDatePreset) {
    setDateFilter(createTransactionDatePreset(preset, todayIsoDate()));
    finishSearchStep();
  }

  function changeDateBoundary(boundary: 'from' | 'to', value: string) {
    setDateFilter((current) =>
      setCustomTransactionDate(current, boundary, value),
    );
  }

  function editFilter(key: TransactionFilterKey) {
    if (key === 'account') setSelection('account');
    else if (key === 'category' || key === 'uncategorized') {
      setSelection('category');
    } else {
      setSearchDraft('');
      setSearchActive(true);
    }
  }

  function removeFilter(key: TransactionFilterKey) {
    if (key === 'account') setAccountId(undefined);
    else if (key === 'category') setCategoryId(undefined);
    else if (key === 'date') setDateFilter(undefined);
    else if (key === 'status') setStatus(undefined);
    else if (key === 'uncategorized') router.setParams({ category: '' });
    else {
      setAppliedSearches((current) =>
        current.filter(({ field }) => field !== key),
      );
    }
  }

  function requestDelete(summary: TransactionSummary) {
    const transfer = summary.transaction.kind === 'transfer';
    const reconciled = summary.transaction.status === 'reconciled';
    Alert.alert(
      transfer
        ? t('transactions.deleteTransfer')
        : t('transactions.deleteConfirmTitle'),
      reconciled
        ? t('transactions.deleteReconciledBody')
        : transfer
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
    router.push(routes.transaction(summary.transaction.id));
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <TransactionSearchHeader
        active={searchActive}
        hasFilters={hasFilters}
        onActivate={() => setSearchActive(true)}
        onCancel={closeSearch}
        onChangeText={setSearchDraft}
        onSubmit={() => applyTextSearch('search')}
        value={searchDraft}
      />
      <TransactionFilters
        filters={activeFilters}
        onPress={editFilter}
        onRemove={removeFilter}
      />

      {searchActive ? (
        <TransactionSearchSuggestions
          dateFilter={dateFilter}
          onSelectAccount={() => setSelection('account')}
          onSelectCategory={() => setSelection('category')}
          onSelectDateBoundary={setDateBoundary}
          onSelectDatePreset={selectDatePreset}
          onSelectStatus={selectStatus}
          onSelectText={applyTextSearch}
          onSelectUncategorized={selectUncategorized}
          searchLabels={searchLabels}
          statuses={(['cleared', 'uncleared', 'reconciled'] as const).map(
            (value) => ({ value, label: statusLabels[value] }),
          )}
          value={searchDraft}
        />
      ) : (
        <>
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
        </>
      )}

      {selection === 'account' ? (
        <FullScreenSelectionScreen
          onBack={() => setSelection(null)}
          onSelect={selectAccount}
          options={accountSuggestions.map(({ id, label }) => ({
            value: id,
            label,
          }))}
          overlay
          selectedValue={accountId}
          title={t('transactions.chooseAccount')}
        />
      ) : null}

      {selection === 'category' ? (
        <SelectCategoryScreen
          allowCreateCategory={false}
          groups={data?.categoryGroups ?? []}
          onBack={() => setSelection(null)}
          onSelect={(next) => {
            if (next.kind === 'category') selectCategory(next.category.id);
            else if (next.kind === 'uncategorized') selectUncategorized();
          }}
          overlay
          selectedCategoryId={categoryId}
          selectedSpecial={uncategorized ? 'uncategorized' : undefined}
          showUncategorized
          title={t('transactions.chooseCategory')}
        />
      ) : null}

      {dateBoundary ? (
        <NativeDatePicker
          minimumDate={dateBoundary === 'to' ? dateFilter?.dateFrom : undefined}
          onChange={(value) => changeDateBoundary(dateBoundary, value)}
          onDismiss={() => {
            setDateBoundary(null);
            finishSearchStep();
          }}
          title={
            dateBoundary === 'from'
              ? t('transactions.fromDate')
              : t('transactions.toDate')
          }
          value={datePickerValue(dateBoundary, dateFilter)}
        />
      ) : null}
    </SafeAreaView>
  );
}

type ChipInput = Readonly<{
  accountId?: string;
  accountSuggestions: readonly Readonly<{ id: string; label: string }>[];
  appliedSearches: readonly AppliedTransactionSearch[];
  categoryId?: string;
  categorySuggestions: readonly Readonly<{ id: string; label: string }>[];
  dateFilter?: TransactionDateFilter;
  language: string;
  searchLabels: Readonly<Record<TransactionSearchField, string>>;
  status?: TransactionStatus;
  statusLabels: Readonly<Record<TransactionStatus, string>>;
  t: ReturnType<typeof useTranslation>['t'];
  uncategorized: boolean;
}>;

function buildFilterChips({
  accountId,
  accountSuggestions,
  appliedSearches,
  categoryId,
  categorySuggestions,
  dateFilter,
  language,
  searchLabels,
  status,
  statusLabels,
  t,
  uncategorized,
}: ChipInput): readonly TransactionFilterChip[] {
  return [
    ...appliedSearches.map(({ field, value }) => ({
      key: field,
      label: `${searchLabels[field]}: ${value}`,
    })),
    ...(accountId
      ? [
          {
            key: 'account' as const,
            label: t('transactions.accountFilter', {
              value:
                accountSuggestions.find(({ id }) => id === accountId)?.label ??
                accountId,
            }),
          },
        ]
      : []),
    ...(categoryId
      ? [
          {
            key: 'category' as const,
            label: t('transactions.categoryFilter', {
              value:
                categorySuggestions.find(({ id }) => id === categoryId)
                  ?.label ?? categoryId,
            }),
          },
        ]
      : []),
    ...(uncategorized
      ? [
          {
            key: 'uncategorized' as const,
            label: t('transactions.categoryFilter', {
              value: t('transactions.uncategorized'),
            }),
          },
        ]
      : []),
    ...(status
      ? [
          {
            key: 'status' as const,
            label: t('transactions.statusFilter', {
              value: statusLabels[status],
            }),
          },
        ]
      : []),
    ...(dateFilter
      ? [
          {
            key: 'date' as const,
            label: t('transactions.dateRangeFilter', {
              value: dateFilterLabel(dateFilter, language, t),
            }),
          },
        ]
      : []),
  ];
}

function datePickerValue(
  boundary: 'from' | 'to',
  filter?: TransactionDateFilter,
) {
  if (boundary === 'from') return filter?.dateFrom ?? todayIsoDate();
  return filter?.dateTo ?? filter?.dateFrom ?? todayIsoDate();
}

function dateFilterLabel(
  filter: TransactionDateFilter,
  language: string,
  t: ReturnType<typeof useTranslation>['t'],
) {
  const presetLabels: Record<TransactionDatePreset, string> = {
    'this-week': t('transactions.thisWeek'),
    'previous-week': t('transactions.previousWeek'),
    'this-month': t('transactions.thisMonth'),
    'previous-month': t('transactions.previousMonth'),
  };
  if (filter.kind !== 'custom') return presetLabels[filter.kind];
  const formatter = new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const from = filter.dateFrom
    ? formatter.format(new Date(`${filter.dateFrom}T12:00:00`))
    : undefined;
  const to = filter.dateTo
    ? formatter.format(new Date(`${filter.dateTo}T12:00:00`))
    : undefined;
  if (from && to) return `${from} – ${to}`;
  if (from) return t('transactions.fromDateValue', { value: from });
  return t('transactions.toDateValue', { value: to ?? '' });
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
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
      elevation: theme.elevation.floating,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fabText: { color: theme.colors.onPrimary, fontSize: 14, fontWeight: '700' },
  });
