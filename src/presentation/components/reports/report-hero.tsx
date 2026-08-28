import { StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

type Props = Readonly<{
  amount: string;
  caption: string;
  eyebrow: string;
  negative?: boolean;
}>;

export function ReportHero({
  amount,
  caption,
  eyebrow,
  negative = false,
}: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={[styles.amount, negative && styles.negative]}>{amount}</Text>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      minHeight: 154,
      padding: 24,
      backgroundColor: theme.colors.primary,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eyebrow: {
      color: theme.colors.onPrimary,
      opacity: 0.78,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.1,
    },
    amount: {
      marginTop: 8,
      color: theme.colors.onPrimary,
      fontSize: 34,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    negative: { color: theme.colors.negativeMuted },
    caption: {
      marginTop: 4,
      color: theme.colors.onPrimary,
      opacity: 0.78,
      fontSize: 13,
      fontWeight: '600',
    },
  });
