import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  MAIN_SCREEN_HEADER_HEIGHT,
  MAIN_SCREEN_HORIZONTAL_PADDING,
} from '@/presentation/layout/main-screen-layout';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

type Props = Readonly<{
  active: boolean;
  hasFilters: boolean;
  onActivate: () => void;
  onCancel: () => void;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  value: string;
}>;

export function TransactionSearchHeader({
  active,
  hasFilters,
  onActivate,
  onCancel,
  onChangeText,
  onSubmit,
  value,
}: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return (
    <View style={styles.header}>
      {active ? (
        <>
          <Pressable
            accessibilityLabel={t('common.back')}
            hitSlop={8}
            onPress={onCancel}
            style={styles.headerButton}
          >
            <MaterialCommunityIcons
              color={theme.colors.text}
              name="arrow-left"
              size={24}
            />
          </Pressable>
          <TextInput
            accessibilityLabel={t('transactions.search')}
            autoCorrect={false}
            cursorColor={theme.colors.primary}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmit}
            placeholder={
              hasFilters
                ? t('transactions.refineSearch')
                : t('transactions.search')
            }
            placeholderTextColor={theme.colors.textMuted}
            ref={inputRef}
            returnKeyType="search"
            selectionColor={theme.colors.primaryMuted}
            style={styles.search}
            value={value}
          />
          <Pressable
            accessibilityLabel={t('transactions.clearSearch')}
            disabled={!value}
            hitSlop={8}
            onPress={() => onChangeText('')}
            style={styles.headerButton}
          >
            <MaterialCommunityIcons
              color={value ? theme.colors.text : theme.colors.textMuted}
              name="close"
              size={23}
            />
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.title}>{t('transactions.title')}</Text>
          <Pressable
            accessibilityLabel={t('transactions.search')}
            hitSlop={8}
            onPress={onActivate}
            style={styles.headerButton}
          >
            <MaterialCommunityIcons
              color={theme.colors.text}
              name="magnify"
              size={25}
            />
          </Pressable>
        </>
      )}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    header: {
      minHeight: MAIN_SCREEN_HEADER_HEIGHT,
      paddingHorizontal: MAIN_SCREEN_HORIZONTAL_PADDING,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      color: theme.colors.text,
      fontSize: 24,
      fontWeight: '700',
      letterSpacing: -0.6,
    },
    headerButton: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
    },
    search: {
      flex: 1,
      height: 44,
      paddingHorizontal: 13,
      paddingVertical: 0,
      color: theme.colors.text,
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 14,
      borderWidth: 1,
      fontSize: 15,
      fontWeight: '500',
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
  });
