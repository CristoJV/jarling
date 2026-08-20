import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CreateAccountInput } from '@/application/use-cases/accounts/create-account';
import type { AccountType } from '@/domain/entities/account';
import { AccountTypeScreen } from '@/presentation/components/accounts/account-type-screen';
import { invalidateTransactionReferenceData } from '@/presentation/cache/transaction-reference-data';
import { KeyboardResponsiveScreen } from '@/presentation/components/common/keyboard-responsive-screen';
import { MoneyKeypad } from '@/presentation/components/common/money-keypad';
import { Money } from '@/domain/value-objects/money';
import { formatMoney } from '@/presentation/utils/money';
import { useTranslation } from '@/presentation/localization/localization-provider';
import { useApplication } from '@/presentation/contexts/application-context';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

export function CreateAccountScreen() {
  const router = useRouter();
  const application = useApplication();
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const typeLabels: Record<AccountType, string> = {
    checking: t('accounts.checking'),
    savings: t('accounts.savings'),
    cash: t('accounts.cash'),
    credit_card: t('accounts.creditCard'),
    line_of_credit: t('accounts.lineOfCredit'),
    tracking: t('accounts.tracking'),
    loan: t('accounts.loan'),
  };
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [openingBalanceCents, setOpeningBalanceCents] = useState(0);
  const [keypadVisible, setKeypadVisible] = useState(false);
  const [onBudget, setOnBudget] = useState(true);
  const [selectingType, setSelectingType] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetAndDismiss() {
    setName('');
    setType('checking');
    setOpeningBalanceCents(0);
    setKeypadVisible(false);
    setOnBudget(true);
    setError(null);
    router.back();
  }

  async function submit() {
    if (name.trim().length === 0) {
      setError(t('accounts.nameRequired'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const input: CreateAccountInput = {
        name,
        type,
        onBudget,
        openingBalanceCents,
      };
      await application.accounts.create.execute(input);
      invalidateTransactionReferenceData();
      resetAndDismiss();
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <KeyboardResponsiveScreen>
        <SafeAreaView style={styles.screen}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={t('common.back')}
              accessibilityRole="button"
              hitSlop={10}
              onPress={resetAndDismiss}
              style={styles.back}
            >
              <MaterialCommunityIcons
                color={theme.colors.text}
                name="arrow-left"
                size={25}
              />
            </Pressable>
            <Text style={styles.title}>{t('accounts.new')}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.form}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.field}>
              <Text style={styles.label}>{t('accounts.name')}</Text>
              <TextInput
                accessibilityLabel={t('accounts.name')}
                autoCapitalize="sentences"
                autoFocus
                onChangeText={setName}
                onFocus={() => setKeypadVisible(false)}
                placeholder={t('accounts.namePlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
                testID="create-account-name"
                value={name}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('accounts.type')}</Text>
              <Pressable
                accessibilityLabel={t('accounts.type')}
                onPress={() => setSelectingType(true)}
                style={styles.selector}
              >
                <Text style={styles.selectorValue}>{typeLabels[type]}</Text>
                <Text style={styles.selectorArrow}>⌄</Text>
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('accounts.openingBalance')}</Text>
              <Text style={styles.help}>
                {t('accounts.openingBalanceHelp')}
              </Text>
              <Pressable
                accessibilityLabel={t('accounts.openingBalance')}
                accessibilityRole="button"
                onPress={() => {
                  Keyboard.dismiss();
                  setKeypadVisible(true);
                }}
              >
                <Text style={styles.amount}>
                  {formatMoney(Money.fromCents(openingBalanceCents))}
                </Text>
              </Pressable>
              {keypadVisible ? (
                <MoneyKeypad
                  allowNegative
                  onChange={setOpeningBalanceCents}
                  valueCents={openingBalanceCents}
                />
              ) : null}
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.label}>{t('accounts.includeBudget')}</Text>
                <Text style={styles.help}>{t('accounts.trackingHelp')}</Text>
              </View>
              <Switch
                disabled={
                  type === 'tracking' ||
                  type === 'loan' ||
                  type === 'credit_card' ||
                  type === 'line_of_credit'
                }
                onValueChange={setOnBudget}
                value={onBudget}
              />
            </View>

            {error ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {error}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={() => void submit()}
              style={[styles.submit, submitting && styles.submitDisabled]}
              testID="create-account-submit"
            >
              <Text style={styles.submitText}>
                {submitting ? t('accounts.creating') : t('accounts.create')}
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </KeyboardResponsiveScreen>
      {selectingType ? (
        <View style={styles.overlay}>
          <AccountTypeScreen
            onBack={() => setSelectingType(false)}
            onSelect={(value) => {
              setType(value);
              if (value === 'tracking' || value === 'loan') setOnBudget(false);
              if (value === 'credit_card' || value === 'line_of_credit') {
                setOnBudget(true);
              }
            }}
            selected={type}
          />
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    overlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 10,
    },
    screen: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      minHeight: 68,
      paddingHorizontal: 24,
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
    title: {
      color: theme.colors.text,
      fontSize: 21,
      fontWeight: '700',
      flex: 1,
      textAlign: 'center',
    },
    headerSpacer: { width: 44 },
    form: {
      width: '100%',
      maxWidth: 680,
      padding: 24,
      paddingBottom: 48,
      gap: 24,
      alignSelf: 'center',
    },
    field: {
      gap: 8,
    },
    label: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    input: {
      minHeight: 50,
      paddingHorizontal: 14,
      color: theme.colors.text,
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      fontSize: 16,
    },
    amount: {
      paddingVertical: 10,
      color: theme.colors.text,
      fontSize: 34,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      textAlign: 'center',
    },
    selector: {
      minHeight: 52,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectorValue: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    selectorArrow: { color: theme.colors.textMuted, fontSize: 22 },
    help: {
      color: theme.colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    typeButton: {
      minHeight: 42,
      paddingHorizontal: 14,
      borderColor: theme.colors.border,
      borderRadius: 21,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeButtonSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    typeButtonText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    typeButtonTextSelected: {
      color: theme.colors.onPrimary,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
    },
    switchCopy: {
      flex: 1,
      gap: 4,
    },
    error: {
      color: theme.colors.negative,
      fontSize: 14,
      lineHeight: 20,
    },
    submit: {
      minHeight: 52,
      backgroundColor: theme.colors.primary,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitDisabled: {
      opacity: 0.55,
    },
    submitText: {
      color: theme.colors.onPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
  });
