import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OverflowMenu } from '@/presentation/components/common/overflow-menu';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

type PlaceholderScreenProps = Readonly<{
  description: string;
  title: string;
}>;

export function PlaceholderScreen({
  description,
  title,
}: PlaceholderScreenProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <OverflowMenu />
      </View>
      <View style={styles.content}>
        <Text style={styles.heading}>{t('form.comingSoon')}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
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
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.6,
    },
    content: {
      flex: 1,
      padding: 32,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    heading: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    description: {
      maxWidth: 360,
      color: theme.colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },
  });
