import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import type { AccountsOverview } from '@/application/use-cases/accounts/get-accounts';
import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type {
  GetTransactionsInput,
  TransactionSummary,
} from '@/application/use-cases/transactions/get-transactions';
import { useApplication } from '@/presentation/contexts/application-context';
import { useTranslation } from '@/presentation/localization/localization-provider';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

export type TransactionScreenData = Readonly<{
  transactions: readonly TransactionSummary[];
  hasMore: boolean;
  accounts: AccountsOverview;
  categoryGroups: readonly CategoryGroupSummary[];
}>;

const PAGE_SIZE = 100;

export function useTransactions(filters: GetTransactionsInput) {
  const application = useApplication();
  const { t } = useTranslation();
  const [data, setData] = useState<TransactionScreenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setData(await load());
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
    } finally {
      setLoading(false);
    }
  }, [load, t]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      load().then(
        (result) => {
          if (active) {
            setData(result);
            setLoading(false);
          }
        },
        (cause: unknown) => {
          if (active) {
            setError(domainErrorMessage(cause, t));
            setLoading(false);
          }
        },
      );

      return () => {
        active = false;
      };
    }, [load, t]),
  );

  const deleteTransaction = useCallback(
    async (transactionId: string) => {
      setError(null);
      try {
        await application.transactions.delete.execute(transactionId);
        await refresh();
      } catch (cause) {
        setError(domainErrorMessage(cause, t));
      }
    },
    [application, refresh, t],
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
      setData((current) =>
        current
          ? {
              ...current,
              transactions: [...current.transactions, ...transactions],
              hasMore: transactions.length === PAGE_SIZE,
            }
          : current,
      );
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [application, data, filters, t]);

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
