import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

type Props = Readonly<{
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  muted?: boolean;
  overline?: string;
  onPress: () => void;
  testID?: string;
}>;

export function FormRow({
  icon,
  label,
  muted = false,
  overline,
  onPress,
  testID,
}: Props) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onPress} style={styles.row} testID={testID}>
      {icon ? (
        <View style={styles.icon}>
          <MaterialCommunityIcons
            color={theme.colors.textMuted}
            name={icon}
            size={23}
          />
        </View>
      ) : null}
      <View style={styles.copy}>
        {overline ? <Text style={styles.overline}>{overline}</Text> : null}
        <Text style={[styles.label, muted && styles.muted]}>{label}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    row: {
      minHeight: 58,
      paddingHorizontal: 20,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: { width: 36, alignItems: 'center', justifyContent: 'center' },
    copy: { flex: 1, paddingHorizontal: 12 },
    overline: {
      marginBottom: 2,
      color: theme.colors.textMuted,
      fontSize: theme.typography.caption,
      fontWeight: '600',
    },
    label: { color: theme.colors.text, fontSize: 17, fontWeight: '600' },
    muted: { color: theme.colors.textMuted, fontWeight: '500' },
    chevron: { color: theme.colors.textMuted, fontSize: 25 },
  });
