import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TransactionStatus } from '@/domain/entities/transaction';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';
import type { TransactionSearchField } from '@/presentation/utils/transaction-search';

export type TransactionSuggestion = Readonly<{ id: string; label: string }>;

type Props = Readonly<{
  accounts: readonly TransactionSuggestion[];
  categories: readonly TransactionSuggestion[];
  onSelectAccount: (id: string) => void;
  onSelectCategory: (id: string) => void;
  onSelectStatus: (status: TransactionStatus) => void;
  onSelectText: (field: TransactionSearchField) => void;
  searchLabels: Readonly<Record<TransactionSearchField, string>>;
  statuses: readonly Readonly<{ value: TransactionStatus; label: string }>[];
  value: string;
}>;

export function TransactionSearchSuggestions({
  accounts,
  categories,
  onSelectAccount,
  onSelectCategory,
  onSelectStatus,
  onSelectText,
  searchLabels,
  statuses,
  value,
}: Props) {
  const { language, t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const query = value.trim();
  const normalized = query.toLocaleLowerCase(language);
  const matchingAccounts = matching(accounts, normalized, language);
  const matchingCategories = matching(categories, normalized, language);
  const matchingStatuses = matching(statuses, normalized, language);

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
      ) : null}

      {matchingAccounts.length > 0 ? (
        <Section title={t('transactions.accountsFilter')}>
          {matchingAccounts.map((account) => (
            <Option
              key={account.id}
              label={account.label}
              onPress={() => onSelectAccount(account.id)}
            />
          ))}
        </Section>
      ) : null}

      {matchingCategories.length > 0 ? (
        <Section title={t('transactions.categoriesFilter')}>
          {matchingCategories.map((category) => (
            <Option
              key={category.id}
              label={category.label}
              onPress={() => onSelectCategory(category.id)}
            />
          ))}
        </Section>
      ) : null}

      {matchingStatuses.length > 0 ? (
        <Section title={t('transactions.clearedFilter')}>
          {matchingStatuses.map((status) => (
            <Option
              key={status.value}
              label={status.label}
              onPress={() => onSelectStatus(status.value)}
            />
          ))}
        </Section>
      ) : null}
    </ScrollView>
  );
}

function matching<Item extends Readonly<{ label: string }>>(
  items: readonly Item[],
  normalized: string,
  language: string,
) {
  if (!normalized) return items;
  return items.filter(({ label }) =>
    label.toLocaleLowerCase(language).includes(normalized),
  );
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
