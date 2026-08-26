import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type { Category } from '@/domain/entities/category';
import { AnimatedFlowScreen } from '@/presentation/components/common/animated-flow-screen';
import { SearchableSelectionInput } from '@/presentation/components/common/searchable-selection-input';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import {
  categoryDisplayName,
  groupDisplayName,
} from '@/presentation/utils/category-name';
import {
  filterSearchableItems,
  hasExactSelectionMatch,
} from '@/presentation/utils/searchable-selection';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

import { CreateCategoryScreen } from './create-category-screen';

export type CategorySelection =
  | Readonly<{ kind: 'ready-to-assign' }>
  | Readonly<{ kind: 'uncategorized' }>
  | Readonly<{ kind: 'category'; category: Category }>;

type Props = Readonly<{
  allowCreateCategory?: boolean;
  disabled?: boolean;
  excludedCategoryIds?: readonly string[];
  groups: readonly CategoryGroupSummary[];
  initialSearch?: string;
  onBack: () => void;
  onCreateCategory?: (input: {
    groupId: string;
    name: string;
  }) => Promise<Category>;
  onCreatedCategory?: (category: Category) => void | Promise<void>;
  onSelect: (selection: CategorySelection) => void | Promise<void>;
  overlay?: boolean;
  readyToAssignDescription?: string;
  selectedCategoryId?: string;
  selectedSpecial?: 'ready-to-assign' | 'uncategorized';
  showReadyToAssign?: boolean;
  showUncategorized?: boolean;
  title: string;
}>;

export function SelectCategoryScreen({
  allowCreateCategory = true,
  disabled = false,
  excludedCategoryIds = [],
  groups,
  initialSearch = '',
  onBack,
  onCreateCategory,
  onCreatedCategory,
  onSelect,
  overlay = false,
  readyToAssignDescription,
  selectedCategoryId,
  selectedSpecial,
  showReadyToAssign = false,
  showUncategorized = false,
  title,
}: Props) {
  const { language, t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const inputRef = useRef<TextInput>(null);
  const [search, setSearch] = useState(initialSearch);
  const [creatingName, setCreatingName] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const excluded = useMemo(
    () => new Set(excludedCategoryIds),
    [excludedCategoryIds],
  );
  const selectable = useMemo(
    () =>
      groups.flatMap(({ group, categories }) =>
        categories
          .filter(
            (category) =>
              !category.hidden &&
              !category.linkedAccountId &&
              !excluded.has(category.id),
          )
          .map((category) => ({ category, group })),
      ),
    [excluded, groups],
  );
  const filtered = useMemo(
    () =>
      filterSearchableItems(selectable, search, language, ({ category }) =>
        categoryDisplayName(category, t),
      ),
    [language, search, selectable, t],
  );
  const sections = useMemo(
    () =>
      groups.flatMap(({ group }) => {
        const data = filtered
          .filter(({ group: candidate }) => candidate.id === group.id)
          .map(({ category }) => category);
        return data.length ? [{ title: groupDisplayName(group, t), data }] : [];
      }),
    [filtered, groups, t],
  );
  const query = search.trim();
  const canCreate =
    allowCreateCategory && Boolean(onCreateCategory) && !disabled;
  const exactMatch = hasExactSelectionMatch(
    selectable,
    query,
    language,
    ({ category }) => categoryDisplayName(category, t),
  );

  async function choose(selection: CategorySelection, goBack: () => void) {
    if (selecting) return;
    setSelecting(true);
    setSelectionError(null);
    try {
      await onSelect(selection);
      goBack();
    } catch (cause) {
      setSelectionError(domainErrorMessage(cause, t));
    } finally {
      setSelecting(false);
    }
  }

  async function created(category: Category, goBack: () => void) {
    setCreatingName(null);
    setSelecting(true);
    try {
      if (onCreatedCategory) await onCreatedCategory(category);
      else await onSelect({ kind: 'category', category });
      goBack();
    } finally {
      setSelecting(false);
    }
  }

  return (
    <AnimatedFlowScreen onBack={onBack} overlay={overlay}>
      {(goBack) => (
        <SafeAreaView style={styles.screen}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={t('common.back')}
              disabled={disabled || selecting}
              hitSlop={10}
              onPress={goBack}
              style={styles.headerButton}
            >
              <MaterialCommunityIcons
                color={theme.colors.text}
                name="arrow-left"
                size={25}
              />
            </Pressable>
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
            <View style={styles.headerButton} />
          </View>

          <SearchableSelectionInput
            inputRef={inputRef}
            onChangeText={setSearch}
            placeholder={t('categories.searchOrCreate')}
            value={search}
          />
          {selectionError ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {selectionError}
            </Text>
          ) : null}

          <SectionList
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.content}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            keyExtractor={({ id }) => id}
            ListEmptyComponent={
              query && !canCreate ? (
                <Text style={styles.empty}>{t('categories.noMatches')}</Text>
              ) : null
            }
            ListHeaderComponent={
              <>
                {canCreate && query && !exactMatch ? (
                  <ActionRow
                    icon="plus-circle-outline"
                    disabled={disabled || selecting}
                    label={t('categories.createNamed', { name: query })}
                    onPress={() => setCreatingName(query)}
                  />
                ) : null}
                {canCreate && !query ? (
                  <ActionRow
                    icon="plus-circle-outline"
                    disabled={disabled || selecting}
                    label={t('categories.createNew')}
                    onPress={() => setCreatingName('')}
                  />
                ) : null}
                {showReadyToAssign && !query ? (
                  <SelectionRow
                    description={readyToAssignDescription}
                    disabled={disabled || selecting}
                    label={t('budget.readyToAssign')}
                    onPress={() =>
                      void choose({ kind: 'ready-to-assign' }, goBack)
                    }
                    selected={selectedSpecial === 'ready-to-assign'}
                  />
                ) : null}
                {showUncategorized && !query ? (
                  <SelectionRow
                    label={t('transactions.uncategorized')}
                    disabled={disabled || selecting}
                    onPress={() =>
                      void choose({ kind: 'uncategorized' }, goBack)
                    }
                    selected={selectedSpecial === 'uncategorized'}
                  />
                ) : null}
              </>
            }
            renderItem={({ item }) => (
              <SelectionRow
                label={categoryDisplayName(item, t)}
                disabled={disabled || selecting}
                onPress={() =>
                  void choose({ kind: 'category', category: item }, goBack)
                }
                selected={item.id === selectedCategoryId}
              />
            )}
            renderSectionHeader={({ section }) => (
              <Text style={styles.groupTitle}>{section.title}</Text>
            )}
            sections={sections}
            stickySectionHeadersEnabled={false}
          />

          {selecting ? (
            <View style={styles.busy}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : null}

          {creatingName !== null && onCreateCategory ? (
            <CreateCategoryScreen
              groups={groups}
              initialName={creatingName}
              onBack={() => setCreatingName(null)}
              onCreate={onCreateCategory}
              onCreated={(category) => void created(category, goBack)}
            />
          ) : null}
        </SafeAreaView>
      )}
    </AnimatedFlowScreen>
  );
}

