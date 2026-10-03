import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, type SetStateAction } from 'react';

import { useTranslation } from '@/presentation/localization/localization-provider';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

export function useFocusedResource<Value>(load: () => Promise<Value>) {
  const { t } = useTranslation();
  const requestId = useRef(0);
  const focused = useRef(false);
  const [data, setData] = useState<Value | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reportError = useCallback(
    (cause: unknown) => {
      const message = domainErrorMessage(cause, t);
      if (focused.current) setError(message);
      return message;
    },
    [t],
  );

  const refresh = useCallback(async () => {
    if (!focused.current) return;
    const currentRequest = ++requestId.current;
    setError(null);
    setLoading(true);
    try {
      const result = await load();
      if (focused.current && requestId.current === currentRequest) {
        setData(result);
      }
    } catch (cause) {
      if (focused.current && requestId.current === currentRequest) {
        setError(domainErrorMessage(cause, t));
      }
    } finally {
      if (focused.current && requestId.current === currentRequest) {
        setLoading(false);
      }
    }
  }, [load, t]);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      void refresh();
      return () => {
        focused.current = false;
        requestId.current += 1;
      };
    }, [refresh]),
  );

  const clearError = useCallback(() => setError(null), []);
  const updateData = useCallback((update: SetStateAction<Value | null>) => {
    if (focused.current) setData(update);
  }, []);
  return {
    data,
    error,
    loading,
    refresh,
    reportError,
    clearError,
    updateData,
  };
}
