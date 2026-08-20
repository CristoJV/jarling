import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ReconciliationPreview } from '@/application/use-cases/accounts/get-reconciliation';
import { ReconciliationScreen } from '@/presentation/components/accounts/reconciliation-screen';
import { invalidateTransactionReferenceData } from '@/presentation/cache/transaction-reference-data';
import { useApplication } from '@/presentation/contexts/application-context';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

export function ReconciliationFlowScreen() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const application = useApplication();
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [preview, setPreview] = useState<ReconciliationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    application.accounts.getReconciliation.execute(id).then(
      (value) => active && setPreview(value),
      (cause: unknown) => active && setError(domainErrorMessage(cause, t)),
    );
    return () => {
      active = false;
    };
  }, [application, id, t]);

  if (preview) {
    return (
      <ReconciliationScreen
        onDismiss={() => router.back()}
        onReconcile={async (input) => {
          const result = await application.accounts.reconcile.execute(input);
          invalidateTransactionReferenceData();
          return result;
        }}
        preview={preview}
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <ActivityIndicator color={theme.colors.primary} size="large" />
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    center: {
      flex: 1,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    error: { color: theme.colors.negative, fontSize: 15, textAlign: 'center' },
  });
