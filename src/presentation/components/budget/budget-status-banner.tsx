import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

type BannerTone = 'positive' | 'negative' | 'notice';

type Props = Readonly<{
  actionLabel: string;
  label: string;
  labelTone?: BannerTone;
  onPress?: () => void;
  tone: BannerTone;
  prominence?: 'primary' | 'secondary';
}>;

export function BudgetStatusBanner({
  actionLabel,
  label,
  onPress,
  tone,
  labelTone = tone,
  prominence = 'secondary',
}: Props) {
  const styles = useThemedStyles(createStyles);
  const content = (
    <>
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          prominence === 'primary' && styles.primaryLabel,
          styles[`${labelTone}Text`],
        ]}
      >
        {label}
      </Text>
      <View style={onPress ? styles.actionButton : undefined}>
        <Text
          style={[
            styles.action,
            prominence === 'primary' && styles.primaryAction,
            onPress ? styles.actionButtonText : styles[`${tone}Text`],
          ]}
        >
          {actionLabel}
        </Text>
      </View>
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
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderWidth: StyleSheet.hairlineWidth,
    },
    label: {
      flex: 1,
      fontSize: 14,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    primaryLabel: { fontSize: 18 },
    actionButton: {
      minHeight: 38,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.primary,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    action: { flexShrink: 0, fontSize: 13, fontWeight: '800' },
    primaryAction: { fontSize: 15 },
    actionButtonText: { color: theme.colors.onPrimary },
    positiveText: { color: theme.colors.positive },
    negativeText: { color: theme.colors.negative },
    noticeText: { color: theme.colors.textSecondary },
    pressed: { opacity: 0.72 },
  });
