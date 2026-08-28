import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TransactionStatus } from '@/domain/entities/transaction';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';
import type {
  TransactionDateFilter,
  TransactionDatePreset,
} from '@/presentation/utils/transaction-date-filter';
import type { TransactionSearchField } from '@/presentation/utils/transaction-search';

type Props = Readonly<{
  dateFilter?: TransactionDateFilter;
  onSelectAccount: () => void;
  onSelectCategory: () => void;
  onSelectDateBoundary: (boundary: 'from' | 'to') => void;
  onSelectDatePreset: (preset: TransactionDatePreset) => void;
  onSelectStatus: (status: TransactionStatus) => void;
  onSelectText: (field: TransactionSearchField) => void;
  onSelectUncategorized: () => void;
  searchLabels: Readonly<Record<TransactionSearchField, string>>;
  statuses: readonly Readonly<{ value: TransactionStatus; label: string }>[];
  value: string;
}>;

export function TransactionSearchSuggestions({
  dateFilter,
  onSelectAccount,
  onSelectCategory,
  onSelectDateBoundary,
  onSelectDatePreset,
  onSelectStatus,
  onSelectText,
  onSelectUncategorized,
  searchLabels,
  statuses,
  value,
}: Props) {
  const { language, t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const query = value.trim();

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {query ? (
        <Text style={styles.context}>
          {t('transactions.searchingFor', { value: query })}
        </Text>
      ) : null}
      <Text style={styles.title}>{t('transactions.suggestions')}</Text>

      {query ? (
        <Section title={t('transactions.textFilter')}>
          {(['search', 'payee', 'memo'] as const).map((field) => (
            <Option
              key={field}
              label={t('transactions.contains', {
                field: searchLabels[field],
                value: query,
              })}
              onPress={() => onSelectText(field)}
            />
          ))}
        </Section>
      ) : (
        <>
          <Section title={t('transactions.dateFilter')}>
            {(
              [
                ['this-week', t('transactions.thisWeek')],
                ['previous-week', t('transactions.previousWeek')],
                ['this-month', t('transactions.thisMonth')],
                ['previous-month', t('transactions.previousMonth')],
              ] as const
            ).map(([preset, label]) => (
              <Option
                key={preset}
                label={label}
                onPress={() => onSelectDatePreset(preset)}
              />
            ))}
            <Option
              label={
                dateFilter?.dateFrom
                  ? t('transactions.fromDateValue', {
                      value: formatDate(dateFilter.dateFrom, language),
                    })
                  : t('transactions.fromDate')
              }
              onPress={() => onSelectDateBoundary('from')}
            />
            <Option
              label={
                dateFilter?.dateTo
                  ? t('transactions.toDateValue', {
                      value: formatDate(dateFilter.dateTo, language),
                    })
                  : t('transactions.toDate')
              }
              onPress={() => onSelectDateBoundary('to')}
            />
          </Section>

          <Section title={t('transactions.categoriesFilter')}>
            <Option
              label={t('transactions.uncategorized')}
              onPress={onSelectUncategorized}
            />
            <Option
              label={t('transactions.selectCategoryFilter')}
              onPress={onSelectCategory}
            />
          </Section>

          <Section title={t('transactions.accountsFilter')}>
            <Option
              label={t('transactions.selectAccountFilter')}
              onPress={onSelectAccount}
            />
          </Section>

          <Section title={t('transactions.clearedFilter')}>
            {statuses.map((status) => (
              <Option
                key={status.value}
                label={status.label}
                onPress={() => onSelectStatus(status.value)}
              />
            ))}
          </Section>
        </>
      )}
    </ScrollView>
  );
}

function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

function Section({
  children,
  title,
}: Readonly<{ children: React.ReactNode; title: string }>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.separator} />
      </View>
      {children}
    </View>
  );
}

function Option({
  label,
  onPress,
}: Readonly<{ label: string; onPress: () => void }>) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <Text style={styles.optionText}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    content: {
      width: '100%',
      maxWidth: 760,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 48,
      alignSelf: 'center',
    },
    context: {
      marginBottom: 8,
      color: theme.colors.textSecondary,
      fontSize: 13,
    },
    title: {
      marginBottom: 12,
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    section: { marginBottom: 18 },
    sectionHeader: {
      minHeight: 32,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionTitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '800',
    },
    separator: { height: 1, backgroundColor: theme.colors.border, flex: 1 },
    option: {
      minHeight: 48,
      paddingHorizontal: 12,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      justifyContent: 'center',
    },
    optionText: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
    pressed: { backgroundColor: theme.colors.surfacePressed },
  });
