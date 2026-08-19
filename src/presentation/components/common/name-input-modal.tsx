import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AnimatedBottomSheetModal } from '@/presentation/components/common/animated-bottom-sheet-modal';
import { AnimatedCenteredModal } from '@/presentation/components/common/animated-centered-modal';
import { SafeBottomSheet } from '@/presentation/components/common/safe-bottom-sheet';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

type NameInputModalProps = Readonly<{
  initialValue?: string;
  label: string;
  submitLabel: string;
  title: string;
  onDismiss: () => void;
  onSubmit: (name: string) => Promise<void>;
  allowEmpty?: boolean;
  multiline?: boolean;
  placement?: 'bottom' | 'center';
}>;

export function NameInputModal({
  initialValue = '',
  label,
  submitLabel,
  title,
  onDismiss,
  onSubmit,
  allowEmpty = false,
  multiline = false,
  placement = 'bottom',
}: NameInputModalProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [name, setName] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!allowEmpty && name.trim().length === 0) {
      setError(t('form.enterName'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(name);
      onDismiss();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('form.couldNotSave'));
    } finally {
      setSubmitting(false);
    }
  }

  const content = (
    <SafeBottomSheet
      bottomPadding={24}
      respectBottomInset={placement === 'bottom'}
      style={[styles.dialog, placement === 'center' && styles.dialogCentered]}
    >
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        style={styles.body}
      >
        <Text style={styles.title}>{title}</Text>
        <View style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            accessibilityLabel={label}
            autoCapitalize="sentences"
            autoFocus
            multiline={multiline}
            onChangeText={setName}
            onSubmitEditing={() => void submit()}
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType={multiline ? 'default' : 'done'}
            selectTextOnFocus={initialValue.length > 0}
            style={[styles.input, multiline && styles.inputMultiline]}
            value={name}
          />
        </View>

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          disabled={submitting}
          onPress={onDismiss}
          style={styles.cancel}
        >
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
    </SafeBottomSheet>
  );

  return placement === 'center' ? (
    <AnimatedCenteredModal keyboardAvoiding onDismiss={onDismiss}>
      {content}
    </AnimatedCenteredModal>
  ) : (
    <AnimatedBottomSheetModal keyboardAvoiding onDismiss={onDismiss}>
      {content}
    </AnimatedBottomSheetModal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    dialog: {
      width: '92%',
      maxWidth: 440,
      maxHeight: '90%',
      padding: 24,
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      gap: 16,
      overflow: 'hidden',
      alignSelf: 'center',
    },
    dialogCentered: {
      width: '100%',
      maxWidth: 640,
      maxHeight: '100%',
      borderRadius: 24,
    },
    body: { flexShrink: 1 },
    bodyContent: { gap: 20 },
    inputMultiline: {
      minHeight: 150,
      paddingTop: 14,
      textAlignVertical: 'top',
    },
    title: {
      color: theme.colors.text,
      fontSize: 21,
      fontWeight: '700',
    },
    field: {
      gap: 8,
    },
    label: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },
    input: {
      minHeight: 50,
      paddingHorizontal: 14,
      color: theme.colors.text,
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      fontSize: 16,
    },
    error: {
      color: theme.colors.negative,
      fontSize: 14,
    },
    actions: {
      flexShrink: 0,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: 10,
    },
    cancel: {
      minHeight: 44,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelText: {
      color: theme.colors.primary,
      fontSize: 15,
      fontWeight: '600',
    },
    submit: {
      minHeight: 44,
      paddingHorizontal: 18,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitText: {
      color: theme.colors.onPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    disabled: {
      opacity: 0.55,
    },
  });
