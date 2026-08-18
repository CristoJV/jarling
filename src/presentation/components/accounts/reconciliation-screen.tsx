import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ReconciliationPreview } from '@/application/use-cases/accounts/get-reconciliation';
import type { ReconcileAccountInput } from '@/application/use-cases/accounts/reconcile-account';
import { Money } from '@/domain/value-objects/money';
import { FullScreenModal } from '@/presentation/components/common/full-screen-modal';
import { MoneyKeypad } from '@/presentation/components/common/money-keypad';
import { formatMoney } from '@/presentation/utils/money';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

type ReconciliationScreenProps = Readonly<{
  preview: ReconciliationPreview;
  onDismiss: () => void;
  onReconcile: (input: ReconcileAccountInput) => Promise<unknown>;
}>;

export function ReconciliationScreen({
  preview,
  onDismiss,
  onReconcile,
}: ReconciliationScreenProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [actualBalanceCents, setActualBalanceCents] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const differenceCents = actualBalanceCents - preview.clearedBalance.cents;

  async function finish(createAdjustment: boolean) {
    setSubmitting(true);
    setError(null);
    try {
      await onReconcile({
        accountId: preview.account.id,
        actualBalanceCents,
        createAdjustment,
      });
      Alert.alert(
        t('reconciliation.success'),
        t('reconciliation.successBody'),
        [{ text: 'OK', onPress: onDismiss }],
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('form.couldNotSave'));
    } finally {
      setSubmitting(false);
    }
  }

  function submit() {
    if (differenceCents === 0) {
      void finish(false);
      return;
    }
    Alert.alert(
      t('reconciliation.adjustTitle'),
      t('reconciliation.adjustBody', {
        amount: formatMoney(Money.fromCents(differenceCents)),
      }),
      [
        { text: t('reconciliation.review'), style: 'cancel' },
        {
          text: t('reconciliation.adjust'),
          onPress: () => void finish(true),
        },
      ],
    );
  }

  return (
    <FullScreenModal onRequestClose={onDismiss}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable hitSlop={10} onPress={onDismiss}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text numberOfLines={1} style={styles.title}>
            {t('reconciliation.title', { name: preview.account.name })}
          </Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.content}>
          <Text style={styles.question}>{t('reconciliation.question')}</Text>
          <Text style={styles.help}>{t('reconciliation.help')}</Text>
          <Text style={styles.amount}>
            {formatMoney(Money.fromCents(actualBalanceCents))}
          </Text>

          <View style={styles.summary}>
            <SummaryRow
              label={t('reconciliation.clearedBalance')}
              value={formatMoney(preview.clearedBalance)}
            />
            <SummaryRow
              label={t('reconciliation.workingBalance')}
              value={formatMoney(preview.workingBalance)}
            />
            <SummaryRow
              label={t('reconciliation.difference')}
              strong
              value={formatMoney(Money.fromCents(differenceCents))}
            />
            <Text style={styles.counts}>
              {t('reconciliation.counts', {
                cleared: preview.clearedCount,
                pending: preview.unclearedCount,
              })}
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            disabled={submitting}
            onPress={submit}
            style={[styles.reconcile, submitting && styles.disabled]}
          >
            <Text style={styles.reconcileText}>
              {differenceCents === 0
                ? t('reconciliation.finish')
                : t('reconciliation.adjust')}
            </Text>
          </Pressable>
        </View>

        <MoneyKeypad
          allowNegative
          onChange={setActualBalanceCents}
          valueCents={actualBalanceCents}
        />
      </SafeAreaView>
    </FullScreenModal>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: Readonly<{ label: string; value: string; strong?: boolean }>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryValueStrong]}>
        {value}
      </Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      minHeight: 64,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    back: { width: 36, color: theme.colors.text, fontSize: 42, lineHeight: 44 },
    title: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    spacer: { width: 36 },
    content: { flex: 1, paddingHorizontal: 24, alignItems: 'center' },
    question: {
      marginTop: 18,
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: '800',
    },
    help: {
      maxWidth: 460,
      marginTop: 8,
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },
    amount: {
      marginVertical: 24,
      color: theme.colors.positive,
      fontSize: 42,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    summary: {
      width: '100%',
      maxWidth: 520,
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      gap: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    summaryLabel: { color: theme.colors.textMuted, fontSize: 13 },
    summaryValue: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
    summaryValueStrong: { color: theme.colors.primary, fontSize: 16 },
    counts: {
      color: theme.colors.textMuted,
      fontSize: 11,
      textAlign: 'center',
    },
    error: { marginTop: 12, color: theme.colors.negative, fontSize: 13 },
    reconcile: {
      width: '100%',
      maxWidth: 520,
      minHeight: 52,
      marginTop: 18,
      backgroundColor: theme.colors.primary,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reconcileText: {
      color: theme.colors.onPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    disabled: { opacity: 0.55 },
  });
