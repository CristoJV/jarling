import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import { Money } from '@/domain/value-objects/money';
import { MoneyKeypad } from '@/presentation/components/common/money-keypad';
import { AnimatedBottomSheetModal } from '@/presentation/components/common/animated-bottom-sheet-modal';
import { SafeBottomSheet } from '@/presentation/components/common/safe-bottom-sheet';
import { formatMoney } from '@/presentation/utils/money';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';
import { categoryDisplayName } from '@/presentation/utils/category-name';

type CategoryBudgetModalProps = Readonly<{
  values: BudgetCategoryValues;
  monthLabel: string;
  onDismiss: () => void;
  onMoveMoney: () => void;
  onSave: (amountCents: number) => Promise<void>;
}>;

export function CategoryBudgetModal({
  values,
  monthLabel,
  onDismiss,
  onMoveMoney,
  onSave,
}: CategoryBudgetModalProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [amountCents, setAmountCents] = useState(values.assigned.cents);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await onSave(amountCents);
      onDismiss();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('form.couldNotSave'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatedBottomSheetModal onDismiss={onDismiss}>
      <SafeBottomSheet style={styles.sheet}>
        <View style={styles.header}>
          <View>
            <Text numberOfLines={1} style={styles.title}>
              {categoryDisplayName(values.category, t)}
            </Text>
            <Text style={styles.subtitle}>{monthLabel}</Text>
          </View>
          <Pressable hitSlop={10} onPress={onDismiss}>
            <Text style={styles.dismiss}>{t('common.close')}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.amountLabel}>
            {t('budget.assigned').toUpperCase()}
          </Text>
          <Text style={styles.amount}>
            {formatMoney(Money.fromCents(amountCents))}
          </Text>

          <View style={styles.actions}>
            <Pressable onPress={onMoveMoney} style={styles.action}>
              <Text style={styles.actionIcon}>→</Text>
              <Text style={styles.actionText}>{t('budget.moveMoney')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowDetails((current) => !current)}
              style={styles.action}
            >
              <Text style={styles.actionIcon}>•••</Text>
              <Text style={styles.actionText}>{t('budget.details')}</Text>
            </Pressable>
          </View>

          {showDetails ? (
            <View style={styles.details}>
              <Detail
                label={t('budget.assigned')}
                value={formatMoney(values.assigned)}
              />
              <Detail
                label={t('budget.activity')}
                value={formatMoney(values.activity)}
              />
              <Detail
                label={t('budget.available')}
                value={formatMoney(values.available)}
              />
            </View>
          ) : null}

          <MoneyKeypad onChange={setAmountCents} valueCents={amountCents} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            disabled={submitting}
            onPress={() => void submit()}
            style={[styles.save, submitting && styles.disabled]}
          >
            <Text style={styles.saveText}>
              {submitting ? t('transactions.saving') : t('common.done')}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeBottomSheet>
    </AnimatedBottomSheetModal>
  );
}

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    sheet: {
      maxHeight: '94%',
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      overflow: 'hidden',
    },
    header: {
      minHeight: 72,
      paddingHorizontal: 22,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      maxWidth: 270,
      color: theme.colors.text,
      fontSize: 21,
      fontWeight: '700',
    },
    subtitle: { marginTop: 2, color: theme.colors.textMuted, fontSize: 12 },
    dismiss: { color: theme.colors.primary, fontSize: 14, fontWeight: '700' },
    content: { padding: 22, alignItems: 'center' },
    amountLabel: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.1,
    },
    amount: {
      marginTop: 5,
      marginBottom: 18,
      color: theme.colors.text,
      fontSize: 42,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    actions: { width: '100%', flexDirection: 'row', gap: 10 },
    action: {
      flex: 1,
      minHeight: 66,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionIcon: {
      color: theme.colors.primary,
      fontSize: 22,
      fontWeight: '800',
    },
    actionText: {
      marginTop: 2,
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    details: {
      width: '100%',
      padding: 15,
      marginTop: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    detail: { alignItems: 'center', gap: 3 },
    detailLabel: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
    },
    detailValue: {
      color: theme.colors.text,
      fontSize: 13,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
    },
    error: {
      width: '100%',
      marginTop: 10,
      color: theme.colors.negative,
      fontSize: 13,
    },
    save: {
      width: '100%',
      minHeight: 52,
      marginTop: 8,
      backgroundColor: theme.colors.primary,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveText: {
      color: theme.colors.onPrimary,
      fontSize: 17,
      fontWeight: '800',
    },
    disabled: { opacity: 0.55 },
  });
