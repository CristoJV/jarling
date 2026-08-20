import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { AccountsOverview } from '@/application/use-cases/accounts/get-accounts';
import type { ReconciliationPreview } from '@/application/use-cases/accounts/get-reconciliation';
import type { ReconcileAccountInput } from '@/application/use-cases/accounts/reconcile-account';
import { useApplication } from '@/presentation/contexts/application-context';
import { useTranslation } from '@/presentation/localization/localization-provider';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

export function useAccounts() {
  const application = useApplication();
  const { t } = useTranslation();
  const [overview, setOverview] = useState<AccountsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      setOverview(await application.accounts.getAll.execute());
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
    } finally {
      setLoading(false);
    }
  }, [application, t]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      application.accounts.getAll.execute().then(
        (result) => {
          if (active) {
            setOverview(result);
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
    }, [application, t]),
  );

  const closeAccount = useCallback(
    async (accountId: string) => {
      setError(null);

      try {
        await application.accounts.close.execute(accountId);
        await refresh();
      } catch (cause) {
        setError(domainErrorMessage(cause, t));
      }
    },
    [application, refresh, t],
  );

  const getReconciliation = useCallback(
    async (accountId: string): Promise<ReconciliationPreview> => {
      try {
        return await application.accounts.getReconciliation.execute(accountId);
      } catch (cause) {
        const message = domainErrorMessage(cause, t);
        setError(message);
        throw new Error(message, { cause });
      }
    },
    [application, t],
  );

  const reconcile = useCallback(
    async (input: ReconcileAccountInput) => {
      try {
        const result = await application.accounts.reconcile.execute(input);
        await refresh();
        return result;
      } catch (cause) {
        const message = domainErrorMessage(cause, t);
        setError(message);
        throw new Error(message, { cause });
      }
    },
    [application, refresh, t],
  );

  return {
    overview,
    error,
    loading,
    refresh,
    closeAccount,
    getReconciliation,
    reconcile,
  };
}
