import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountRow } from '@/presentation/components/accounts/account-row';
import { CreateAccountModal } from '@/presentation/components/accounts/create-account-modal';
import { ReconciliationScreen } from '@/presentation/components/accounts/reconciliation-screen';
import { OverflowMenu } from '@/presentation/components/common/overflow-menu';
import { SelectionModal } from '@/presentation/components/common/selection-modal';
import { useAccounts } from '@/presentation/hooks/use-accounts';
import { formatMoney } from '@/presentation/utils/money';
import type { AccountSummary } from '@/application/use-cases/accounts/get-accounts';
import type { ReconciliationPreview } from '@/application/use-cases/accounts/get-reconciliation';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

export function AccountsScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const {
    overview,
    error,
    loading,
    refresh,
    createAccount,
    closeAccount,
    getReconciliation,
    reconcile,
  } = useAccounts();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountSummary | null>(
    null,
  );
  const [reconciliation, setReconciliation] =
    useState<ReconciliationPreview | null>(null);

  function confirmClose(accountId: string, accountName: string) {
    Alert.alert(
      t('accounts.close'),
      t('accounts.closeDescription', { name: accountName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('accounts.close'),
          style: 'destructive',
          onPress: () => void closeAccount(accountId),
        },
      ],
    );
  }

  async function openReconciliation(accountId: string) {
    setSelectedAccount(null);
    try {
      setReconciliation(await getReconciliation(accountId));
    } catch {
      // The hook exposes the translated error in the screen.
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('accounts.title')}</Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel={t('accounts.add')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setCreateModalVisible(true)}
            style={styles.addButton}
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
              onPress={() => setCreateModalVisible(true)}
              style={styles.emptyAction}
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
            onPress={() => setSelectedAccount(summary)}
            summary={summary}
          />
        ))}
      </ScrollView>

      <CreateAccountModal
        onCreate={createAccount}
        onDismiss={() => setCreateModalVisible(false)}
        visible={createModalVisible}
      />
      {selectedAccount ? (
        <SelectionModal
          onDismiss={() => setSelectedAccount(null)}
          onSelect={(action) => {
            if (action === 'reconcile') {
              void openReconciliation(selectedAccount.account.id);
            } else {
              confirmClose(
                selectedAccount.account.id,
                selectedAccount.account.name,
              );
            }
          }}
          options={[
            {
              value: 'reconcile',
              label: t('accounts.reconcile'),
              description: t('accounts.reconcileDescription'),
            },
            {
              value: 'close',
              label: t('accounts.close'),
              description: t('accounts.closeHistoryDescription'),
            },
          ]}
          title={selectedAccount.account.name}
        />
      ) : null}
      {reconciliation ? (
        <ReconciliationScreen
          onDismiss={() => setReconciliation(null)}
          onReconcile={reconcile}
          preview={reconciliation}
        />
      ) : null}
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
      minHeight: 68,
      paddingHorizontal: 24,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      color: theme.colors.text,
      fontSize: 28,
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
