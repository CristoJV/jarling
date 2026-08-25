import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AccountsOverview } from '@/application/use-cases/accounts/get-accounts';
import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type { Category } from '@/domain/entities/category';
import type { TransactionSummary } from '@/application/use-cases/transactions/get-transactions';
import type { TransactionInput } from '@/application/use-cases/transactions/transaction-input';
import type { TransferInput } from '@/application/use-cases/transfers/transfer-input';
import { AnimatedFlowScreen } from '@/presentation/components/common/animated-flow-screen';
import { useApplication } from '@/presentation/contexts/application-context';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';
import {
  getTransactionReferenceData,
  invalidateTransactionReferenceData,
} from '@/presentation/cache/transaction-reference-data';

import { TransactionEditorScreen } from './transaction-editor-screen';

type EditorData = Readonly<{
  accounts: AccountsOverview;
  categoryGroups: readonly CategoryGroupSummary[];
  payees: readonly string[];
  transaction?: TransactionSummary;
  linkedTransaction?: TransactionSummary;
}>;

export function TransactionFlowScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const application = useApplication();
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [data, setData] = useState<EditorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setError(null);
      try {
        const [referenceData, transaction] = await Promise.all([
          getTransactionReferenceData(application),
          id ? application.transactions.getById.execute(id) : null,
        ]);
        if (id && !transaction) throw new Error('Transaction not found.');
        const linkedTransaction =
          transaction?.transaction.kind === 'transfer' &&
          transaction.transaction.transactionGroupId
            ? (
                await application.transactions.getAll.execute({
                  transactionGroupId:
                    transaction.transaction.transactionGroupId,
                  limit: 2,
                })
              ).find(
                ({ transaction: candidate }) =>
                  candidate.id !== transaction.transaction.id,
              )
            : undefined;
        if (active) {
          setData({
            ...referenceData,
            ...(transaction ? { transaction } : {}),
            ...(linkedTransaction ? { linkedTransaction } : {}),
          });
        }
      } catch (cause) {
        if (active) setError(domainErrorMessage(cause, t));
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [application, id, revision, t]);

  const save = useCallback(
    async (input: TransactionInput | TransferInput) => {
      try {
        if (input.kind === 'transfer') {
          const transactionGroupId =
            data?.transaction?.transaction.transactionGroupId;
          if (transactionGroupId) {
            await application.transfers.update.execute({
              ...input,
              transactionGroupId,
            });
          } else {
            await application.transfers.create.execute(input);
          }
        } else if (data?.transaction) {
          await application.transactions.update.execute({
            ...input,
            id: data.transaction.transaction.id,
          });
        } else {
          await application.transactions.create.execute(input);
        }
        invalidateTransactionReferenceData();
      } catch (cause) {
        throw new Error(domainErrorMessage(cause, t), { cause });
      }
    },
    [application, data, t],
  );

  const createCategory = useCallback(
    async (input: { groupId: string; name: string }): Promise<Category> => {
      const category = await application.categories.create.execute(input);
      invalidateTransactionReferenceData();
      const referenceData = await getTransactionReferenceData(application);
      setData((current) =>
        current ? { ...current, ...referenceData } : current,
      );
      return category;
    },
    [application],
  );

  return (
    <AnimatedFlowScreen onBack={() => router.back()} overlay>
      {(goBack) =>
        data ? (
          <TransactionEditorScreen
            accounts={data.accounts}
            categoryGroups={data.categoryGroups}
            linkedTransaction={data.linkedTransaction}
            onCreateCategory={createCategory}
            onDismiss={goBack}
            onSave={save}
            payees={data.payees}
            transaction={data.transaction}
          />
        ) : (
          <SafeAreaView style={styles.loadingScreen}>
            <View style={styles.loadingHeader}>
              <Pressable
                accessibilityLabel={t('common.close')}
                onPress={goBack}
                style={styles.close}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
              <View style={styles.headerSpacer} />
            </View>
            <View style={styles.loadingBody}>
              {error ? (
                <>
                  <Text style={styles.error}>{error}</Text>
                  <Pressable
                    onPress={() => setRevision((current) => current + 1)}
                    style={styles.retry}
                  >
                    <Text style={styles.retryText}>{t('common.retry')}</Text>
                  </Pressable>
                </>
              ) : (
                <ActivityIndicator color={theme.colors.primary} size="large" />
              )}
            </View>
          </SafeAreaView>
        )
      }
    </AnimatedFlowScreen>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    loadingScreen: { flex: 1, backgroundColor: theme.colors.background },
    loadingHeader: {
      minHeight: 56,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    close: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeText: {
      color: theme.colors.text,
      fontSize: 38,
      fontWeight: '300',
      lineHeight: 40,
    },
    headerSpacer: { width: 42 },
    loadingBody: {
      flex: 1,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    error: {
      color: theme.colors.negative,
      fontSize: 15,
      textAlign: 'center',
    },
    retry: {
      minHeight: 46,
      paddingHorizontal: 20,
      backgroundColor: theme.colors.primary,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryText: { color: theme.colors.onPrimary, fontWeight: '800' },
  });
