import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CategoryDetails } from '@/application/use-cases/categories/get-category-details';
import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type { Category } from '@/domain/entities/category';
import type { BudgetMonthValues } from '@/domain/services/calculate-budget-month';
import { planCategoryAssignment } from '@/domain/services/plan-category-assignment';
import { InsufficientReadyToAssignError } from '@/domain/errors/insufficient-ready-to-assign-error';
import { Money } from '@/domain/value-objects/money';
import { NameInputModal } from '@/presentation/components/common/name-input-modal';
import { FullScreenSelectionScreen } from '@/presentation/components/common/full-screen-selection-screen';
import { KeyboardResponsiveScreen } from '@/presentation/components/common/keyboard-responsive-screen';
import { SelectCategoryScreen } from '@/presentation/components/categories/select-category-screen';
import { CategoryBalanceBreakdown } from '@/presentation/components/categories/category-balance-breakdown';
import { CategoryNotesSection } from '@/presentation/components/categories/category-notes-section';
import { invalidateTransactionReferenceData } from '@/presentation/cache/transaction-reference-data';
import { useApplication } from '@/presentation/contexts/application-context';
import { useTranslation } from '@/presentation/localization/localization-provider';
import { routes } from '@/presentation/navigation/routes';
import {
  routeBudgetMonth,
  routeId,
  type RouteParameter,
} from '@/presentation/navigation/route-params';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import {
  categoryDisplayName,
  groupDisplayName,
} from '@/presentation/utils/category-name';
import { indexBudgetValuesByCategoryId } from '@/presentation/utils/category-budget-values';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';
import { formatMoney } from '@/presentation/utils/money';
import { targetDetailCopy } from '@/presentation/utils/target';
import { targetSnoozeAction } from '@/presentation/utils/target-snooze-action';

const PROGRESS_SEGMENTS = 40;

