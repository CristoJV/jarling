import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AccountDetails } from '@/application/use-cases/accounts/get-account-details';
import type { AccountType } from '@/domain/entities/account';
import { invalidateTransactionReferenceData } from '@/presentation/cache/transaction-reference-data';
import { NameInputModal } from '@/presentation/components/common/name-input-modal';
import { useApplication } from '@/presentation/contexts/application-context';
import { useTranslation } from '@/presentation/localization/localization-provider';
import { routes } from '@/presentation/navigation/routes';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';
import { formatMoney } from '@/presentation/utils/money';

export function AccountDetailsScreen() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const application = useApplication();
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [details, setDetails] = useState<AccountDetails | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setDetails(await application.accounts.getDetails.execute(id));
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
    }
  }, [application, id, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function rename(name: string) {
    try {
      await application.accounts.rename.execute(id, name);
      invalidateTransactionReferenceData();
      await load();
    } catch (cause) {
      throw new Error(domainErrorMessage(cause, t), { cause });
    }
  }

  function confirmClose() {
    if (!details) return;
    Alert.alert(
      t('accounts.close'),
      t('accounts.closeDescription', { name: details.account.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('accounts.close'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await application.accounts.close.execute(id);
                invalidateTransactionReferenceData();
                router.back();
              } catch (cause) {
                setError(domainErrorMessage(cause, t));
              }
            })();
          },
        },
      ],
    );
  }

  if (!details) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header onBack={() => router.back()} title={t('accounts.details')} />
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

  return (
    <SafeAreaView style={styles.screen}>
      <Header onBack={() => router.back()} title={t('accounts.details')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => setRenaming(true)} style={styles.nameCard}>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>{t('accounts.name')}</Text>
            <Text style={styles.name}>{details.account.name}</Text>
            <Text style={styles.type}>
              {accountTypeLabel(details.account.type, t)}
            </Text>
          </View>
          <MaterialCommunityIcons
            color={theme.colors.primary}
            name="pencil-outline"
            size={23}
          />
        </Pressable>

        <View style={styles.balanceCard}>
          <BalanceRow
            label={t('accounts.workingBalance')}
            value={formatMoney(details.workingBalance)}
            strong
          />
          <BalanceRow
            label={t('accounts.clearedBalance')}
            value={formatMoney(details.clearedBalance)}
          />
          <BalanceRow
            label={t('accounts.unclearedBalance')}
            value={formatMoney(details.unclearedBalance)}
          />
          <Text style={styles.counts}>
            {t('accounts.balanceCounts', {
              cleared: details.clearedCount,
              uncleared: details.unclearedCount,
            })}
          </Text>
        </View>

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}

        {!details.account.closed ? (
          <Pressable
            onPress={() => router.push(routes.reconcileAccount(id))}
            style={styles.primaryButton}
          >
            <MaterialCommunityIcons
              color={theme.colors.onPrimary}
              name="scale-balance"
              size={21}
            />
            <Text style={styles.primaryButtonText}>
              {t('accounts.reconcile')}
            </Text>
          </Pressable>
        ) : null}
        {!details.account.closed ? (
          <Pressable onPress={confirmClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>{t('accounts.close')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {renaming ? (
        <NameInputModal
          initialValue={details.account.name}
          label={t('accounts.name')}
          onDismiss={() => setRenaming(false)}
          onSubmit={rename}
          placement="center"
          submitLabel={t('common.save')}
          title={t('accounts.rename')}
        />
      ) : null}
    </SafeAreaView>
  );
}

type Translate = ReturnType<typeof useTranslation>['t'];

function accountTypeLabel(type: AccountType, t: Translate): string {
  const keys = {
    checking: 'accounts.checking',
    savings: 'accounts.savings',
    cash: 'accounts.cash',
    credit_card: 'accounts.creditCard',
    line_of_credit: 'accounts.lineOfCredit',
    tracking: 'accounts.tracking',
    loan: 'accounts.loan',
  } as const;
  return t(keys[type]);
}

function Header({
  title,
  onBack,
}: Readonly<{ title: string; onBack: () => void }>) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel={t('common.back')}
        hitSlop={10}
        onPress={onBack}
        style={styles.back}
      >
        <MaterialCommunityIcons
          color={theme.colors.text}
          name="arrow-left"
          size={25}
        />
      </Pressable>
      <Text numberOfLines={1} style={styles.headerTitle}>
        {title}
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function BalanceRow({
  label,
  value,
  strong = false,
}: Readonly<{ label: string; value: string; strong?: boolean }>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.balanceRow}>
      <Text style={styles.balanceLabel}>{label}</Text>
      <Text style={[styles.balanceValue, strong && styles.balanceStrong]}>
        {value}
      </Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    flex: { flex: 1 },
    center: {
      flex: 1,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      minHeight: 64,
      paddingHorizontal: 16,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
    },
    back: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 21,
      fontWeight: '800',
      textAlign: 'center',
    },
    headerSpacer: { width: 44 },
    content: {
      width: '100%',
      maxWidth: 680,
      padding: 24,
      paddingBottom: 48,
      alignSelf: 'center',
      gap: 18,
    },
    nameCard: {
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    eyebrow: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    name: {
      marginTop: 5,
      color: theme.colors.text,
      fontSize: 24,
      fontWeight: '800',
    },
    type: { marginTop: 3, color: theme.colors.textMuted, fontSize: 13 },
    balanceCard: {
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      gap: 15,
    },
    balanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16,
    },
    balanceLabel: { flex: 1, color: theme.colors.textSecondary, fontSize: 14 },
    balanceValue: {
      color: theme.colors.text,
      fontSize: 16,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
    },
    balanceStrong: { color: theme.colors.primary, fontSize: 23 },
    counts: {
      color: theme.colors.textMuted,
      fontSize: 12,
      textAlign: 'center',
    },
    error: {
      padding: 13,
      color: theme.colors.negative,
      backgroundColor: theme.colors.negativeMuted,
      borderRadius: 12,
      fontSize: 14,
    },
    primaryButton: {
      minHeight: 54,
      backgroundColor: theme.colors.primary,
      borderRadius: 17,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
    },
    primaryButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    closeButton: {
      minHeight: 52,
      borderColor: theme.colors.negative,
      borderRadius: 17,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      color: theme.colors.negative,
      fontSize: 15,
      fontWeight: '800',
    },
  });
