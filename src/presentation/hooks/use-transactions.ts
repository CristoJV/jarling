import { useCallback, useRef, useState } from 'react';

import type { AccountsOverview } from '@/application/use-cases/accounts/get-accounts';
import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type {
  GetTransactionsInput,
  TransactionSummary,
} from '@/application/use-cases/transactions/get-transactions';
import { useApplication } from '@/presentation/contexts/application-context';
import { useFocusedResource } from '@/presentation/hooks/use-focused-resource';

export type TransactionScreenData = Readonly<{
  transactions: readonly TransactionSummary[];
  hasMore: boolean;
  accounts: AccountsOverview;
  categoryGroups: readonly CategoryGroupSummary[];
}>;

const PAGE_SIZE = 100;

export function useTransactions(filters: GetTransactionsInput) {
  const application = useApplication();
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const load = useCallback(async () => {
    const [transactions, accounts, categoryGroups] = await Promise.all([
      application.transactions.getAll.execute({
        ...filters,
        limit: PAGE_SIZE,
      }),
      application.accounts.getAll.execute(),
      application.categories.getGroups.execute(),
    ]);
    return {
      transactions,
      hasMore: transactions.length === PAGE_SIZE,
      accounts,
      categoryGroups,
    };
  }, [application, filters]);

  const { data, error, loading, refresh, reportError, clearError, updateData } =
    useFocusedResource<TransactionScreenData>(load);

  const deleteTransaction = useCallback(
    async (transactionId: string) => {
      clearError();
      try {
        await application.transactions.delete.execute(transactionId);
        await refresh();
      } catch (cause) {
        reportError(cause);
      }
    },
    [application, clearError, refresh, reportError],
  );

  const loadMore = useCallback(async () => {
    if (!data?.hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const last = data.transactions.at(-1)?.transaction;
      const transactions = await application.transactions.getAll.execute({
        ...filters,
        limit: PAGE_SIZE,
        ...(last
          ? {
              before: {
                date: last.date,
                createdAt: last.createdAt,
                id: last.id,
              },
            }
          : {}),
      });
      updateData((current) =>
        current
          ? {
              ...current,
              transactions: [...current.transactions, ...transactions],
              hasMore: transactions.length === PAGE_SIZE,
            }
          : current,
      );
    } catch (cause) {
      reportError(cause);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [application, data, filters, reportError, updateData]);

  return {
    data,
    error,
    loading,
    loadingMore,
    refresh,
    loadMore,
    deleteTransaction,
  };
}
