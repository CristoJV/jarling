import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { CreateAccountInput } from '@/application/use-cases/accounts/create-account';
import type { AccountType } from '@/domain/entities/account';
import { AccountTypeScreen } from '@/presentation/components/accounts/account-type-screen';
import { MoneyKeypad } from '@/presentation/components/common/money-keypad';
import { AnimatedBottomSheetModal } from '@/presentation/components/common/animated-bottom-sheet-modal';
import { SafeBottomSheet } from '@/presentation/components/common/safe-bottom-sheet';
import { Money } from '@/domain/value-objects/money';
import { formatMoney } from '@/presentation/utils/money';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

type CreateAccountModalProps = Readonly<{
  visible: boolean;
  onDismiss: () => void;
  onCreate: (input: CreateAccountInput) => Promise<void>;
}>;

export function CreateAccountModal({
  visible,
  onDismiss,
  onCreate,
}: CreateAccountModalProps) {
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
  const [onBudget, setOnBudget] = useState(true);
  const [selectingType, setSelectingType] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetAndDismiss() {
    setName('');
    setType('checking');
    setOpeningBalanceCents(0);
    setOnBudget(true);
    setError(null);
    onDismiss();
  }

  async function submit() {
    if (name.trim().length === 0) {
      setError(t('accounts.nameRequired'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onCreate({ name, type, onBudget, openingBalanceCents });
      resetAndDismiss();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t('accounts.createError'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatedBottomSheetModal
      keyboardAvoiding
      onDismiss={resetAndDismiss}
      visible={visible}
    >
      <SafeBottomSheet style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('accounts.new')}</Text>
          <Pressable
            accessibilityLabel={t('common.close')}
            accessibilityRole="button"
            hitSlop={10}
            onPress={resetAndDismiss}
          >
            <Text style={styles.dismiss}>{t('common.cancel')}</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.field}>
            <Text style={styles.label}>{t('accounts.name')}</Text>
            <TextInput
              accessibilityLabel={t('accounts.name')}
              autoCapitalize="sentences"
              autoFocus
              onChangeText={setName}
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
            <Text style={styles.help}>{t('accounts.openingBalanceHelp')}</Text>
            <Text
              accessibilityLabel={t('accounts.openingBalance')}
              style={styles.amount}
            >
              {formatMoney(Money.fromCents(openingBalanceCents))}
            </Text>
            <MoneyKeypad
              allowNegative
              onChange={setOpeningBalanceCents}
              valueCents={openingBalanceCents}
            />
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
      </SafeBottomSheet>
      {selectingType ? (
        <AccountTypeScreen
          onDismiss={() => setSelectingType(false)}
          onSelect={(value) => {
            setType(value);
            if (value === 'tracking' || value === 'loan') setOnBudget(false);
            if (value === 'credit_card' || value === 'line_of_credit') {
              setOnBudget(true);
            }
          }}
          selected={type}
        />
      ) : null}
    </AnimatedBottomSheetModal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    sheet: {
      maxHeight: '92%',
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
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
      fontSize: 21,
      fontWeight: '700',
    },
    dismiss: {
      color: theme.colors.primary,
      fontSize: 15,
      fontWeight: '600',
    },
    form: {
      padding: 24,
      gap: 24,
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
