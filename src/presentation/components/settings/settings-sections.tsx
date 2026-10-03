import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import type { ThemePreference } from '@/presentation/preferences/preferences';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

export function SettingsRow({
  divided = true,
  label,
  value,
  onPress,
}: Readonly<{
  divided?: boolean;
  label: string;
  value: string;
  onPress: () => void;
}>) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.settingsRow, !divided && styles.settingsRowUndivided]}
    >
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

export function DisplayOptionsSection({
  lockEnabled,
  theme,
  onChangeLock,
  onChangeTheme,
}: Readonly<{
  lockEnabled: boolean;
  theme: ThemePreference;
  onChangeLock: (enabled: boolean) => void;
  onChangeTheme: (theme: ThemePreference) => void;
}>) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const options: readonly Readonly<{
    value: ThemePreference;
    label: string;
  }>[] = [
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
    { value: 'system', label: t('settings.themeSystem') },
  ];

  return (
    <>
      <Text style={styles.sectionLabel}>{t('settings.appSection')}</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('settings.displayOptions')}</Text>
        <Text style={styles.fieldLabel}>{t('settings.theme')}</Text>
        <View style={styles.themeOptions}>
          {options.map((option) => (
            <ThemeOption
              key={option.value}
              label={option.label}
              onPress={() => onChangeTheme(option.value)}
              selected={theme === option.value}
            />
          ))}
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={styles.cardTitle}>{t('settings.lock')}</Text>
            <Text style={styles.help}>{t('settings.lockDescription')}</Text>
          </View>
          <Switch onValueChange={onChangeLock} value={lockEnabled} />
        </View>
      </View>
    </>
  );
}

export function DataPortabilitySection({
  exporting,
  onBackup,
  onExport,
  onRestore,
}: Readonly<{
  exporting: boolean;
  onBackup: () => void;
  onExport: () => void;
  onRestore: () => void;
}>) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  return (
    <>
      <Text style={styles.sectionLabel}>{t('settings.dataSection')}</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('settings.dataPortability')}</Text>
        <Text style={styles.help}>{t('settings.portabilityDescription')}</Text>
        <SettingsRow
          label={exporting ? t('settings.exporting') : t('settings.export')}
          onPress={onExport}
          value={t('settings.exportFormat')}
        />
        <SettingsRow
          label={t('settings.backup')}
          onPress={onBackup}
          value={t('settings.encrypted')}
        />
        <SettingsRow
          label={t('settings.restore')}
          onPress={onRestore}
          value=".jarling / .json"
        />
      </View>
    </>
  );
}

export function DevelopmentSection({
  populating,
  onPopulate,
}: Readonly<{ populating: boolean; onPopulate: () => void }>) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  return (
    <>
      <Text style={styles.sectionLabel}>{t('settings.development')}</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('settings.sampleData')}</Text>
        <Text style={styles.help}>{t('settings.sampleDescription')}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={populating}
          onPress={onPopulate}
          style={[styles.populateButton, populating && styles.disabled]}
        >
          <Text style={styles.populateButtonText}>
            {populating ? t('settings.populating') : t('settings.populate')}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

export function AboutSection({
  appName,
  appVersion,
  onOpen,
}: Readonly<{ appName: string; appVersion: string; onOpen: () => void }>) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  return (
    <>
      <Text style={styles.sectionLabel}>{t('settings.aboutSection')}</Text>
      <View style={[styles.card, styles.aboutCard]}>
        <SettingsRow
          divided={false}
          label={t('settings.about')}
          onPress={onOpen}
          value={t('settings.projectRepository')}
        />
      </View>
      <View style={styles.appIdentity}>
        <Text style={styles.appName}>{appName}</Text>
        <Text style={styles.appVersion}>v{appVersion}</Text>
      </View>
    </>
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
    aboutCard: { paddingVertical: 10 },
    appIdentity: {
      paddingTop: 10,
      paddingBottom: 18,
      alignItems: 'center',
      gap: 3,
    },
    appName: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },
    appVersion: { color: theme.colors.textMuted, fontSize: 12 },
    cardTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
    fieldLabel: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
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
    settingsRowUndivided: { borderTopWidth: 0 },
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
    themeOptions: { gap: 3 },
    themeOption: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
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
    themeLabel: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '600',
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
