import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { RefObject } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

type Props = Readonly<{
  inputRef?: RefObject<TextInput | null>;
  onChangeText: (value: string) => void;
  onSubmit?: () => void;
  placeholder: string;
  value: string;
}>;

export function SearchableSelectionInput({
  inputRef,
  onChangeText,
  onSubmit,
  placeholder,
  value,
}: Props) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons
        color={theme.colors.textMuted}
        name="magnify"
        size={22}
      />
      <TextInput
        autoCapitalize="words"
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        ref={inputRef}
        returnKeyType="done"
        style={styles.input}
        value={value}
      />
      {value ? (
        <Pressable hitSlop={8} onPress={() => onChangeText('')}>
          <MaterialCommunityIcons
            color={theme.colors.textMuted}
            name="close-circle"
            size={20}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrap: {
      minHeight: 50,
      marginHorizontal: 20,
      marginBottom: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    input: {
      flex: 1,
      minHeight: 50,
      color: theme.colors.text,
      fontSize: 16,
    },
  });
