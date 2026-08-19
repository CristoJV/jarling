import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AccountType } from '@/domain/entities/account';
import { FullScreenModal } from '@/presentation/components/common/full-screen-modal';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

type Props = Readonly<{
  selected: AccountType;
  onDismiss: () => void;
  onSelect: (type: AccountType) => void;
}>;

type Option = Readonly<{
  type: AccountType;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}>;

const cashOptions: readonly Option[] = [
  { type: 'checking', icon: 'bank-outline' },
  { type: 'savings', icon: 'piggy-bank-outline' },
  { type: 'cash', icon: 'cash' },
];
const creditOptions: readonly Option[] = [
  { type: 'credit_card', icon: 'credit-card-outline' },
  { type: 'line_of_credit', icon: 'credit-card-clock-outline' },
];
const trackingOptions: readonly Option[] = [
  { type: 'tracking', icon: 'chart-line' },
  { type: 'loan', icon: 'hand-coin-outline' },
];

export function AccountTypeScreen({ selected, onDismiss, onSelect }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const labels: Record<AccountType, string> = {
    checking: t('accounts.checking'),
    savings: t('accounts.savings'),
    cash: t('accounts.cash'),
    credit_card: t('accounts.creditCard'),
    line_of_credit: t('accounts.lineOfCredit'),
    tracking: t('accounts.tracking'),
    loan: t('accounts.loan'),
  };

  function section(
    title: string,
    description: string,
    options: readonly Option[],
  ) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.card}>
          {options.map((option, index) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: selected === option.type }}
              key={option.type}
              onPress={() => {
                onSelect(option.type);
                onDismiss();
              }}
              style={({ pressed }) => [
                styles.option,
                index > 0 && styles.divider,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color={styles.icon.color}
                name={option.icon}
                size={25}
              />
              <Text style={styles.optionLabel}>{labels[option.type]}</Text>
              <Text style={styles.check}>
                {selected === option.type ? '✓' : '›'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <FullScreenModal onRequestClose={onDismiss}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Pressable hitSlop={10} onPress={onDismiss}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.title}>{t('accounts.type')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {section(
            t('accounts.cashAccounts'),
            t('accounts.cashAccountsDescription'),
            cashOptions,
          )}
          {section(
            t('accounts.creditAccounts'),
            t('accounts.creditAccountsDescription'),
            creditOptions,
          )}
          {section(
            t('accounts.trackingAccounts'),
            t('accounts.trackingAccountsDescription'),
            trackingOptions,
          )}
        </ScrollView>
      </SafeAreaView>
    </FullScreenModal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      minHeight: 64,
      paddingHorizontal: 20,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
    },
    back: { width: 40, color: theme.colors.primary, fontSize: 40 },
    title: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 21,
      fontWeight: '700',
      textAlign: 'center',
    },
    headerSpacer: { width: 40 },
    content: {
      width: '100%',
      maxWidth: 680,
      padding: 24,
      paddingBottom: 48,
      gap: 30,
      alignSelf: 'center',
    },
    section: { gap: 8 },
    sectionTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
    description: {
      color: theme.colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    card: {
      marginTop: 6,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 18,
      borderWidth: 1,
      overflow: 'hidden',
    },
    option: {
      minHeight: 66,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    divider: { borderTopColor: theme.colors.border, borderTopWidth: 1 },
    pressed: { backgroundColor: theme.colors.surfacePressed },
    icon: { color: theme.colors.primary },
    optionLabel: { flex: 1, color: theme.colors.text, fontSize: 17 },
    check: { color: theme.colors.primary, fontSize: 23, fontWeight: '700' },
  });
