import { useMemo, useState } from 'react';
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

type MoveBudgetModalProps = Readonly<{
  categories: readonly BudgetCategoryValues[];
  initialTarget?: BudgetCategoryValues;
  monthLabel: string;
  onDismiss: () => void;
  onMove: (
    sourceCategoryId: string,
    targetCategoryId: string,
    amountCents: number,
  ) => Promise<void>;
}>;

export function MoveBudgetModal({
  categories,
  initialTarget,
  monthLabel,
  onDismiss,
  onMove,
}: MoveBudgetModalProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const suggestedSource = categories.find(
    ({ category, available }) =>
      category.id !== initialTarget?.category.id &&
      available.cents > 0 &&
      !category.hidden,
  );
  const suggestedTarget =
    initialTarget ??
    categories.find(
      ({ category }) =>
        !category.hidden && category.id !== suggestedSource?.category.id,
    );
  const [sourceId, setSourceId] = useState(suggestedSource?.category.id ?? '');
  const [targetId, setTargetId] = useState(suggestedTarget?.category.id ?? '');
  const [amountCents, setAmountCents] = useState(
    initialTarget && initialTarget.available.cents < 0
      ? Math.abs(initialTarget.available.cents)
      : 0,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const visibleCategories = useMemo(
    () => categories.filter(({ category }) => !category.hidden),
    [categories],
  );

  async function submit() {
    if (amountCents <= 0 || !sourceId || !targetId || sourceId === targetId) {
      setError(t('budget.moveValidation'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onMove(sourceId, targetId, amountCents);
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
            <Text style={styles.title}>{t('budget.moveMoney')}</Text>
            <Text style={styles.subtitle}>{monthLabel}</Text>
          </View>
          <Pressable onPress={onDismiss}>
            <Text style={styles.dismiss}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.form}>
          <CategoryChoices
            categories={visibleCategories}
            label={t('budget.from')}
            onSelect={setSourceId}
            selectedId={sourceId}
            showAvailable
          />
          <CategoryChoices
            categories={visibleCategories}
            label={t('budget.to')}
            onSelect={setTargetId}
            selectedId={targetId}
          />
          <View style={styles.field}>
            <Text style={styles.label}>{t('transactions.amount')}</Text>
            <Text
              accessibilityLabel={t('transactions.amount')}
              style={styles.input}
            >
              {formatMoney(Money.fromCents(amountCents))}
            </Text>
            <MoneyKeypad onChange={setAmountCents} valueCents={amountCents} />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            disabled={submitting}
            onPress={() => void submit()}
            style={[styles.submit, submitting && styles.disabled]}
          >
            <Text style={styles.submitText}>
              {submitting ? t('budget.moving') : t('budget.moveMoney')}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeBottomSheet>
    </AnimatedBottomSheetModal>
  );
}

function CategoryChoices({
  categories,
  label,
  selectedId,
  showAvailable = false,
  onSelect,
}: Readonly<{
  categories: readonly BudgetCategoryValues[];
  label: string;
  selectedId: string;
  showAvailable?: boolean;
  onSelect: (categoryId: string) => void;
}>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choices}>
        {categories.map(({ category, available }) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedId === category.id }}
            key={category.id}
            onPress={() => onSelect(category.id)}
            style={[
              styles.choice,
              selectedId === category.id && styles.choiceSelected,
            ]}
          >
            <Text
              style={[
                styles.choiceName,
                selectedId === category.id && styles.choiceNameSelected,
              ]}
            >
              {category.name}
            </Text>
            {showAvailable ? (
              <Text style={styles.choiceAmount}>{formatMoney(available)}</Text>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    sheet: {
      maxHeight: '90%',
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
    },
    header: {
      minHeight: 72,
      paddingHorizontal: 24,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: { color: theme.colors.text, fontSize: 21, fontWeight: '700' },
    subtitle: {
      marginTop: 3,
      color: theme.colors.textMuted,
      fontSize: 12,
      textTransform: 'capitalize',
    },
    dismiss: { color: theme.colors.primary, fontSize: 15, fontWeight: '600' },
    form: { padding: 24, paddingBottom: 44, gap: 24 },
    field: { gap: 9 },
    label: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: {
      minHeight: 46,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      justifyContent: 'center',
    },
    choiceSelected: {
      backgroundColor: theme.colors.primaryMuted,
      borderColor: theme.colors.primary,
    },
    choiceName: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    choiceNameSelected: { color: theme.colors.primary },
    choiceAmount: {
      marginTop: 2,
      color: theme.colors.textMuted,
      fontSize: 10,
      fontVariant: ['tabular-nums'],
    },
    input: {
      paddingVertical: 8,
      color: theme.colors.text,
      fontSize: 34,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      textAlign: 'center',
    },
    error: { color: theme.colors.negative, fontSize: 14, lineHeight: 20 },
    submit: {
      minHeight: 52,
      backgroundColor: theme.colors.primary,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitText: {
      color: theme.colors.onPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    disabled: { opacity: 0.55 },
  });
