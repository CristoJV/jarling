import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApplication } from '@/presentation/contexts/application-context';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';
import { useTranslation } from '@/presentation/localization/localization-provider';
import { useThemedStyles } from '@/presentation/theme/theme-provider';
import type { AppTheme } from '@/presentation/theme/theme';

export function SettingsScreen() {
  const router = useRouter();
  const application = useApplication();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [populating, setPopulating] = useState(false);

  async function populateSampleData() {
    setPopulating(true);
    try {
      const result = await application.samples.populate.execute();
      Alert.alert(
        result.populated
          ? t('settings.sampleAdded')
          : t('settings.sampleExists'),
        result.populated
          ? t('settings.sampleAddedDescription')
          : t('settings.sampleExistsDescription'),
        [
          { text: t('common.close'), style: 'cancel' },
          {
            text: t('settings.viewBudget'),
            onPress: () => router.replace('/budget'),
          },
        ],
      );
    } catch (cause) {
      Alert.alert(t('settings.sampleError'), domainErrorMessage(cause, t));
    } finally {
      setPopulating(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>{t('settings.development')}</Text>
          <Text style={styles.heading}>{t('settings.sampleData')}</Text>
          <Text style={styles.description}>
            {t('settings.sampleDescription')}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={populating}
            onPress={() => void populateSampleData()}
            style={[styles.populateButton, populating && styles.disabled]}
          >
            <Text style={styles.populateButtonText}>
              {populating ? t('settings.populating') : t('settings.populate')}
            </Text>
          </Pressable>
        </View>
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
      paddingHorizontal: 14,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backButtonText: {
      color: theme.colors.primary,
      fontSize: 36,
      lineHeight: 38,
    },
    title: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    headerSpacer: {
      width: 44,
    },
    content: {
      flex: 1,
      padding: 24,
      alignItems: 'center',
    },
    card: {
      width: '100%',
      maxWidth: 620,
      padding: 24,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 18,
      borderWidth: 1,
      gap: 10,
    },
    eyebrow: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.1,
    },
    heading: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    description: {
      color: theme.colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
    },
    populateButton: {
      minHeight: 48,
      paddingHorizontal: 16,
      marginTop: 10,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    populateButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    disabled: {
      opacity: 0.55,
    },
  });
