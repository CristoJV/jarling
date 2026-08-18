import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { SetCategoryTargetInput } from '@/application/use-cases/targets/set-category-target';
import {
  type CategoryTarget,
  type CustomFundingMode,
  type IsoDayOfWeek,
  type RecurringFundingMode,
  type TargetKind,
} from '@/domain/entities/category-target';
import { Money } from '@/domain/value-objects/money';
import { MoneyKeypad } from '@/presentation/components/common/money-keypad';
import { FullScreenModal } from '@/presentation/components/common/full-screen-modal';
import { NativeDatePicker } from '@/presentation/components/common/native-date-picker';
import { SelectionModal } from '@/presentation/components/common/selection-modal';
import { formatDate, formatMoney } from '@/presentation/utils/money';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

const targetTypes: readonly TargetKind[] = [
  'weekly',
  'monthly',
  'yearly',
  'custom',
];
const days: readonly IsoDayOfWeek[] = [1, 2, 3, 4, 5, 6, 7];
const customModes: readonly CustomFundingMode[] = [
  'set_aside',
  'fill_up_to',
  'balance',
];

type TargetEditorModalProps = Readonly<{
  categoryId: string;
  categoryName: string;
  target?: CategoryTarget;
  onDismiss: () => void;
  onSave: (input: SetCategoryTargetInput) => Promise<void>;
  onDelete: (categoryId: string) => Promise<void>;
}>;

