import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import type { BudgetMonthValues } from '@/domain/services/calculate-budget-month';
import { Money } from '@/domain/value-objects/money';
import { FullScreenSelectionScreen } from '@/presentation/components/common/full-screen-selection-screen';
import { BottomActionLayout } from '@/presentation/components/common/bottom-action-layout';
import { MoneyKeypad } from '@/presentation/components/common/money-keypad';
import { useApplication } from '@/presentation/contexts/application-context';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { categoryDisplayName } from '@/presentation/utils/category-name';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';
import { formatMoney } from '@/presentation/utils/money';

type LocationValue = 'ready-to-assign' | `category:${string}`;

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

  useEffect(() => {
    let active = true;
    application.budget.getMonth.execute(month).then(
      (value) => {
        if (!active) return;
        setBudget(value);
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
  const options = useMemo(
    () => [
      {
        value: 'ready-to-assign' as const,
        label: t('budget.readyToAssign'),
        description: formatMoney(budget?.readyToAssign ?? Money.zero()),
      },
      ...categories.map(({ category, available }) => ({
        value: `category:${category.id}` as const,
        label: categoryDisplayName(category, t),
        description: t('budget.availableAmount', {
          amount: formatMoney(available),
        }),
      })),
    ],
    [budget, categories, t],
  );

  function selectedValue(location: BudgetLocation): LocationValue {
    return location.kind === 'ready-to-assign'
      ? 'ready-to-assign'
      : `category:${location.categoryId}`;
  }

  function parseLocation(value: LocationValue): BudgetLocation {
    return value === 'ready-to-assign'
      ? { kind: 'ready-to-assign' }
      : { kind: 'category', categoryId: value.slice('category:'.length) };
  }

  function labelFor(location: BudgetLocation): string {
    if (location.kind === 'ready-to-assign') return t('budget.readyToAssign');
    const values = categories.find(
      ({ category }) => category.id === location.categoryId,
    );
    return values
      ? categoryDisplayName(values.category, t)
      : t('common.choose');
  }

  async function submit(valueCents = amountCents) {
    setSubmitting(true);
    setError(null);
    try {
      await application.budget.move.execute({
        source,
        target,
        month,
        amountCents: valueCents,
      });
      router.back();
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
    } finally {
      setSubmitting(false);
    }
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

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
        <Header onBack={() => router.back()} />
        <BottomActionLayout
          bottom={
            <View
              style={[
                styles.bottom,
                { paddingBottom: Math.max(insets.bottom, 10) },
              ]}
            >
              <Pressable
                disabled={submitting || amountCents <= 0}
                onPress={() => void submit()}
                style={[
                  styles.submit,
                  (submitting || amountCents <= 0) && styles.disabled,
                ]}
              >
                <Text style={styles.submitText}>
                  {submitting ? t('budget.moving') : t('budget.moveMoney')}
                </Text>
              </Pressable>
              <MoneyKeypad
                calculator
                onChange={setAmountCents}
                onDone={(value) => void submit(value)}
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
              <LocationRow
                label={t('budget.from')}
                onPress={() => setSelecting('source')}
                value={labelFor(source)}
              />
              <Pressable
                accessibilityLabel={t('budget.swap')}
                onPress={() => {
                  setSource(target);
                  setTarget(source);
                  setError(null);
                }}
                style={styles.swap}
              >
                <MaterialCommunityIcons
                  color={theme.colors.primary}
                  name="swap-vertical"
                  size={25}
                />
              </Pressable>
              <LocationRow
                label={t('budget.to')}
                onPress={() => setSelecting('target')}
                value={labelFor(target)}
              />
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
        <FullScreenSelectionScreen
          overlay
          onBack={() => setSelecting(null)}
          onSelect={(value) => {
            const location = parseLocation(value);
            if (selecting === 'source') setSource(location);
            else setTarget(location);
            setError(null);
          }}
          options={options}
          selectedValue={selectedValue(
            selecting === 'source' ? source : target,
          )}
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

function Header({ onBack }: Readonly<{ onBack: () => void }>) {
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
      <View style={styles.spacer} />
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
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 22,
      borderWidth: 1,
      overflow: 'hidden',
    },
    locationRow: {
      minHeight: 76,
      paddingHorizontal: 18,
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
      width: 46,
      height: 46,
      marginVertical: -8,
      marginRight: 18,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 23,
      alignSelf: 'flex-end',
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
    submit: {
      minHeight: 52,
      marginHorizontal: 20,
      marginBottom: 6,
      backgroundColor: theme.colors.primary,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitText: {
      color: theme.colors.onPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    disabled: { opacity: 0.5 },
  });