export function CategoryDetailsScreen() {
  const parameters = useLocalSearchParams<{
    id?: RouteParameter;
    month?: RouteParameter;
  }>();
  const router = useRouter();
  const application = useApplication();
  const { language, t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const categoryId = routeId(parameters.id);
  const month = routeBudgetMonth(parameters.month);
  const [details, setDetails] = useState<CategoryDetails | null>(null);
  const [notes, setNotes] = useState('');
  const [groups, setGroups] = useState<readonly CategoryGroupSummary[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [selectingGroup, setSelectingGroup] = useState(false);
  const [movingGroup, setMovingGroup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [togglingSnooze, setTogglingSnooze] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletionGroups, setDeletionGroups] = useState<
    readonly CategoryGroupSummary[]
  >([]);
  const [deletionBudget, setDeletionBudget] =
    useState<BudgetMonthValues | null>(null);
  const [deletionFlow, setDeletionFlow] = useState<'select-destination' | null>(
    null,
  );
  const [notesSaved, setNotesSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const notesFocused = useRef(false);
  const deletionValuesByCategoryId = useMemo(
    () => indexBudgetValuesByCategoryId(deletionBudget),
    [deletionBudget],
  );

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      if (notesFocused.current) {
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    });
    return () => subscription.remove();
  }, []);

  const load = useCallback(
    async (synchronizeNotes = false) => {
      if (!categoryId) {
        setError(t('errors.categoryNotFound'));
        setLoading(false);
        return;
      }
      setError(null);
      try {
        const [result, categoryGroups] = await Promise.all([
          application.categories.getDetails.execute(categoryId, month),
          application.categories.getGroups.execute(),
        ]);
        setDetails(result);
        setGroups(categoryGroups);
        if (synchronizeNotes) setNotes(result.values.category.notes ?? '');
      } catch (cause) {
        setError(domainErrorMessage(cause, t));
      } finally {
        setLoading(false);
      }
    },
    [application, categoryId, month, t],
  );

  useFocusEffect(
    useCallback(() => {
      const handle = setTimeout(() => void load(true), 0);
      return () => clearTimeout(handle);
    }, [load]),
  );

  const displayName = details
    ? categoryDisplayName(details.values.category, t)
    : '';
  const currentGroup = details
    ? groups.find(({ group }) => group.id === details.values.category.groupId)
        ?.group
    : undefined;
  const targetCopy = details?.target
    ? targetDetailCopy(details.target, language)
    : undefined;

  async function rename(name: string) {
    try {
      await application.categories.rename.execute(categoryId, name);
      invalidateTransactionReferenceData();
      await load();
    } catch (cause) {
      throw new Error(domainErrorMessage(cause, t), { cause });
    }
  }

  async function moveToGroup(groupId: string) {
    if (!details || groupId === details.values.category.groupId) return;
    setMovingGroup(true);
    setError(null);
    try {
      await application.categories.move.execute(categoryId, groupId);
      invalidateTransactionReferenceData();
      await load();
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
    } finally {
      setMovingGroup(false);
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

  async function assignRecommended() {
    if (!details || details.funding.requiredAssignment.cents <= 0) return;
    const required = details.funding.requiredAssignment;
    const assignmentPlan = planCategoryAssignment(
      required,
      details.assignableNow,
    );
    if (assignmentPlan.kind === 'move-money') {
      router.push(
        routes.moveBudget(month, categoryId, assignmentPlan.amountCents),
      );
      return;
    }
    if (assignmentPlan.kind === 'none') return;
    setAssigning(true);
    setError(null);
    try {
      await application.budget.assign.execute({
        categoryId,
        month,
        amountCents: details.values.assigned.cents + required.cents,
      });
      await load();
    } catch (cause) {
      if (cause instanceof InsufficientReadyToAssignError) {
        router.push(routes.moveBudget(month, categoryId, required.cents));
        return;
      }
      setError(domainErrorMessage(cause, t));
    } finally {
      setAssigning(false);
    }
  }

  async function toggleTargetSnooze() {
    if (!details?.funding.canToggleSnooze || togglingSnooze) return;
    setTogglingSnooze(true);
    setError(null);
    try {
      await application.targets.setSnooze.execute({
        categoryId,
        month,
        snoozed: !details.funding.targetSnoozed,
      });
      await load();
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
    } finally {
      setTogglingSnooze(false);
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
      invalidateTransactionReferenceData();
      await load();
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
    }
  }

  async function deleteCategory(
    replacementCategoryId?: string,
    navigateAfterDelete = true,
  ) {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await application.categories.delete.execute({
        categoryId,
        ...(replacementCategoryId ? { replacementCategoryId } : {}),
      });
      invalidateTransactionReferenceData();
      if (navigateAfterDelete) router.back();
    } catch (cause) {
      setDeleting(false);
      if (navigateAfterDelete) {
        setError(domainErrorMessage(cause, t));
        setDeletionFlow(null);
        return;
      }
      throw cause;
    }
  }

  async function requestDelete() {
    if (!details || deleting) return;
    setError(null);
    try {
      const impact =
        await application.categories.getDeletionImpact.execute(categoryId);
      const title = t('categoryDetails.deleteTitle', { name: displayName });

      if (impact.requiresReassignment) {
        const [groups, budget] = await Promise.all([
          application.categories.getGroups.execute(),
          application.budget.getMonth.execute(month),
        ]);
        setDeletionGroups(groups);
        setDeletionBudget(budget);
        Alert.alert(
          title,
          t('categoryDetails.deleteReassignBody', {
            count: impact.transactionCount,
            assigned: formatMoney(impact.assigned),
            available: formatMoney(impact.available),
          }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('categoryDetails.selectCategory'),
              onPress: () => setDeletionFlow('select-destination'),
            },
          ],
        );
        return;
      }

      Alert.alert(
        title,
        impact.hasMoney
          ? t('categoryDetails.deleteMoneyBody')
          : t('categoryDetails.deleteEmptyBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: impact.hasMoney
              ? t('common.confirm')
              : t('categoryDetails.deleteCategory'),
            style: 'destructive',
            onPress: () => void deleteCategory(),
          },
        ],
      );
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
    }
  }

  async function createReplacement(input: {
    groupId: string;
    name: string;
  }): Promise<Category> {
    setDeleting(true);
    setError(null);
    try {
      const category = await application.categories.createReplacement.execute({
        sourceCategoryId: categoryId,
        ...input,
      });
      invalidateTransactionReferenceData();
      return category;
    } catch (cause) {
      setDeleting(false);
      throw cause;
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

  const { values, target, progress, funding } = details;
  const snoozeAction = targetSnoozeAction(funding);
  const protectedCategory = Boolean(values.category.linkedAccountId);
  const needsAssignment = funding.requiredAssignment.cents > 0;
  const toGo = progress
    ? Money.fromCents(
        Math.max(
          0,
          progress.totalTarget.cents -
            Math.max(0, progress.fundedTowardTotal.cents),
        ),
      )
    : Money.zero();

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader
        onBack={() => router.back()}
        title={t('categoryDetails.title')}
      />
      <KeyboardResponsiveScreen>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ref={scrollRef}
        >
          <View style={styles.identityCard}>
            <Pressable
              disabled={protectedCategory}
              onPress={() => setRenaming(true)}
              style={styles.identityRow}
            >
              <View style={styles.identityCopy}>
                <Text style={styles.eyebrow}>{t('budget.categoryName')}</Text>
                <Text numberOfLines={1} style={styles.identityValue}>
                  {displayName}
                </Text>
              </View>
              {!protectedCategory ? (
                <MaterialCommunityIcons
                  color={theme.colors.primary}
                  name="pencil-outline"
                  size={21}
                />
              ) : null}
            </Pressable>
            <Pressable
              disabled={protectedCategory || movingGroup}
              onPress={() => setSelectingGroup(true)}
              style={[styles.identityRow, styles.identityRowBorder]}
            >
              <View style={styles.identityCopy}>
                <Text style={styles.eyebrow}>{t('budget.categoryGroup')}</Text>
                <Text numberOfLines={1} style={styles.identityValue}>
                  {currentGroup
                    ? groupDisplayName(currentGroup, t)
                    : t('common.choose')}
                </Text>
              </View>
              {!protectedCategory ? (
                movingGroup ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : (
                  <MaterialCommunityIcons
                    color={theme.colors.primary}
                    name="chevron-right"
                    size={23}
                  />
                )
              ) : null}
            </Pressable>
          </View>

          <CategoryBalanceBreakdown month={month} values={values} />

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
                  onPress={() =>
                    router.push(routes.categoryTarget(categoryId, month))
                  }
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
                    progress={
                      funding.targetSnoozed &&
                      funding.assignmentReason !== 'overspending'
                        ? 1
                        : progress.totalProgress
                    }
                    tone={
                      funding.assignmentReason === 'overspending'
                        ? 'negative'
                        : needsAssignment && !funding.targetSnoozed
                          ? 'warning'
                          : 'positive'
                    }
                  />
                  <View style={styles.progressCopy}>
                    <Text style={styles.progressMessage}>
                      {needsAssignment &&
                      funding.assignmentReason === 'overspending'
                        ? t('budget.assignToCoverOverspending', {
                            amount: formatMoney(funding.requiredAssignment),
                          })
                        : funding.targetSnoozed
                          ? t('targets.snoozedThisMonth')
                          : needsAssignment
                            ? t('categoryDetails.assignMore', {
                                amount: formatMoney(funding.requiredAssignment),
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
                    value={formatMoney(progress.totalTarget)}
                  />
                  <TargetStat
                    label={t('categoryDetails.assignedSoFar')}
                    value={formatMoney(
                      Money.fromCents(
                        Math.max(0, progress.fundedTowardTotal.cents),
                      ),
                    )}
                  />
                  <TargetStat
                    label={t('categoryDetails.toGo')}
                    value={formatMoney(toGo)}
                  />
                </View>

                <Pressable
                  onPress={() =>
                    router.push(routes.categoryTarget(categoryId, month))
                  }
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>
                    {t('categoryDetails.editTarget')}
                  </Text>
                </Pressable>

                {snoozeAction ? (
                  <Pressable
                    accessibilityLabel={t(
                      snoozeAction === 'cancel'
                        ? 'targets.unsnoozeThisMonth'
                        : 'targets.snoozeThisMonth',
                    )}
                    disabled={togglingSnooze}
                    onPress={() => void toggleTargetSnooze()}
                    style={styles.snoozeButton}
                  >
                    <MaterialCommunityIcons
                      color={theme.colors.primary}
                      name={snoozeAction === 'cancel' ? 'sleep-off' : 'sleep'}
                      size={23}
                    />
                    <Text style={styles.snoozeButtonText}>
                      {t(
                        snoozeAction === 'cancel'
                          ? 'targets.unsnoozeThisMonth'
                          : 'targets.snoozeThisMonth',
                      )}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>

          <CategoryNotesSection
            notes={notes}
            onBlur={() => {
              notesFocused.current = false;
            }}
            onChange={(value) => {
              setNotes(value);
              setNotesSaved(false);
            }}
            onFocus={() => {
              notesFocused.current = true;
              requestAnimationFrame(() =>
                scrollRef.current?.scrollToEnd({ animated: true }),
              );
            }}
            onSave={() => void saveNotes()}
            saved={notesSaved}
            saving={savingNotes}
          />

          {error ? (
            <View style={styles.errorCard}>
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}

          {!protectedCategory ? (
            <View style={styles.categoryActions}>
              <Pressable
                disabled={deleting}
                onPress={() => void toggleHidden()}
                style={styles.hideButton}
              >
                <Text style={styles.hideButtonText}>
                  {values.category.hidden
                    ? t('budget.unhide')
                    : t('budget.hide')}
                </Text>
              </Pressable>
              <Pressable
                disabled={deleting}
                onPress={() => void requestDelete()}
                style={styles.deleteButton}
              >
                {deleting ? (
                  <ActivityIndicator color={theme.colors.negative} />
                ) : (
                  <Text style={styles.deleteButtonText}>
                    {t('categoryDetails.deleteCategory')}
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardResponsiveScreen>

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

      {selectingGroup ? (
        <FullScreenSelectionScreen
          onBack={() => setSelectingGroup(false)}
          onSelect={moveToGroup}
          options={groups.map(({ group }) => ({
            value: group.id,
            label: groupDisplayName(group, t),
          }))}
          overlay
          selectedValue={values.category.groupId}
          title={t('categories.chooseGroup')}
        />
      ) : null}

      {deletionFlow === 'select-destination' ? (
        <SelectCategoryScreen
          allowCreateCategory
          budgetValuesByCategoryId={deletionValuesByCategoryId}
          disabled={deleting}
          excludedCategoryIds={[categoryId]}
          groups={deletionGroups}
          onBack={() => {
            if (deleting) router.back();
            else setDeletionFlow(null);
          }}
          onCreateCategory={createReplacement}
          onCreatedCategory={() => undefined}
          onSelect={(selection) => {
            if (selection.kind === 'category') {
              return deleteCategory(selection.category.id, false);
            }
          }}
          overlay
          title={t('categories.selectDestination')}
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
}: Readonly<{
  progress: number;
  tone: 'warning' | 'positive' | 'negative';
}>) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const percentage = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const activeSegments = Math.round((percentage / 100) * PROGRESS_SEGMENTS);
  const activeColor =
    tone === 'warning'
      ? theme.colors.warning
      : tone === 'negative'
        ? theme.colors.negative
        : theme.colors.positive;

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
      {tone === 'negative' ? (
        <MaterialCommunityIcons
          color={activeColor}
          name="alert-circle-outline"
          size={30}
        />
      ) : percentage >= 100 ? (
        <MaterialCommunityIcons
          color={activeColor}
          name="check-bold"
          size={30}
        />
      ) : (
        <Text style={[styles.percentage, { color: activeColor }]}>
          {percentage}%
        </Text>
      )}
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
    identityCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 20,
      borderWidth: 1,
      overflow: 'hidden',
    },
    identityRow: {
      minHeight: 66,
      paddingHorizontal: 18,
      paddingVertical: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    identityRowBorder: {
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    identityCopy: { flex: 1 },
    eyebrow: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    identityValue: {
      marginTop: 3,
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: '800',
    },
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
      borderRadius: theme.radii.pill,
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
      borderRadius: theme.radii.pill,
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
      borderRadius: theme.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      color: theme.colors.primary,
      fontSize: 15,
      fontWeight: '800',
    },
    snoozeButton: {
      minHeight: 52,
      paddingHorizontal: 18,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    snoozeButtonText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '800',
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
    errorCard: { gap: 10 },
    categoryActions: { gap: 10 },
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
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '800',
    },
    deleteButton: {
      minHeight: 50,
      backgroundColor: theme.colors.negativeMuted,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteButtonText: {
      color: theme.colors.negative,
      fontSize: 14,
      fontWeight: '800',
    },
  });
