import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedBottomSheetModal } from '@/presentation/components/common/animated-bottom-sheet-modal';
import { AnimatedCenteredModal } from '@/presentation/components/common/animated-centered-modal';
import { SafeBottomSheet } from '@/presentation/components/common/safe-bottom-sheet';
import type { SelectionOption } from '@/presentation/components/common/selection-option';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

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
  const optionRows = options.map((option, index) => {
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
        style={[
          styles.option,
          index === options.length - 1 && styles.optionLast,
          selected && styles.optionSelected,
        ]}
      >
        <View style={styles.optionCopy}>
          <Text style={styles.optionLabel}>{option.label}</Text>
          {option.description ? (
            <Text style={styles.optionDescription}>{option.description}</Text>
          ) : null}
        </View>
        <Text style={styles.check}>{selected ? '✓' : ''}</Text>
      </Pressable>
    );
  });
  const header = (
    <View style={styles.header}>
      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      <Pressable hitSlop={10} onPress={onDismiss}>
        <Text style={styles.dismiss}>{t('common.close')}</Text>
      </Pressable>
    </View>
  );
  const optionList = (
    <ScrollView
      contentContainerStyle={styles.options}
      style={styles.optionsScroll}
    >
      {optionRows}
    </ScrollView>
  );

  if (!centered) {
    return (
      <AnimatedBottomSheetModal onDismiss={onDismiss}>
        <Pressable style={styles.sheet}>
          <SafeBottomSheet>
            <View style={styles.handle} />
            {header}
            {optionList}
          </SafeBottomSheet>
        </Pressable>
      </AnimatedBottomSheetModal>
    );
  }

  return (
    <AnimatedCenteredModal onDismiss={onDismiss}>
      <View style={styles.centeredFrame}>
        <View style={styles.centeredDialog}>
          {header}
          {optionList}
        </View>
      </View>
    </AnimatedCenteredModal>
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
    centeredFrame: {
      width: '100%',
      maxWidth: 440,
      maxHeight: '100%',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.2,
      shadowRadius: 18,
      elevation: 12,
    },
    centeredDialog: {
      width: '100%',
      maxHeight: '100%',
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      overflow: 'hidden',
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
    title: {
      minWidth: 0,
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '700',
      flex: 1,
    },
    dismiss: { color: theme.colors.primary, fontSize: 14, fontWeight: '700' },
    options: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
    optionsScroll: { flexShrink: 1 },
    option: {
      minHeight: 64,
      paddingHorizontal: 10,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
    },
    optionSelected: { backgroundColor: theme.colors.surfacePressed },
    optionLast: { borderBottomWidth: 0 },
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
