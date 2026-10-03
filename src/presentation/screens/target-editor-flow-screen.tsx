import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CategoryDetails } from '@/application/use-cases/categories/get-category-details';
import { TargetEditorView } from '@/presentation/components/targets/target-editor-view';
import { useApplication } from '@/presentation/contexts/application-context';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { categoryDisplayName } from '@/presentation/utils/category-name';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';
import {
  routeBudgetMonth,
  routeId,
  type RouteParameter,
} from '@/presentation/navigation/route-params';

export function TargetEditorFlowScreen() {
  const parameters = useLocalSearchParams<{
    id?: RouteParameter;
    month?: RouteParameter;
  }>();
  const id = routeId(parameters.id);
  const month = routeBudgetMonth(parameters.month);
  const router = useRouter();
  const application = useApplication();
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [details, setDetails] = useState<CategoryDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    application.categories.getDetails.execute(id, month).then(
      (value) => active && setDetails(value),
      (cause: unknown) => active && setError(domainErrorMessage(cause, t)),
    );
    return () => {
      active = false;
    };
  }, [application, id, month, t]);

  if (details) {
    return (
      <TargetEditorView
        categoryId={id}
        categoryName={categoryDisplayName(details.values.category, t)}
        onDelete={async (categoryId) => {
          await application.targets.delete.execute(categoryId);
        }}
        onDismiss={() => router.back()}
        onSave={async (input) => {
          await application.targets.set.execute(input);
        }}
        target={details.target}
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
