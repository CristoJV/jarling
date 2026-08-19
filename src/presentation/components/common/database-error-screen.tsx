import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

type Props = Readonly<{ onRetry: () => void }>;

export function DatabaseErrorScreen({ onRetry }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.icon}>🛠️</Text>
        <Text style={styles.title}>{t('databaseError.title')}</Text>
        <Text style={styles.description}>{t('databaseError.description')}</Text>
        <Pressable onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      padding: 24,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
    },
    card: {
      width: '100%',
      maxWidth: 520,
      padding: 26,
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      gap: 14,
      alignSelf: 'center',
    },
    icon: { fontSize: 36, textAlign: 'center' },
    title: { color: theme.colors.text, fontSize: 24, fontWeight: '800' },
    description: {
      color: theme.colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
    },
    retry: {
      minHeight: 50,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryText: { color: theme.colors.onPrimary, fontWeight: '800' },
  });
