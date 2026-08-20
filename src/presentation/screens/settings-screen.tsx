import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SelectionModal } from '@/presentation/components/common/selection-modal';
import { KeyboardResponsiveScreen } from '@/presentation/components/common/keyboard-responsive-screen';
import { PasswordInputModal } from '@/presentation/components/common/password-input-modal';
import { useApplication } from '@/presentation/contexts/application-context';
import { invalidateTransactionReferenceData } from '@/presentation/cache/transaction-reference-data';
import { useTranslation } from '@/presentation/localization/localization-provider';
import {
  CURRENCIES,
  CURRENCY_PLACEMENTS,
  DATE_FORMATS,
  NUMBER_FORMATS,
  type BudgetPreferences,
  type CurrencyCode,
  type CurrencyPlacement,
  type DateFormatPreference,
  type NumberFormatPreference,
  type ThemePreference,
  parsePreferences,
} from '@/presentation/preferences/preferences';
import { usePreferences } from '@/presentation/preferences/preferences-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';
import { formatDate, formatMoney } from '@/presentation/utils/money';
import { Money } from '@/domain/value-objects/money';

type Selector = 'currency' | 'number' | 'placement' | 'date' | null;
type DataAction = 'backup' | 'restore' | null;

export function SettingsScreen() {
  const router = useRouter();
  const application = useApplication();
  const { language, t } = useTranslation();
  const {
    preferences,
    updatePreferences,
    resetBudgetPreferences,
    markSessionUnlocked,
  } = usePreferences();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [budgetDraft, setBudgetDraft] = useState<BudgetPreferences>(() => ({
    budgetName: preferences.budgetName,
    currency: preferences.currency,
    numberFormat: preferences.numberFormat,
    currencyPlacement: preferences.currencyPlacement,
    dateFormat: preferences.dateFormat,
  }));
  const [selector, setSelector] = useState<Selector>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [populating, setPopulating] = useState(false);
  const [dataAction, setDataAction] = useState<DataAction>(null);
  const [exporting, setExporting] = useState(false);

  function requestExport() {
    Alert.alert(t('settings.exportWarningTitle'), t('settings.exportWarning'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.export'), onPress: () => void exportData() },
    ]);
  }

  async function exportData() {
    setExporting(true);
    try {
      await application.planPortability.exportData(preferences);
    } catch {
      Alert.alert(t('settings.dataError'));
    } finally {
      setExporting(false);
    }
  }

  async function createBackup(password: string) {
    await application.planPortability.createBackup(password, preferences);
    Alert.alert(t('settings.backupCreated'));
  }

  async function restoreBackup(password: string) {
    const result = await application.planPortability.restoreBackup(password);
    if (!result.restored) return;
    invalidateTransactionReferenceData();
    if (result.preferences !== undefined) {
      await updatePreferences(
        parsePreferences(JSON.stringify(result.preferences)),
      );
    }
    Alert.alert(
      t('settings.restoreComplete'),
      t('settings.restoreCompleteBody'),
      [{ text: t('common.done'), onPress: () => router.replace('/budget') }],
    );
  }

  function requestRestore() {
    Alert.alert(
      t('settings.restoreWarningTitle'),
      t('settings.restoreWarning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.restore'),
          style: 'destructive',
          onPress: () => setDataAction('restore'),
        },
      ],
    );
  }

  async function saveBudgetSettings() {
    if (!budgetDraft.budgetName.trim()) return;
    setSaving(true);
    try {
      await updatePreferences({
        ...budgetDraft,
        budgetName: budgetDraft.budgetName.trim(),
      });
      Alert.alert(t('settings.saved'));
    } catch {
      Alert.alert(t('settings.saveError'));
    } finally {
      setSaving(false);
    }
  }

  function requestDeletePlan() {
    Alert.alert(t('settings.deletePlanTitle'), t('settings.deletePlanBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deletePlanConfirm'),
        style: 'destructive',
        onPress: () => void deletePlan(),
      },
    ]);
  }

  async function deletePlan() {
    setDeleting(true);
    try {
      await application.plan.delete.execute();
      invalidateTransactionReferenceData();
      await resetBudgetPreferences();
      Alert.alert(t('settings.planDeleted'), t('settings.planDeletedBody'), [
        { text: t('common.done'), onPress: () => router.replace('/budget') },
      ]);
    } catch {
      Alert.alert(t('settings.deletePlanError'));
    } finally {
      setDeleting(false);
    }
  }

  async function populateSampleData() {
    setPopulating(true);
    try {
      const result = await application.samples.populate.execute();
      invalidateTransactionReferenceData();
      Alert.alert(
        result.populated
          ? t('settings.sampleAdded')
          : t('settings.sampleExists'),
        result.populated
          ? t('settings.sampleAddedDescription')
          : t('settings.sampleExistsDescription'),
        [
          { text: t('common.close'), style: 'cancel' },
          {
            text: t('settings.viewBudget'),
            onPress: () => router.replace('/budget'),
          },
        ],
      );
    } catch (cause) {
      Alert.alert(t('settings.sampleError'), domainErrorMessage(cause, t));
    } finally {
      setPopulating(false);
    }
  }

  async function setLockEnabled(enabled: boolean) {
    try {
      if (!enabled) {
        await updatePreferences({ lockEnabled: false });
        return;
      }

      const enrolledLevel = await LocalAuthentication.getEnrolledLevelAsync();
      if (enrolledLevel === LocalAuthentication.SecurityLevel.NONE) {
        Alert.alert(
          t('settings.lockUnavailable'),
          t('settings.lockUnavailableBody'),
        );
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('settings.lockPrompt'),
        promptDescription: t('settings.lockDescription'),
        fallbackLabel: t('settings.unlock'),
        disableDeviceFallback: false,
      });
      if (result.success) {
        markSessionUnlocked();
        await updatePreferences({ lockEnabled: true });
      }
    } catch {
      Alert.alert(
        t('settings.lockUnavailable'),
        t('settings.lockUnavailableBody'),
      );
    }
  }

  async function setTheme(themePreference: ThemePreference) {
    try {
      await updatePreferences({ theme: themePreference });
    } catch {
      Alert.alert(t('settings.saveError'));
    }
  }

  const numberFormatLabel =
    budgetDraft.numberFormat === 'system'
      ? t('settings.systemFormat')
      : budgetDraft.numberFormat === 'decimal-comma'
        ? t('settings.decimalComma')
        : t('settings.decimalPoint');
  const placementLabel =
    budgetDraft.currencyPlacement === 'system'
      ? t('settings.systemFormat')
      : budgetDraft.currencyPlacement === 'before'
        ? t('settings.placementBefore')
        : t('settings.placementAfter');
  const previewPreferences = { ...preferences, ...budgetDraft };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardResponsiveScreen>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>{t('settings.budgetSection')}</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('settings.budgetName')}</Text>
              <TextInput
                onChangeText={(budgetName) =>
                  setBudgetDraft((current) => ({ ...current, budgetName }))
                }
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
                value={budgetDraft.budgetName}
              />
            </View>
            <SettingsRow
              label={t('settings.currency')}
              onPress={() => setSelector('currency')}
              value={budgetDraft.currency}
            />
            <SettingsRow
              label={t('settings.numberFormat')}
              onPress={() => setSelector('number')}
              value={numberFormatLabel}
            />
            <SettingsRow
              label={t('settings.currencyPlacement')}
              onPress={() => setSelector('placement')}
              value={placementLabel}
            />
            <SettingsRow
              label={t('settings.dateFormat')}
              onPress={() => setSelector('date')}
              value={
                budgetDraft.dateFormat === 'system'
                  ? t('settings.systemFormat')
                  : budgetDraft.dateFormat.toUpperCase()
              }
            />
            <View style={styles.preview}>
              <Text style={styles.previewText}>
                {formatMoney(Money.fromCents(123_456), previewPreferences)}
              </Text>
              <Text style={styles.previewText}>
                {formatDate('2026-08-18', language, previewPreferences)}
              </Text>
            </View>
            <View style={styles.buttonRow}>
              <Pressable
                disabled={deleting}
                onPress={requestDeletePlan}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteText}>
                  {t('settings.deletePlan')}
                </Text>
              </Pressable>
              <Pressable
                disabled={saving || !budgetDraft.budgetName.trim()}
                onPress={() => void saveBudgetSettings()}
                style={[styles.saveButton, saving && styles.disabled]}
              >
                <Text style={styles.saveText}>
                  {saving ? t('form.saving') : t('common.save')}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.sectionLabel}>{t('settings.appSection')}</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('settings.displayOptions')}</Text>
            <Text style={styles.fieldLabel}>{t('settings.theme')}</Text>
            <View style={styles.themeOptions}>
              {(
                [
                  ['light', t('settings.themeLight')],
                  ['dark', t('settings.themeDark')],
                  ['system', t('settings.themeSystem')],
                ] as const
              ).map(([value, label]) => (
                <ThemeOption
                  key={value}
                  label={label}
                  selected={preferences.theme === value}
                  onPress={() => void setTheme(value)}
                />
              ))}
            </View>
            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.cardTitle}>{t('settings.lock')}</Text>
                <Text style={styles.help}>{t('settings.lockDescription')}</Text>
              </View>
              <Switch
                onValueChange={(enabled) => void setLockEnabled(enabled)}
                value={preferences.lockEnabled}
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>{t('settings.dataSection')}</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t('settings.dataPortability')}
            </Text>
            <Text style={styles.help}>
              {t('settings.portabilityDescription')}
            </Text>
            <SettingsRow
              label={exporting ? t('settings.exporting') : t('settings.export')}
              onPress={requestExport}
              value={t('settings.exportFormat')}
            />
            <SettingsRow
              label={t('settings.backup')}
              onPress={() => setDataAction('backup')}
              value={t('settings.encrypted')}
            />
            <SettingsRow
              label={t('settings.restore')}
              onPress={requestRestore}
              value=".jarling"
            />
          </View>

          {__DEV__ ? (
            <>
              <Text style={styles.sectionLabel}>
                {t('settings.development')}
              </Text>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('settings.sampleData')}</Text>
                <Text style={styles.help}>
                  {t('settings.sampleDescription')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={populating}
                  onPress={() => void populateSampleData()}
                  style={[styles.populateButton, populating && styles.disabled]}
                >
                  <Text style={styles.populateButtonText}>
                    {populating
                      ? t('settings.populating')
                      : t('settings.populate')}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardResponsiveScreen>

      {selector === 'currency' ? (
        <SelectionModal
          onDismiss={() => setSelector(null)}
          onSelect={(currency: CurrencyCode) =>
            setBudgetDraft((current) => ({ ...current, currency }))
          }
          options={CURRENCIES.map((value) => ({ value, label: value }))}
          selectedValue={budgetDraft.currency}
          title={t('settings.currency')}
        />
      ) : null}
      {selector === 'number' ? (
        <SelectionModal
          onDismiss={() => setSelector(null)}
          onSelect={(numberFormat: NumberFormatPreference) =>
            setBudgetDraft((current) => ({ ...current, numberFormat }))
          }
          options={NUMBER_FORMATS.map((value) => ({
            value,
            label:
              value === 'system'
                ? t('settings.systemFormat')
                : value === 'decimal-comma'
                  ? t('settings.decimalComma')
                  : t('settings.decimalPoint'),
          }))}
          selectedValue={budgetDraft.numberFormat}
          title={t('settings.numberFormat')}
        />
      ) : null}
      {selector === 'placement' ? (
        <SelectionModal
          onDismiss={() => setSelector(null)}
          onSelect={(currencyPlacement: CurrencyPlacement) =>
            setBudgetDraft((current) => ({ ...current, currencyPlacement }))
          }
          options={CURRENCY_PLACEMENTS.map((value) => ({
            value,
            label:
              value === 'system'
                ? t('settings.systemFormat')
                : value === 'before'
                  ? t('settings.placementBefore')
                  : t('settings.placementAfter'),
          }))}
          selectedValue={budgetDraft.currencyPlacement}
          title={t('settings.currencyPlacement')}
        />
      ) : null}
      {selector === 'date' ? (
        <SelectionModal
          onDismiss={() => setSelector(null)}
          onSelect={(dateFormat: DateFormatPreference) =>
            setBudgetDraft((current) => ({ ...current, dateFormat }))
          }
          options={DATE_FORMATS.map((value) => ({
            value,
            label:
              value === 'system'
                ? t('settings.systemFormat')
                : value.toUpperCase(),
          }))}
          selectedValue={budgetDraft.dateFormat}
          title={t('settings.dateFormat')}
        />
      ) : null}
      {dataAction ? (
        <PasswordInputModal
          confirm={dataAction === 'backup'}
          onDismiss={() => setDataAction(null)}
          onSubmit={dataAction === 'backup' ? createBackup : restoreBackup}
          submitLabel={
            dataAction === 'backup'
              ? t('settings.createBackup')
              : t('settings.restore')
          }
          title={
            dataAction === 'backup'
              ? t('settings.backup')
              : t('settings.restore')
          }
        />
      ) : null}
    </SafeAreaView>
  );
}

