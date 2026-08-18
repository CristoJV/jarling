import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { CreateAccountInput } from '@/application/use-cases/accounts/create-account';
import type { AccountsOverview } from '@/application/use-cases/accounts/get-accounts';
import { useApplication } from '@/presentation/contexts/application-context';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

export function useAccounts() {
  const application = useApplication();
  const [overview, setOverview] = useState<AccountsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      setOverview(await application.accounts.getAll.execute());
    } catch (cause) {
      setError(domainErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [application]);

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
            setError(domainErrorMessage(cause));
            setLoading(false);
          }
        },
      );

      return () => {
        active = false;
      };
    }, [application]),
  );

  const createAccount = useCallback(
    async (input: CreateAccountInput) => {
      setError(null);

      try {
        await application.accounts.create.execute(input);
        await refresh();
      } catch (cause) {
        const message = domainErrorMessage(cause);
        setError(message);
        throw new Error(message, { cause });
      }
    },
    [application, refresh],
  );

  const closeAccount = useCallback(
    async (accountId: string) => {
      setError(null);

      try {
        await application.accounts.close.execute(accountId);
        await refresh();
      } catch (cause) {
        setError(domainErrorMessage(cause));
      }
    },
    [application, refresh],
  );

  return { overview, error, loading, refresh, createAccount, closeAccount };
}