function ActionRow({
  disabled,
  icon,
  label,
  onPress,
}: Readonly<{
  icon: 'plus-circle-outline';
  disabled?: boolean;
  label: string;
  onPress: () => void;
}>) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable disabled={disabled} onPress={onPress} style={styles.actionRow}>
      <MaterialCommunityIcons
        color={theme.colors.primary}
        name={icon}
        size={24}
      />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function SelectionRow({
  description,
  disabled,
  label,
  onPress,
  selected,
}: Readonly<{
  description?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  selected: boolean;
}>) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.category,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.categoryCopy}>
        <Text style={styles.categoryLabel}>{label}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      {selected ? (
        <MaterialCommunityIcons
          color={theme.colors.primary}
          name="check-circle"
          size={22}
        />
      ) : null}
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      minHeight: 64,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 21,
      fontWeight: '800',
      textAlign: 'center',
    },
    content: {
      width: '100%',
      maxWidth: 680,
      paddingHorizontal: 20,
      paddingBottom: 48,
      alignSelf: 'center',
    },
    actionRow: {
      minHeight: 58,
      paddingHorizontal: 16,
      marginBottom: 12,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    actionLabel: {
      flex: 1,
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: '800',
    },
    groupTitle: {
      paddingHorizontal: 6,
      paddingTop: 18,
      paddingBottom: 8,
      color: theme.colors.textMuted,
      backgroundColor: theme.colors.background,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.7,
    },
    category: {
      minHeight: 58,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    categoryCopy: { flex: 1, paddingVertical: 10 },
    categoryLabel: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    description: {
      marginTop: 2,
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    selected: { backgroundColor: theme.colors.surfacePressed },
    pressed: { opacity: 0.72 },
    empty: {
      paddingVertical: 48,
      color: theme.colors.textMuted,
      fontSize: 15,
      textAlign: 'center',
    },
    error: {
      marginHorizontal: 20,
      marginBottom: 8,
      color: theme.colors.negative,
      fontSize: 13,
    },
    busy: {
      ...StyleSheet.absoluteFill,
      backgroundColor: '#00000033',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
    },
  });
