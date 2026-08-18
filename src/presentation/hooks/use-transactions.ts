import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { AccountsOverview } from '@/application/use-cases/accounts/get-accounts';
import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type {
  GetTransactionsInput,
  TransactionSummary,
} from '@/application/use-cases/transactions/get-transactions';
import type { TransactionInput } from '@/application/use-cases/transactions/transaction-input';
import type { TransferInput } from '@/application/use-cases/transfers/transfer-input';
import { useApplication } from '@/presentation/contexts/application-context';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

export type TransactionScreenData = Readonly<{
  transactions: readonly TransactionSummary[];
  allTransactions: readonly TransactionSummary[];
  accounts: AccountsOverview;
  categoryGroups: readonly CategoryGroupSummary[];
  payees: readonly string[];
}>;

export type TransactionEditorInput = TransactionInput | TransferInput;

export function useTransactions(filters: GetTransactionsInput) {
  const application = useApplication();
  const [data, setData] = useState<TransactionScreenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [transactions, allTransactions, accounts, categoryGroups, payees] =
      await Promise.all([
        application.transactions.getAll.execute(filters),
        application.transactions.getAll.execute(),
        application.accounts.getAll.execute(),
        application.categories.getGroups.execute(),
        application.transactions.getPayees.execute(),
      ]);
    return { transactions, allTransactions, accounts, categoryGroups, payees };
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
