import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AnimatedCenteredModal } from '@/presentation/components/common/animated-centered-modal';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

type PasswordInputModalProps = Readonly<{
  confirm: boolean;
  onDismiss: () => void;
  onSubmit: (password: string) => Promise<void>;
  submitLabel: string;
  title: string;
}>;

export function PasswordInputModal({
  confirm,
  onDismiss,
  onSubmit,
  submitLabel,
  title,
}: PasswordInputModalProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (password.normalize('NFKC').length < 8) {
      setError(t('settings.passwordLength'));
      return;
    }
    if (confirm && password !== confirmation) {
      setError(t('settings.passwordMismatch'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(password);
      onDismiss();
    } catch {
      setError(t('settings.backupError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatedCenteredModal keyboardAvoiding onDismiss={onDismiss}>
      <View style={styles.dialog}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.help}>{t('settings.passwordHelp')}</Text>
        <TextInput
          accessibilityLabel={t('settings.password')}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          onChangeText={setPassword}
          placeholder={t('settings.password')}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry
          style={styles.input}
          value={password}
        />
        {confirm ? (
          <TextInput
            accessibilityLabel={t('settings.confirmPassword')}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setConfirmation}
            onSubmitEditing={() => void submit()}
            placeholder={t('settings.confirmPassword')}
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry
            style={styles.input}
            value={confirmation}
          />
        ) : null}
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable onPress={onDismiss} style={styles.cancel}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable
            disabled={submitting}
            onPress={() => void submit()}
            style={[styles.submit, submitting && styles.disabled]}
          >
            <Text style={styles.submitText}>
              {submitting ? t('form.saving') : submitLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </AnimatedCenteredModal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    dialog: {
      width: '100%',
      maxWidth: 520,
      padding: 24,
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      gap: 14,
    },
    title: { color: theme.colors.text, fontSize: 21, fontWeight: '800' },
    help: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
    input: {
      minHeight: 52,
      paddingHorizontal: 14,
      color: theme.colors.text,
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      fontSize: 16,
    },
    error: { color: theme.colors.negative, fontSize: 13 },
    actions: {
      marginTop: 4,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    cancel: { minHeight: 46, paddingHorizontal: 16, justifyContent: 'center' },
    cancelText: { color: theme.colors.primary, fontWeight: '700' },
    submit: {
      minHeight: 46,
      paddingHorizontal: 18,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      justifyContent: 'center',
    },
    submitText: { color: theme.colors.onPrimary, fontWeight: '800' },
    disabled: { opacity: 0.5 },
  });
