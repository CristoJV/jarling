import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedBottomSheetModal } from '@/presentation/components/common/animated-bottom-sheet-modal';
import { AnimatedCenteredModal } from '@/presentation/components/common/animated-centered-modal';
import { SafeBottomSheet } from '@/presentation/components/common/safe-bottom-sheet';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

export type SelectionOption<Value extends string> = Readonly<{
  value: Value;
  label: string;
  description?: string;
}>;

type SelectionModalProps<Value extends string> = Readonly<{
  title: string;
  options: readonly SelectionOption<Value>[];
  selectedValue?: Value;
  onSelect: (value: Value) => void;
  onDismiss: () => void;
  placement?: 'bottom' | 'center';
}>;

export function SelectionModal<Value extends string>({
  title,
  options,
  selectedValue,
  onSelect,
  onDismiss,
  placement = 'bottom',
}: SelectionModalProps<Value>) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const centered = placement === 'center';
  const sheet = (
    <Pressable style={[styles.sheet, centered && styles.sheetCentered]}>
      <SafeBottomSheet respectBottomInset={!centered}>
        {centered ? null : <View style={styles.handle} />}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable hitSlop={10} onPress={onDismiss}>
            <Text style={styles.dismiss}>{t('common.close')}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.options}>
          {options.map((option) => {
            const selected = option.value === selectedValue;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={option.value}
                onPress={() => {
                  onSelect(option.value);
                  onDismiss();
                }}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <View style={styles.optionCopy}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  {option.description ? (
                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.check}>{selected ? '✓' : ''}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeBottomSheet>
    </Pressable>
  );

  if (!centered) {
    return (
      <AnimatedBottomSheetModal onDismiss={onDismiss}>
        {sheet}
      </AnimatedBottomSheetModal>
    );
  }

  return (
    <AnimatedCenteredModal onDismiss={onDismiss}>{sheet}</AnimatedCenteredModal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    sheet: {
      width: '100%',
      maxHeight: '82%',
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      overflow: 'hidden',
    },
    sheetCentered: {
      width: '100%',
      maxWidth: 460,
      borderRadius: 24,
    },
    handle: {
      width: 42,
      height: 5,
      marginTop: 10,
      backgroundColor: theme.colors.border,
      borderRadius: 3,
      alignSelf: 'center',
    },
    header: {
      minHeight: 64,
      paddingHorizontal: 22,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
    dismiss: { color: theme.colors.primary, fontSize: 14, fontWeight: '700' },
    options: { paddingHorizontal: 16, paddingBottom: 12 },
    option: {
      minHeight: 64,
      paddingHorizontal: 10,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
    },
    optionSelected: { backgroundColor: theme.colors.surfacePressed },
    optionCopy: { flex: 1, paddingVertical: 12 },
    optionLabel: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
    optionDescription: {
      marginTop: 3,
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    check: {
      width: 28,
      color: theme.colors.primary,
      fontSize: 20,
      textAlign: 'center',
    },
  });
