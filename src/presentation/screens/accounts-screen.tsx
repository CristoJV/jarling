import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountRow } from '@/presentation/components/accounts/account-row';
import { OverflowMenu } from '@/presentation/components/common/overflow-menu';
import { useAccounts } from '@/presentation/hooks/use-accounts';
import { routes } from '@/presentation/navigation/routes';
import { formatMoney } from '@/presentation/utils/money';
import { useTranslation } from '@/presentation/localization/localization-provider';
import {
  MAIN_SCREEN_HEADER_HEIGHT,
  MAIN_SCREEN_HORIZONTAL_PADDING,
} from '@/presentation/layout/main-screen-layout';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

export function AccountsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { overview, error, loading, refresh } = useAccounts();

  return (
    <SafeAreaView
      edges={['top']}
      style={styles.safeArea}
      testID="accounts-screen"
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('accounts.title')}</Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel={t('accounts.add')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push(routes.newAccount())}
            style={styles.addButton}
            testID="add-account"
          >
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
          <OverflowMenu />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => void refresh()}
            refreshing={loading && overview !== null}
          />
        }
      >
        {overview ? (
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>{t('accounts.totalOnBudget')}</Text>
            <Text style={styles.totalValue}>
              {formatMoney(overview.onBudgetTotal)}
            </Text>
          </View>
        ) : null}

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}

        {loading && !overview ? (
          <ActivityIndicator
            accessibilityLabel={t('common.loading')}
            color={theme.colors.primary}
          />
        ) : null}

        {overview?.accounts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('accounts.empty')}</Text>
            <Text style={styles.emptyDescription}>
              {t('accounts.emptyHint')}
            </Text>
            <Pressable
              onPress={() => router.push(routes.newAccount())}
              style={styles.emptyAction}
              testID="create-first-account"
            >
              <Text style={styles.emptyActionText}>
                {t('accounts.createFirst')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {overview?.accounts.map((summary) => (
          <AccountRow
            key={summary.account.id}
            onPress={() => router.push(routes.account(summary.account.id))}
            summary={summary}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      minHeight: MAIN_SCREEN_HEADER_HEIGHT,
      paddingHorizontal: MAIN_SCREEN_HORIZONTAL_PADDING,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      color: theme.colors.text,
      fontSize: 24,
      fontWeight: '700',
      letterSpacing: -0.6,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    addButton: {
      width: 42,
      height: 42,
      backgroundColor: theme.colors.primary,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 29,
      fontWeight: '400',
      lineHeight: 32,
    },
    content: {
      width: '100%',
      maxWidth: 720,
      padding: 24,
      paddingBottom: 48,
      alignSelf: 'center',
    },
    totalCard: {
      padding: 20,
      marginBottom: 20,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 18,
      gap: 6,
    },
    totalLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.1,
    },
    totalValue: {
      color: theme.colors.primary,
      fontSize: 32,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      letterSpacing: -0.7,
    },
    error: {
      padding: 12,
      marginBottom: 12,
      color: theme.colors.negative,
      backgroundColor: theme.colors.negativeMuted,
      borderRadius: 10,
      fontSize: 14,
    },
    emptyState: {
      paddingVertical: 64,
      alignItems: 'center',
      gap: 10,
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    emptyDescription: {
      maxWidth: 330,
      color: theme.colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },
    emptyAction: {
      minHeight: 46,
      paddingHorizontal: 18,
      marginTop: 12,
      borderColor: theme.colors.primary,
      borderRadius: 23,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyActionText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '700',
    },
  });