function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function TargetEditorModal({
  categoryId,
  categoryName,
  target,
  onDismiss,
  onSave,
  onDelete,
}: TargetEditorModalProps) {
  const { language, t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const localizedTargetTypes = targetTypes.map((kind) => ({
    kind,
    label: t(`targets.${kind}`),
  }));
  const localizedDays = days.map((value) => ({
    value,
    label: new Intl.DateTimeFormat(language, { weekday: 'short' }).format(
      new Date(2026, 7, 16 + value),
    ),
  }));
  const localizedMonthlyDays = Array.from({ length: 32 }, (_, index) => ({
    value: String(index),
    label: index === 0 ? t('targets.lastDay') : String(index),
  }));
  const localizedCustomModes = customModes.map((value) => ({
    value,
    title:
      value === 'set_aside'
        ? t('targets.setAside')
        : value === 'fill_up_to'
          ? t('targets.fillUpTo')
          : t('targets.haveBalance'),
    description:
      value === 'set_aside'
        ? t('targets.customSetAsideDescription')
        : value === 'fill_up_to'
          ? t('targets.customFillDescription')
          : t('targets.customBalanceDescription'),
  }));
  const [kind, setKind] = useState<TargetKind>(target?.kind ?? 'weekly');
  const [amountCents, setAmountCents] = useState(target?.amount.cents ?? 0);
  const [dayOfWeek, setDayOfWeek] = useState<IsoDayOfWeek>(
    target?.dayOfWeek ?? 6,
  );
  const [fundingMode, setFundingMode] = useState<RecurringFundingMode>(
    target?.fundingMode ?? 'set_aside',
  );
  const [dayOfMonth, setDayOfMonth] = useState(target?.dayOfMonth ?? 0);
  const [targetDate, setTargetDate] = useState(target?.targetDate ?? today());
  const [customFundingMode, setCustomFundingMode] = useState<CustomFundingMode>(
    target?.customFundingMode ?? 'set_aside',
  );
  const [selectingMonthlyDay, setSelectingMonthlyDay] = useState(false);
  const [selectingDate, setSelectingDate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const amount = formatMoney(Money.fromCents(amountCents));

  async function submit() {
    if (amountCents <= 0) {
      setError(t('targets.amountRequired'));
      return;
    }
    const common = { categoryId, amountCents } as const;
    const input: SetCategoryTargetInput =
      kind === 'weekly'
        ? { ...common, kind, dayOfWeek, fundingMode }
        : kind === 'monthly'
          ? { ...common, kind, dayOfMonth, fundingMode }
          : kind === 'yearly'
            ? { ...common, kind, targetDate, fundingMode }
            : { ...common, kind, customFundingMode };
    setSubmitting(true);
    setError(null);
    try {
      await onSave(input);
      onDismiss();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('form.couldNotSave'));
    } finally {
      setSubmitting(false);
    }
  }

  function requestDelete() {
    Alert.alert(
      t('targets.deleteTitle'),
      t('targets.deleteDescription', { name: categoryName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () =>
            void onDelete(categoryId)
              .then(onDismiss)
              .catch((cause: unknown) =>
                setError(
                  cause instanceof Error
                    ? cause.message
                    : t('targets.deleteError'),
                ),
              ),
        },
      ],
    );
  }

  return (
    <FullScreenModal onRequestClose={onDismiss}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel={t('common.back')}
            hitSlop={10}
            onPress={onDismiss}
            style={styles.back}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text numberOfLines={1} style={styles.title}>
            {categoryName}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.segmented}>
              {localizedTargetTypes.map((option) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: kind === option.kind }}
                  key={option.kind}
                  onPress={() => setKind(option.kind)}
                  style={[
                    styles.segment,
                    kind === option.kind && styles.segmentSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      kind === option.kind && styles.segmentTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>
              {kind === 'custom' ? t('targets.amount') : t('targets.iNeed')}
            </Text>
            <Text style={styles.amount}>{amount}</Text>

            {kind === 'weekly' ? (
              <>
                <View style={styles.fieldSection}>
                  <Text style={styles.fieldLabel}>{t('targets.every')}</Text>
                  <View style={styles.dayGrid}>
                    {localizedDays.map((day) => (
                      <ChoiceChip
                        key={day.value}
                        label={day.label}
                        selected={dayOfWeek === day.value}
                        onPress={() => setDayOfWeek(day.value)}
                      />
                    ))}
                  </View>
                </View>
                <View style={styles.fieldSection}>
                  <Text style={styles.fieldLabel}>
                    {t('targets.nextMonth')}
                  </Text>
                  <ModeRow
                    selected={fundingMode === 'set_aside'}
                    title={t('targets.setAsideAmount', {
                      amount,
                      period: t('targets.week'),
                    })}
                    description={t('targets.setAsideDescription', {
                      period: t('targets.week'),
                    })}
                    onPress={() => setFundingMode('set_aside')}
                  />
                  <ModeRow
                    selected={fundingMode === 'refill_up_to'}
                    title={t('targets.refillAmount', {
                      amount,
                      period: t('targets.week'),
                    })}
                    description={t('targets.refillDescription')}
                    onPress={() => setFundingMode('refill_up_to')}
                  />
                </View>
              </>
            ) : null}

            {kind === 'monthly' ? (
              <>
                <View style={styles.fieldSection}>
                  <Text style={styles.fieldLabel}>{t('targets.by')}</Text>
                  <Pressable
                    onPress={() => setSelectingMonthlyDay(true)}
                    style={styles.selector}
                  >
                    <Text style={styles.selectorText}>
                      {dayOfMonth === 0
                        ? t('targets.lastDay')
                        : String(dayOfMonth)}
                    </Text>
                    <Text style={styles.selectorArrow}>›</Text>
                  </Pressable>
                </View>
                <RecurringModeSection
                  amount={amount}
                  fundingMode={fundingMode}
                  onChange={setFundingMode}
                  period="month"
                />
              </>
            ) : null}

            {kind === 'yearly' ? (
              <>
                <View style={styles.fieldSection}>
                  <Text style={styles.fieldLabel}>{t('targets.by')}</Text>
                  <Pressable
                    onPress={() => setSelectingDate(true)}
                    style={styles.selector}
                  >
                    <Text style={styles.selectorText}>
                      {formatDate(targetDate, language)}
                    </Text>
                    <Text style={styles.selectorArrow}>›</Text>
                  </Pressable>
                </View>
                <RecurringModeSection
                  amount={amount}
                  fundingMode={fundingMode}
                  onChange={setFundingMode}
                  period="year"
                />
              </>
            ) : null}

            {kind === 'custom' ? (
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>{t('targets.iWantTo')}</Text>
                {localizedCustomModes.map((mode) => (
                  <ModeRow
                    key={mode.value}
                    selected={customFundingMode === mode.value}
                    title={mode.title}
                    description={mode.description}
                    onPress={() => setCustomFundingMode(mode.value)}
                  />
                ))}
              </View>
            ) : null}

            <MoneyKeypad onChange={setAmountCents} valueCents={amountCents} />
          </View>
          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <Pressable
            disabled={submitting}
            onPress={() => void submit()}
            style={[styles.save, submitting && styles.disabled]}
          >
            <Text style={styles.saveText}>
              {submitting
                ? t('transactions.saving')
                : target
                  ? t('targets.save')
                  : t('targets.set')}
            </Text>
          </Pressable>
          {target ? (
            <Pressable onPress={requestDelete} style={styles.deleteButton}>
              <Text style={styles.deleteText}>{t('targets.delete')}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
      {selectingMonthlyDay ? (
        <SelectionModal
          title={t('targets.monthlyDay')}
          options={localizedMonthlyDays}
          selectedValue={String(dayOfMonth)}
          onSelect={(value) => setDayOfMonth(Number(value))}
          onDismiss={() => setSelectingMonthlyDay(false)}
        />
      ) : null}
      {selectingDate ? (
        <NativeDatePicker
          title={t('targets.yearlyDate')}
          value={targetDate}
          onChange={setTargetDate}
          onDismiss={() => setSelectingDate(false)}
        />
      ) : null}
    </FullScreenModal>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: Readonly<{ label: string; selected: boolean; onPress: () => void }>) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.day, selected && styles.daySelected]}
    >
      <Text style={[styles.dayText, selected && styles.dayTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function RecurringModeSection({
  amount,
  fundingMode,
  period,
  onChange,
}: Readonly<{
  amount: string;
  fundingMode: RecurringFundingMode;
  period: 'month' | 'year';
  onChange: (value: RecurringFundingMode) => void;
}>) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const periodLabel =
    period === 'month' ? t('targets.month') : t('targets.year');
  return (
    <View style={styles.fieldSection}>
      <Text style={styles.fieldLabel}>{t('targets.nextMonth')}</Text>
      <ModeRow
        selected={fundingMode === 'set_aside'}
        title={t('targets.setAsideAmount', { amount, period: periodLabel })}
        description={t('targets.setAsideDescription', {
          period: periodLabel,
        })}
        onPress={() => onChange('set_aside')}
      />
      <ModeRow
        selected={fundingMode === 'refill_up_to'}
        title={t('targets.refillAmount', { amount, period: periodLabel })}
        description={t('targets.refillDescription')}
        onPress={() => onChange('refill_up_to')}
      />
    </View>
  );
}

function ModeRow({
  title,
  description,
  selected,
  onPress,
}: Readonly<{
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}>) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.mode, selected && styles.modeSelected]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.modeCopy}>
        <Text style={styles.modeTitle}>{title}</Text>
        {description ? (
          <Text style={styles.modeDescription}>{description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      minHeight: 64,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    back: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backText: { color: theme.colors.primary, fontSize: 38, lineHeight: 40 },
    title: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 23,
      fontWeight: '700',
    },
    headerSpacer: { width: 44 },
    content: {
      width: '100%',
      maxWidth: 680,
      padding: 20,
      paddingBottom: 42,
      alignSelf: 'center',
    },
    card: {
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 24,
      borderWidth: 1,
    },
    segmented: {
      marginBottom: 24,
      borderColor: theme.colors.textMuted,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    segment: {
      flex: 1,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentSelected: { backgroundColor: theme.colors.primaryMuted },
    segmentText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    segmentTextSelected: { color: theme.colors.primary, fontWeight: '800' },
    fieldLabel: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    amount: {
      paddingVertical: 8,
      color: theme.colors.text,
      fontSize: 38,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    fieldSection: {
      paddingVertical: 16,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: 10,
    },
    dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    day: {
      minWidth: 54,
      minHeight: 42,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    daySelected: { backgroundColor: theme.colors.primary },
    dayText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    dayTextSelected: { color: theme.colors.onPrimary, fontWeight: '800' },
    selector: {
      minHeight: 54,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectorText: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
    selectorArrow: { color: theme.colors.primary, fontSize: 27 },
    mode: {
      padding: 13,
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 11,
    },
    modeSelected: {
      backgroundColor: theme.colors.surfacePressed,
      borderColor: theme.colors.primary,
    },
    radio: {
      width: 20,
      height: 20,
      marginTop: 1,
      borderColor: theme.colors.textMuted,
      borderRadius: 10,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: { borderColor: theme.colors.primary },
    radioDot: {
      width: 10,
      height: 10,
      backgroundColor: theme.colors.primary,
      borderRadius: 5,
    },
    modeCopy: { flex: 1 },
    modeTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
    modeDescription: {
      marginTop: 4,
      color: theme.colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    error: {
      padding: 12,
      marginTop: 12,
      color: theme.colors.negative,
      backgroundColor: theme.colors.negativeMuted,
      borderRadius: 12,
      fontSize: 13,
    },
    save: {
      minHeight: 54,
      marginTop: 16,
      backgroundColor: theme.colors.primary,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveText: {
      color: theme.colors.onPrimary,
      fontSize: 17,
      fontWeight: '800',
    },
    deleteButton: {
      minHeight: 54,
      marginTop: 12,
      backgroundColor: theme.colors.negative,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteText: {
      color: theme.colors.onNegative,
      fontSize: 16,
      fontWeight: '800',
    },
    disabled: { opacity: 0.55 },
  });