function SettingsRow({
  label,
  value,
  onPress,
}: Readonly<{ label: string; value: string; onPress: () => void }>) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onPress} style={styles.settingsRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValueWrap}>
        <Text numberOfLines={1} style={styles.rowValue}>
          {value}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

function ThemeOption({
  label,
  selected,
  onPress,
}: Readonly<{ label: string; selected: boolean; onPress: () => void }>) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onPress} style={styles.themeOption}>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <Text style={styles.themeLabel}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      minHeight: 68,
      paddingHorizontal: 14,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backButtonText: {
      color: theme.colors.primary,
      fontSize: 36,
      lineHeight: 38,
    },
    title: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
    headerSpacer: { width: 44 },
    content: {
      width: '100%',
      maxWidth: 720,
      padding: 20,
      paddingBottom: 48,
      alignSelf: 'center',
      gap: 10,
    },
    sectionLabel: {
      marginTop: 12,
      marginLeft: 4,
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.1,
    },
    card: {
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 20,
      borderWidth: 1,
      gap: 14,
    },
    cardTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
    field: { gap: 7 },
    fieldLabel: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    input: {
      minHeight: 50,
      paddingHorizontal: 14,
      color: theme.colors.text,
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      fontSize: 16,
    },
    settingsRow: {
      minHeight: 54,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    rowLabel: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    rowValueWrap: {
      maxWidth: '55%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rowValue: { color: theme.colors.textMuted, fontSize: 14 },
    chevron: { color: theme.colors.primary, fontSize: 25 },
    preview: {
      padding: 13,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    previewText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    buttonRow: { flexDirection: 'row', gap: 10 },
    deleteButton: {
      flex: 1,
      minHeight: 50,
      backgroundColor: theme.colors.negativeMuted,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteText: {
      color: theme.colors.negative,
      fontSize: 14,
      fontWeight: '800',
    },
    saveButton: {
      flex: 1,
      minHeight: 50,
      backgroundColor: theme.colors.primary,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveText: {
      color: theme.colors.onPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    themeOptions: { gap: 3 },
    themeOption: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    themeLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
    radio: {
      width: 21,
      height: 21,
      borderColor: theme.colors.textMuted,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: { borderColor: theme.colors.primary },
    radioDot: {
      width: 11,
      height: 11,
      backgroundColor: theme.colors.primary,
      borderRadius: 6,
    },
    switchRow: {
      minHeight: 70,
      paddingTop: 12,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    switchCopy: { flex: 1 },
    help: {
      marginTop: 4,
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    populateButton: {
      minHeight: 50,
      marginTop: 4,
      backgroundColor: theme.colors.primary,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    populateButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    disabled: { opacity: 0.5 },
  });
