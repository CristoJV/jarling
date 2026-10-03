import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CATEGORY_NOTES_MAX_LENGTH } from '@/domain/entities/category';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

type CategoryNotesSectionProps = Readonly<{
  notes: string;
  saved: boolean;
  saving: boolean;
  onBlur: () => void;
  onChange: (notes: string) => void;
  onFocus: () => void;
  onSave: () => void;
}>;

export function CategoryNotesSection({
  notes,
  saved,
  saving,
  onBlur,
  onChange,
  onFocus,
  onSave,
}: CategoryNotesSectionProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('categoryDetails.notes')}</Text>
      <View style={styles.card}>
        <TextInput
          maxLength={CATEGORY_NOTES_MAX_LENGTH}
          multiline
          onBlur={onBlur}
          onChangeText={onChange}
          onFocus={onFocus}
          placeholder={t('categoryDetails.notesPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          textAlignVertical="top"
          value={notes}
        />
        <View style={styles.footer}>
          <Text style={styles.characterCount}>
            {notes.length}/{CATEGORY_NOTES_MAX_LENGTH}
          </Text>
          <Pressable disabled={saving} onPress={onSave} style={styles.button}>
            <Text style={styles.buttonText}>
              {saving ? t('form.saving') : t('categoryDetails.saveNotes')}
            </Text>
          </Pressable>
        </View>
        {saved ? (
          <Text accessibilityLiveRegion="polite" style={styles.success}>
            {t('categoryDetails.notesSaved')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    section: { gap: 10 },
    sectionTitle: {
      paddingHorizontal: 4,
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    card: {
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 20,
      borderWidth: 1,
    },
    input: {
      minHeight: 150,
      padding: 14,
      color: theme.colors.text,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 14,
      fontSize: 15,
      lineHeight: 21,
    },
    footer: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    characterCount: { color: theme.colors.textMuted, fontSize: 11 },
    button: {
      minHeight: 44,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: '800',
    },
    success: {
      marginTop: 10,
      color: theme.colors.positive,
      fontSize: 12,
      fontWeight: '700',
    },
  });
