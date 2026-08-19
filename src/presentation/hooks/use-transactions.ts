import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import type { AccountsOverview } from '@/application/use-cases/accounts/get-accounts';
import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type {
  GetTransactionsInput,
  TransactionSummary,
} from '@/application/use-cases/transactions/get-transactions';
import type { TransactionInput } from '@/application/use-cases/transactions/transaction-input';
import type { TransferInput } from '@/application/use-cases/transfers/transfer-input';
import { useApplication } from '@/presentation/contexts/application-context';
import { useTranslation } from '@/presentation/localization/localization-provider';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

export type TransactionScreenData = Readonly<{
  transactions: readonly TransactionSummary[];
  hasMore: boolean;
  accounts: AccountsOverview;
  categoryGroups: readonly CategoryGroupSummary[];
  payees: readonly string[];
}>;

const PAGE_SIZE = 100;

export type TransactionEditorInput = TransactionInput | TransferInput;

export function useTransactions(filters: GetTransactionsInput) {
  const application = useApplication();
  const { t } = useTranslation();
  const [data, setData] = useState<TransactionScreenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const load = useCallback(async () => {
    const [transactions, accounts, categoryGroups, payees] = await Promise.all([
      application.transactions.getAll.execute({
        ...filters,
        limit: PAGE_SIZE,
      }),
      application.accounts.getAll.execute(),
      application.categories.getGroups.execute(),
      application.transactions.getPayees.execute(),
    ]);
    return {
      transactions,
      hasMore: transactions.length === PAGE_SIZE,
      accounts,
      categoryGroups,
      payees,
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

  const save = useCallback(
    async (
      input: TransactionEditorInput,
      transactionId?: string,
      transactionGroupId?: string,
    ) => {
      setError(null);
      try {
        if (input.kind === 'transfer') {
          if (transactionGroupId) {
            await application.transfers.update.execute({
              ...input,
              transactionGroupId,
            });
          } else {
            await application.transfers.create.execute(input);
          }
        } else if (transactionId) {
          await application.transactions.update.execute({
            ...input,
            id: transactionId,
          });
        } else {
          await application.transactions.create.execute(input);
        }
        await refresh();
      } catch (cause) {
        const message = domainErrorMessage(cause, t);
        setError(message);
        throw new Error(message, { cause });
      }
    },
    [application, refresh, t],
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

  const getLinkedTransaction = useCallback(
    async (transactionGroupId: string, currentId: string) => {
      const group = await application.transactions.getAll.execute({
        transactionGroupId,
        limit: 2,
      });
      return group.find(({ transaction }) => transaction.id !== currentId);
    },
    [application],
  );

  return {
    data,
    error,
    loading,
    loadingMore,
    refresh,
    loadMore,
    getLinkedTransaction,
    save,
    deleteTransaction,
  };
}
