import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import type { BudgetLocation } from '@/application/use-cases/budget/move-budget';
import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type { Category } from '@/domain/entities/category';
import type { BudgetMonthValues } from '@/domain/services/calculate-budget-month';
import { Money } from '@/domain/value-objects/money';
import { SelectCategoryScreen } from '@/presentation/components/categories/select-category-screen';
import { BottomActionLayout } from '@/presentation/components/common/bottom-action-layout';
import {
  MoneyKeypad,
  type MoneyKeypadHandle,
} from '@/presentation/components/common/money-keypad';
import { useApplication } from '@/presentation/contexts/application-context';
import { invalidateTransactionReferenceData } from '@/presentation/cache/transaction-reference-data';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { categoryDisplayName } from '@/presentation/utils/category-name';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';
import { formatMoney } from '@/presentation/utils/money';

export function MoveBudgetScreen() {
  const { month = currentMonth(), targetCategoryId } = useLocalSearchParams<{
    month?: string;
    targetCategoryId?: string;
  }>();
  const router = useRouter();
  const application = useApplication();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [budget, setBudget] = useState<BudgetMonthValues | null>(null);
  const [groups, setGroups] = useState<readonly CategoryGroupSummary[]>([]);
  const [source, setSource] = useState<BudgetLocation>({
    kind: 'ready-to-assign',
  });
  const [target, setTarget] = useState<BudgetLocation>(
    targetCategoryId
      ? { kind: 'category', categoryId: targetCategoryId }
      : { kind: 'ready-to-assign' },
  );
  const [amountCents, setAmountCents] = useState(0);
  const [selecting, setSelecting] = useState<'source' | 'target' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const keypadRef = useRef<MoneyKeypadHandle>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      application.budget.getMonth.execute(month),
      application.categories.getGroups.execute(),
    ]).then(
      ([value, categoryGroups]) => {
        if (!active) return;
        setBudget(value);
        setGroups(categoryGroups);
        if (!targetCategoryId) {
          const first = value.groups
            .flatMap(({ categories }) => categories)
            .find(({ category }) => !category.hidden);
          if (first)
            setTarget({ kind: 'category', categoryId: first.category.id });
        } else {
          const selected = value.groups
            .flatMap(({ categories }) => categories)
            .find(({ category }) => category.id === targetCategoryId);
          if (selected?.available.cents && selected.available.cents < 0) {
            setAmountCents(Math.abs(selected.available.cents));
          }
        }
      },
      (cause: unknown) => active && setError(domainErrorMessage(cause, t)),
    );
    return () => {
      active = false;
    };
  }, [application, month, t, targetCategoryId]);

  const categories = useMemo(
    () =>
      budget?.groups
        .flatMap(({ categories }) => categories)
        .filter(({ category }) => !category.hidden) ?? [],
    [budget],
  );
  function labelFor(location: BudgetLocation): string {
    if (location.kind === 'ready-to-assign') return t('budget.readyToAssign');
    const values = categories.find(
      ({ category }) => category.id === location.categoryId,
    );
    return values
      ? categoryDisplayName(values.category, t)
      : t('common.choose');
  }

  async function submit(valueCents?: number) {
    if (submitting) return;
    const finalValueCents =
      valueCents ?? keypadRef.current?.resolve() ?? amountCents;
    setSubmitting(true);
    setError(null);
    try {
      await application.budget.move.execute({
        source,
        target,
        month,
        amountCents: finalValueCents,
      });
      router.back();
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
    } finally {
      setSubmitting(false);
    }
  }

  async function createCategory(input: {
    groupId: string;
    name: string;
  }): Promise<Category> {
    const category = await application.categories.create.execute(input);
    invalidateTransactionReferenceData();
    const [nextBudget, nextGroups] = await Promise.all([
      application.budget.getMonth.execute(month),
      application.categories.getGroups.execute(),
    ]);
    setBudget(nextBudget);
    setGroups(nextGroups);
    return category;
  }

  function canFund(location: BudgetLocation): boolean {
    if (amountCents <= 0) return true;
    if (location.kind === 'ready-to-assign') {
      return (budget?.readyToAssign.cents ?? 0) >= amountCents;
    }
    return (
      (categories.find(({ category }) => category.id === location.categoryId)
        ?.available.cents ?? 0) >= amountCents
    );
  }

  function swap() {
    if (!canFund(target)) {
      setError(t('budget.swapInsufficient'));
      return;
    }
    setSource(target);
    setTarget(source);
    setError(null);
  }

  if (!budget) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header onBack={() => router.back()} />
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

  const selectedLocation = selecting === 'source' ? source : target;
  const oppositeLocation = selecting === 'source' ? target : source;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
        <Header
          disabled={submitting || amountCents <= 0}
          onBack={() => router.back()}
          onDone={() => void submit()}
        />
        <BottomActionLayout
          bottom={
            <View
              style={[
                styles.bottom,
                { paddingBottom: Math.max(insets.bottom, 10) },
              ]}
            >
              <MoneyKeypad
                calculator
                onChange={setAmountCents}
                ref={keypadRef}
                showDone={false}
                valueCents={amountCents}
              />
            </View>
          }
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.amount}>
              {formatMoney(Money.fromCents(amountCents))}
            </Text>
            <View style={styles.transferCard}>
              <Pressable
                accessibilityLabel={t('budget.swap')}
                onPress={swap}
                style={styles.swap}
              >
                <MaterialCommunityIcons
                  color={theme.colors.primary}
                  name="swap-vertical"
                  size={25}
                />
              </Pressable>
              <View style={styles.locationStack}>
                <LocationRow
                  label={t('budget.from')}
                  onPress={() => {
                    keypadRef.current?.resolve();
                    setSelecting('source');
                  }}
                  value={labelFor(source)}
                />
                <LocationRow
                  label={t('budget.to')}
                  onPress={() => {
                    keypadRef.current?.resolve();
                    setSelecting('target');
                  }}
                  value={labelFor(target)}
                />
              </View>
            </View>
            {error ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {error}
              </Text>
            ) : null}
          </ScrollView>
        </BottomActionLayout>
      </SafeAreaView>

      {selecting ? (
        <SelectCategoryScreen
          allowCreateCategory
          excludedCategoryIds={[
            ...(selecting === 'source' && target.kind === 'category'
              ? [target.categoryId]
              : []),
            ...(selecting === 'target' && source.kind === 'category'
              ? [source.categoryId]
              : []),
          ]}
          groups={groups}
          overlay
          onBack={() => setSelecting(null)}
          onCreateCategory={createCategory}
          onSelect={(selection) => {
            const location: BudgetLocation =
              selection.kind === 'ready-to-assign'
                ? { kind: 'ready-to-assign' }
                : selection.kind === 'category'
                  ? { kind: 'category', categoryId: selection.category.id }
                  : selecting === 'source'
                    ? source
                    : target;
            if (selecting === 'source') setSource(location);
            else setTarget(location);
            setError(null);
          }}
          readyToAssignDescription={formatMoney(budget.readyToAssign)}
          selectedCategoryId={
            selectedLocation.kind === 'category'
              ? selectedLocation.categoryId
              : undefined
          }
          selectedSpecial={
            selectedLocation.kind === 'ready-to-assign'
              ? 'ready-to-assign'
              : undefined
          }
          showReadyToAssign={oppositeLocation.kind !== 'ready-to-assign'}
          title={
            selecting === 'source'
              ? t('budget.selectSource')
              : t('budget.selectDestination')
          }
        />
      ) : null}
    </View>
  );
}

