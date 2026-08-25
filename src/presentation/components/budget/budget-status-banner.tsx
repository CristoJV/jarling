import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

type BannerTone = 'positive' | 'negative' | 'notice';

type Props = Readonly<{
  actionLabel: string;
  label: string;
  onPress?: () => void;
  tone: BannerTone;
}>;

export function BudgetStatusBanner({
  actionLabel,
  label,
  onPress,
  tone,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const content = (
    <>
      <Text numberOfLines={1} style={[styles.label, styles[`${tone}Text`]]}>
        {label}
      </Text>
      <Text style={[styles.action, styles[`${tone}Text`]]}>{actionLabel}</Text>
    </>
  );
  const style = [styles.banner, styles[`${tone}Banner`]];

  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    banner: {
      minHeight: 56,
      paddingHorizontal: 18,
      borderRadius: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    positiveBanner: { backgroundColor: theme.colors.positiveMuted },
    negativeBanner: { backgroundColor: theme.colors.negativeMuted },
    noticeBanner: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
    },
    label: {
      flex: 1,
      fontSize: 16,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    action: { flexShrink: 0, fontSize: 14, fontWeight: '800' },
    positiveText: { color: theme.colors.positive },
    negativeText: { color: theme.colors.negative },
    noticeText: { color: theme.colors.primary },
    pressed: { opacity: 0.72 },
  });
