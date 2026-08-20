import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CategoryDetails } from '@/application/use-cases/categories/get-category-details';
import type { SetCategoryTargetInput } from '@/application/use-cases/targets/set-category-target';
import { CATEGORY_NOTES_MAX_LENGTH } from '@/domain/entities/category';
import { Money } from '@/domain/value-objects/money';
import { NameInputModal } from '@/presentation/components/common/name-input-modal';
import { TargetEditorModal } from '@/presentation/components/targets/target-editor-modal';
import { useApplication } from '@/presentation/contexts/application-context';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { categoryDisplayName } from '@/presentation/utils/category-name';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';
import { formatMoney } from '@/presentation/utils/money';
import { targetDetailCopy } from '@/presentation/utils/target';

const PROGRESS_SEGMENTS = 40;

function currentMonth(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function CategoryDetailsScreen() {
  const parameters = useLocalSearchParams<{ id?: string; month?: string }>();
  const router = useRouter();
  const application = useApplication();
  const { language, t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const categoryId = parameters.id ?? '';
  const month = /^\d{4}-\d{2}$/.test(parameters.month ?? '')
    ? parameters.month!
    : currentMonth();
  const [details, setDetails] = useState<CategoryDetails | null>(null);
  const [notes, setNotes] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (synchronizeNotes = false) => {
      if (!categoryId) {
        setError(t('errors.categoryNotFound'));
        setLoading(false);
        return;
      }
      setError(null);
      try {
        const result = await application.categories.getDetails.execute(
          categoryId,
          month,
        );
        setDetails(result);
        if (synchronizeNotes) setNotes(result.values.category.notes ?? '');
      } catch (cause) {
        setError(domainErrorMessage(cause, t));
      } finally {
        setLoading(false);
      }
    },
    [application, categoryId, month, t],
  );

  useEffect(() => {
    const handle = setTimeout(() => void load(true), 0);
    return () => clearTimeout(handle);
  }, [load]);

  const displayName = details
    ? categoryDisplayName(details.values.category, t)
    : '';
  const targetCopy = details?.target
    ? targetDetailCopy(details.target, language)
    : undefined;

  async function rename(name: string) {
    try {
      await application.categories.rename.execute(categoryId, name);
      await load();
    } catch (cause) {
      throw new Error(domainErrorMessage(cause, t), { cause });
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    setNotesSaved(false);
    setError(null);
    try {
      await application.categories.updateNotes.execute(categoryId, notes);
      await load(true);
      setNotesSaved(true);
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
    } finally {
      setSavingNotes(false);
    }
  }

  async function saveTarget(input: SetCategoryTargetInput) {
    try {
      await application.targets.set.execute(input);
      await load();
    } catch (cause) {
      throw new Error(domainErrorMessage(cause, t), { cause });
    }
  }

  async function deleteTarget(id: string) {
    try {
      await application.targets.delete.execute(id);
      await load();
    } catch (cause) {
      throw new Error(domainErrorMessage(cause, t), { cause });
    }
  }

  async function assignRecommended() {
    if (!details?.progress || details.progress.recommended.cents <= 0) return;
    setAssigning(true);
    setError(null);
    try {
      await application.budget.assign.execute({
        categoryId,
        month,
        amountCents:
          details.values.assigned.cents + details.progress.recommended.cents,
      });
      await load();
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
    } finally {
      setAssigning(false);
    }
  }

  async function toggleHidden() {
    if (!details) return;
    setError(null);
    try {
      await application.categories.setHidden.execute(
        categoryId,
        !details.values.category.hidden,
      );
      await load();
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
    }
  }

  if (loading && !details) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader
          onBack={() => router.back()}
          title={t('categoryDetails.title')}
        />
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!details) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader
          onBack={() => router.back()}
          title={t('categoryDetails.title')}
        />
        <View style={styles.loading}>
          <Text style={styles.errorText}>
            {error ?? t('errors.categoryNotFound')}
          </Text>
          <Pressable
            onPress={() => void load(true)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { values, target, progress } = details;
  const needsAssignment = (progress?.recommended.cents ?? 0) > 0;
  const toGo = progress
    ? Money.fromCents(
        Math.max(0, progress.goal.cents - Math.max(0, progress.funded.cents)),
      )
    : Money.zero();

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader
        onBack={() => router.back()}
        title={t('categoryDetails.title')}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => setRenaming(true)} style={styles.nameCard}>
            <View style={styles.nameCopy}>
              <Text style={styles.eyebrow}>{t('budget.categoryName')}</Text>
              <Text style={styles.categoryName}>{displayName}</Text>
            </View>
            <MaterialCommunityIcons
              color={theme.colors.primary}
              name="pencil-outline"
              size={23}
            />
          </Pressable>

          <View style={styles.balanceCard}>
            <Text style={styles.eyebrow}>{t('categoryDetails.balance')}</Text>
            <Text
              style={[
                styles.balance,
                values.available.cents < 0 && styles.balanceNegative,
              ]}
            >
              {formatMoney(values.available)}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('categoryDetails.target')}
            </Text>
            {!target || !progress || !targetCopy ? (
              <View style={styles.card}>
                <Text style={styles.question}>
                  {t('categoryDetails.question', { name: displayName })}
                </Text>
                <Text style={styles.bodyText}>
                  {t('categoryDetails.targetIntro')}
                </Text>
                <Pressable
                  onPress={() => setEditingTarget(true)}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>
                    {t('categoryDetails.createTarget')}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.targetStack}>
                <View style={styles.progressCard}>
                  <SegmentedProgressCircle
                    progress={progress.progress}
                    tone={needsAssignment ? 'warning' : 'positive'}
                  />
                  <View style={styles.progressCopy}>
                    <Text style={styles.progressMessage}>
                      {needsAssignment
                        ? t('categoryDetails.assignMore', {
                            amount: formatMoney(progress.recommended),
                          })
                        : t('categoryDetails.onTrack')}
                    </Text>
                    {needsAssignment ? (
                      <Pressable
                        disabled={assigning}
                        onPress={() => void assignRecommended()}
                        style={styles.assignButton}
                      >
                        <Text style={styles.assignButtonText}>
                          {assigning
                            ? t('transactions.saving')
                            : t('categoryDetails.assign')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                <View style={styles.card}>
                  <Text style={styles.targetDescription}>
                    {targetCopy.title}
                  </Text>
                  <Text style={styles.targetSubtitle}>
                    {targetCopy.subtitle}
                  </Text>
                </View>

                <View style={styles.statsCard}>
                  <TargetStat
                    label={t('categoryDetails.totalToAssignBy', {
                      date: targetCopy.due,
                    })}
                    value={formatMoney(progress.goal)}
                  />
                  <TargetStat
                    label={t('categoryDetails.assignedSoFar')}
                    value={formatMoney(
                      Money.fromCents(Math.max(0, progress.funded.cents)),
                    )}
                  />
                  <TargetStat
                    label={t('categoryDetails.toGo')}
                    value={formatMoney(toGo)}
                  />
                </View>

                <Pressable
                  onPress={() => setEditingTarget(true)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>
                    {t('categoryDetails.editTarget')}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('categoryDetails.notes')}
            </Text>
            <View style={styles.card}>
              <TextInput
                maxLength={CATEGORY_NOTES_MAX_LENGTH}
                multiline
                onChangeText={(value) => {
                  setNotes(value);
                  setNotesSaved(false);
                }}
                placeholder={t('categoryDetails.notesPlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                style={styles.notesInput}
                textAlignVertical="top"
                value={notes}
              />
              <View style={styles.notesFooter}>
                <Text style={styles.characterCount}>
                  {notes.length}/{CATEGORY_NOTES_MAX_LENGTH}
                </Text>
                <Pressable
                  disabled={savingNotes}
                  onPress={() => void saveNotes()}
                  style={styles.notesButton}
                >
                  <Text style={styles.notesButtonText}>
                    {savingNotes
                      ? t('form.saving')
                      : t('categoryDetails.saveNotes')}
                  </Text>
                </Pressable>
              </View>
              {notesSaved ? (
                <Text accessibilityLiveRegion="polite" style={styles.success}>
                  {t('categoryDetails.notesSaved')}
                </Text>
              ) : null}
            </View>
          </View>

          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={() => void toggleHidden()}
            style={styles.hideButton}
          >
            <Text style={styles.hideButtonText}>
              {values.category.hidden ? t('budget.unhide') : t('budget.hide')}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {renaming ? (
        <NameInputModal
          initialValue={displayName}
          label={t('budget.categoryName')}
          onDismiss={() => setRenaming(false)}
          onSubmit={rename}
          placement="center"
          submitLabel={t('common.save')}
          title={t('budget.renameCategory')}
        />
      ) : null}

      {editingTarget ? (
        <TargetEditorModal
          categoryId={categoryId}
          categoryName={displayName}
          onDelete={deleteTarget}
          onDismiss={() => setEditingTarget(false)}
          onSave={saveTarget}
          target={target}
        />
      ) : null}
    </SafeAreaView>
  );
}

function ScreenHeader({
  title,
  onBack,
}: Readonly<{ title: string; onBack: () => void }>) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel={t('common.back')}
        hitSlop={10}
        onPress={onBack}
        style={styles.back}
      >
        <MaterialCommunityIcons
          color={theme.colors.text}
          name="arrow-left"
          size={25}
        />
      </Pressable>
      <Text numberOfLines={1} style={styles.headerTitle}>
        {title}
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function SegmentedProgressCircle({
  progress,
  tone,
}: Readonly<{ progress: number; tone: 'warning' | 'positive' }>) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const percentage = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const activeSegments = Math.round((percentage / 100) * PROGRESS_SEGMENTS);
  const activeColor =
    tone === 'warning' ? theme.colors.warning : theme.colors.positive;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percentage }}
      style={styles.progressCircle}
    >
      {Array.from({ length: PROGRESS_SEGMENTS }, (_, index) => (
        <View
          key={index}
          style={[
            styles.segmentRotation,
            {
              transform: [
                { rotate: `${index * (360 / PROGRESS_SEGMENTS)}deg` },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.circleSegment,
              {
                backgroundColor:
                  index < activeSegments ? activeColor : theme.colors.track,
              },
            ]}
          />
        </View>
      ))}
      <Text style={[styles.percentage, { color: activeColor }]}>
        {percentage}%
      </Text>
    </View>
  );
}

function TargetStat({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    screen: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      minHeight: 64,
      paddingHorizontal: 16,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
    },
    back: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 21,
      fontWeight: '800',
      textAlign: 'center',
    },
    headerSpacer: { width: 44 },
    loading: {
      flex: 1,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    content: {
      width: '100%',
      maxWidth: 720,
      padding: 20,
      paddingBottom: 48,
      alignSelf: 'center',
      gap: 20,
    },
    nameCard: {
      minHeight: 86,
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 20,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    nameCopy: { flex: 1 },
    eyebrow: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    categoryName: {
      marginTop: 5,
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: '800',
    },
    balanceCard: {
      padding: 20,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 22,
      alignItems: 'center',
      gap: 8,
    },
    balance: {
      color: theme.colors.positive,
      fontSize: 38,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    balanceNegative: { color: theme.colors.negative },
    section: { gap: 10 },
    sectionTitle: {
      paddingHorizontal: 4,
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    card: {
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 20,
      borderWidth: 1,
    },
    question: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '800',
      lineHeight: 27,
    },
    bodyText: {
      marginTop: 8,
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
    },
    primaryButton: {
      minHeight: 52,
      paddingHorizontal: 20,
      marginTop: 18,
      backgroundColor: theme.colors.primary,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    targetStack: { gap: 12 },
    progressCard: {
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 22,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
    },
    progressCircle: {
      width: 118,
      height: 118,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentRotation: {
      position: 'absolute',
      width: 118,
      height: 118,
      alignItems: 'center',
    },
    circleSegment: { width: 5, height: 11, borderRadius: 3 },
    percentage: {
      fontSize: 23,
      fontVariant: ['tabular-nums'],
      fontWeight: '900',
    },
    progressCopy: { flex: 1 },
    progressMessage: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 22,
    },
    assignButton: {
      minHeight: 44,
      paddingHorizontal: 18,
      marginTop: 12,
      backgroundColor: theme.colors.warningMuted,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    assignButtonText: {
      color: theme.colors.warning,
      fontSize: 14,
      fontWeight: '900',
    },
    targetDescription: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '800',
      lineHeight: 25,
    },
    targetSubtitle: {
      marginTop: 5,
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    statsCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 20,
      borderWidth: 1,
      overflow: 'hidden',
    },
    statRow: {
      minHeight: 60,
      paddingHorizontal: 18,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    statLabel: { flex: 1, color: theme.colors.textSecondary, fontSize: 13 },
    statValue: {
      color: theme.colors.text,
      fontSize: 15,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    secondaryButton: {
      minHeight: 52,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      color: theme.colors.primary,
      fontSize: 15,
      fontWeight: '800',
    },
    notesInput: {
      minHeight: 150,
      padding: 14,
      color: theme.colors.text,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 14,
      fontSize: 15,
      lineHeight: 21,
    },
    notesFooter: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    characterCount: { color: theme.colors.textMuted, fontSize: 11 },
    notesButton: {
      minHeight: 44,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notesButtonText: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: '800',
    },
    success: {
      marginTop: 10,
      color: theme.colors.positive,
      fontSize: 12,
      fontWeight: '700',
    },
    errorText: {
      padding: 14,
      color: theme.colors.negative,
      backgroundColor: theme.colors.negativeMuted,
      borderRadius: 14,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },
    hideButton: {
      minHeight: 50,
      marginTop: 4,
      borderColor: theme.colors.border,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hideButtonText: {
      color: theme.colors.negative,
      fontSize: 14,
      fontWeight: '800',
    },
  });