function currentMonth(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function Header({
  disabled,
  onBack,
  onDone,
}: Readonly<{
  disabled?: boolean;
  onBack: () => void;
  onDone?: () => void;
}>) {
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
      <Text style={styles.title}>{t('budget.moveMoney')}</Text>
      {onDone ? (
        <Pressable disabled={disabled} onPress={onDone} style={styles.done}>
          <Text style={[styles.doneText, disabled && styles.disabled]}>
            {t('common.done')}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

function LocationRow({
  label,
  value,
  onPress,
}: Readonly<{ label: string; value: string; onPress: () => void }>) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onPress} style={styles.locationRow}>
      <View style={styles.locationCopy}>
        <Text style={styles.locationLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.locationValue}>
          {value}
        </Text>
      </View>
      <MaterialCommunityIcons
        color={theme.colors.textMuted}
        name="chevron-right"
        size={22}
      />
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    screen: { flex: 1, backgroundColor: theme.colors.background },
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
    title: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 21,
      fontWeight: '800',
      textAlign: 'center',
    },
    spacer: { width: 44 },
    content: {
      width: '100%',
      maxWidth: 620,
      padding: 22,
      paddingBottom: 12,
      alignSelf: 'center',
      alignItems: 'center',
    },
    amount: {
      marginVertical: 15,
      color: theme.colors.text,
      fontSize: 42,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    transferCard: {
      width: '100%',
      minHeight: 116,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 22,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    locationStack: { flex: 1, paddingVertical: 6 },
    locationRow: {
      minHeight: 50,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    locationCopy: { flex: 1 },
    locationLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    locationValue: {
      marginTop: 4,
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    swap: {
      width: 48,
      marginRight: 4,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    error: {
      width: '100%',
      padding: 12,
      marginTop: 14,
      color: theme.colors.negative,
      backgroundColor: theme.colors.negativeMuted,
      borderRadius: 12,
      fontSize: 13,
    },
    bottom: { flexShrink: 0, backgroundColor: theme.colors.background },
    done: {
      width: 58,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneText: { color: theme.colors.primary, fontSize: 15, fontWeight: '800' },
    disabled: { opacity: 0.5 },
  });
