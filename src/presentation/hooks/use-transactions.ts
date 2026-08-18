import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { AccountsOverview } from '@/application/use-cases/accounts/get-accounts';
import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type {
  GetTransactionsInput,
  TransactionSummary,
} from '@/application/use-cases/transactions/get-transactions';
import type { TransactionInput } from '@/application/use-cases/transactions/transaction-input';
import { useApplication } from '@/presentation/contexts/application-context';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

export type TransactionScreenData = Readonly<{
  transactions: readonly TransactionSummary[];
  accounts: AccountsOverview;
  categoryGroups: readonly CategoryGroupSummary[];
}>;

export function useTransactions(filters: GetTransactionsInput) {
  const application = useApplication();
  const [data, setData] = useState<TransactionScreenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [transactions, accounts, categoryGroups] = await Promise.all([
      application.transactions.getAll.execute(filters),
      application.accounts.getAll.execute(),
      application.categories.getGroups.execute(),
    ]);
    return { transactions, accounts, categoryGroups };
  }, [application, filters]);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setData(await load());
    } catch (cause) {
      setError(domainErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [load]);

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
            setError(domainErrorMessage(cause));
            setLoading(false);
          }
        },
      );

      return () => {
        active = false;
      };
    }, [load]),
  );

  const save = useCallback(
    async (input: TransactionInput, transactionId?: string) => {
      setError(null);
      try {
        if (transactionId) {
          await application.transactions.update.execute({
            ...input,
            id: transactionId,
          });
        } else {
          await application.transactions.create.execute(input);
        }
        await refresh();
      } catch (cause) {
        const message = domainErrorMessage(cause);
        setError(message);
        throw new Error(message, { cause });
      }
    },
    [application, refresh],
  );

  const deleteTransaction = useCallback(
    async (transactionId: string) => {
      setError(null);
      try {
        await application.transactions.delete.execute(transactionId);
        await refresh();
      } catch (cause) {
        setError(domainErrorMessage(cause));
      }
    },
    [application, refresh],
  );

  return { data, error, loading, refresh, save, deleteTransaction };
}
