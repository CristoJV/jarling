import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Tag } from '@/domain/entities/tag';
import { normalizeTagName, tagNameKey } from '@/domain/entities/tag';
import { AnimatedFlowScreen } from '@/presentation/components/common/animated-flow-screen';
import { BottomActionLayout } from '@/presentation/components/common/bottom-action-layout';
import { KeyboardResponsiveScreen } from '@/presentation/components/common/keyboard-responsive-screen';
import { SearchableSelectionInput } from '@/presentation/components/common/searchable-selection-input';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

export type TagSelection = Readonly<{
  tagIds: readonly string[];
  newTagNames: readonly string[];
}>;

type Choice = Readonly<{
  key: string;
  name: string;
  tagId?: string;
  newName?: string;
}>;

type Props = Readonly<{
  allowCreate?: boolean;
  tags: readonly Tag[];
  recentTags: readonly Tag[];
  selectedTagIds: readonly string[];
  selectedNewTagNames?: readonly string[];
  onBack: () => void;
  onConfirm: (selection: TagSelection) => void;
  overlay?: boolean;
}>;

export function TagSelectionScreen({
  allowCreate = true,
  tags,
  recentTags,
  selectedTagIds,
  selectedNewTagNames = [],
  onBack,
  onConfirm,
  overlay = false,
}: Props) {
  const { language, t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const inputRef = useRef<TextInput>(null);
  const [search, setSearch] = useState('');
  const [newNames, setNewNames] = useState(() => [...selectedNewTagNames]);
  const [selected, setSelected] = useState(
    () =>
      new Set([
        ...selectedTagIds.map((id) => `tag:${id}`),
        ...selectedNewTagNames.map((name) => `new:${tagNameKey(name)}`),
      ]),
  );
  const query = search.trim();
  const choices = useMemo<readonly Choice[]>(
    () => [
      ...tags.map((tag) => ({
        key: `tag:${tag.id}`,
        name: tag.name,
        tagId: tag.id,
      })),
      ...newNames.map((name) => ({
        key: `new:${tagNameKey(name)}`,
        name,
        newName: name,
      })),
    ],
    [newNames, tags],
  );
  const visible = useMemo(
    () =>
      choices
        .filter(({ name }) =>
          name
            .toLocaleLowerCase(language)
            .includes(query.toLocaleLowerCase(language)),
        )
        .sort((left, right) =>
          left.name.localeCompare(right.name, language, {
            sensitivity: 'base',
          }),
        ),
    [choices, language, query],
  );
  const recentIds = useMemo(
    () => new Set(recentTags.map(({ id }) => id)),
    [recentTags],
  );
  const sections = query
    ? [{ title: t('tags.matching'), data: visible }]
    : [
        {
          title: t('tags.recent'),
          data: recentTags.flatMap((tag) => {
            const choice = choices.find(({ tagId }) => tagId === tag.id);
            return choice ? [choice] : [];
          }),
        },
        {
          title: t('tags.all'),
          data: visible.filter(
            ({ tagId }) => tagId === undefined || !recentIds.has(tagId),
          ),
        },
      ].filter(({ data }) => data.length > 0);
  let normalizedQuery: string | undefined;
  let queryKey: string | undefined;
  try {
    normalizedQuery = query ? normalizeTagName(query) : undefined;
    queryKey = normalizedQuery ? tagNameKey(normalizedQuery) : undefined;
  } catch {
    normalizedQuery = undefined;
  }
  const exactMatch = queryKey
    ? choices.some(({ name }) => tagNameKey(name) === queryKey)
    : false;

  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggle(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function createDraft() {
    if (!normalizedQuery || !queryKey || exactMatch) return;
    const key = `new:${queryKey}`;
    setNewNames((current) => [...current, normalizedQuery!]);
    setSelected((current) => new Set([...current, key]));
    setSearch('');
  }

  function confirm(goBack: () => void) {
    onConfirm({
      tagIds: choices.flatMap(({ key, tagId }) =>
        selected.has(key) && tagId ? [tagId] : [],
      ),
      newTagNames: choices.flatMap(({ key, newName }) =>
        selected.has(key) && newName ? [newName] : [],
      ),
    });
    goBack();
  }

  return (
    <AnimatedFlowScreen onBack={onBack} overlay={overlay}>
      {(goBack) => (
        <KeyboardResponsiveScreen>
          <SafeAreaView style={styles.screen}>
            <BottomActionLayout
              bottom={
                <View style={styles.actionArea}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => confirm(goBack)}
                    style={styles.confirm}
                  >
                    <Text style={styles.confirmText}>
                      {t('tags.confirm', { count: selected.size })}
                    </Text>
                  </Pressable>
                </View>
              }
            >
              <View style={styles.header}>
                <Pressable
                  accessibilityLabel={t('common.back')}
                  onPress={goBack}
                  style={styles.headerButton}
                >
                  <MaterialCommunityIcons
                    color={theme.colors.text}
                    name="arrow-left"
                    size={25}
                  />
                </Pressable>
                <Text style={styles.title}>{t('tags.choose')}</Text>
                <Pressable
                  accessibilityLabel={t('tags.clearAll')}
                  disabled={selected.size === 0}
                  onPress={() => setSelected(new Set())}
                  style={styles.clear}
                >
                  <Text
                    style={[
                      styles.clearText,
                      selected.size === 0 && styles.disabledText,
                    ]}
                  >
                    {t('tags.clearAll')}
                  </Text>
                </Pressable>
              </View>
              <SearchableSelectionInput
                inputRef={inputRef}
                onChangeText={setSearch}
                onSubmit={createDraft}
                placeholder={
                  allowCreate ? t('tags.searchOrCreate') : t('tags.search')
                }
                value={search}
              />
              <SectionList
                automaticallyAdjustKeyboardInsets
                contentContainerStyle={styles.content}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                keyExtractor={({ key }) => key}
                ListEmptyComponent={
                  !normalizedQuery ? (
                    <Text style={styles.empty}>{t('tags.empty')}</Text>
                  ) : null
                }
                ListHeaderComponent={
                  allowCreate && normalizedQuery && !exactMatch ? (
                    <Pressable onPress={createDraft} style={styles.createRow}>
                      <MaterialCommunityIcons
                        color={theme.colors.primary}
                        name="plus-circle-outline"
                        size={24}
                      />
                      <Text style={styles.createText}>
                        {t('tags.create', { name: normalizedQuery })}
                      </Text>
                    </Pressable>
                  ) : null
                }
                renderItem={({ item }) => {
                  const checked = selected.has(item.key);
                  return (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      onPress={() => toggle(item.key)}
                      style={({ pressed }) => [
                        styles.row,
                        checked && styles.selectedRow,
                        pressed && styles.pressedRow,
                      ]}
                    >
                      <Text style={styles.rowText}>{item.name}</Text>
                      <MaterialCommunityIcons
                        color={
                          checked
                            ? theme.colors.primary
                            : theme.colors.textMuted
                        }
                        name={
                          checked
                            ? 'checkbox-marked-circle'
                            : 'checkbox-blank-circle-outline'
                        }
                        size={23}
                      />
                    </Pressable>
                  );
                }}
                renderSectionHeader={({ section }) => (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <View style={styles.separator} />
                  </View>
                )}
                sections={sections}
              />
            </BottomActionLayout>
          </SafeAreaView>
        </KeyboardResponsiveScreen>
      )}
    </AnimatedFlowScreen>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      minHeight: 64,
      paddingHorizontal: 12,
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
    clear: {
      minWidth: 74,
      minHeight: 44,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    clearText: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
    disabledText: { color: theme.colors.textMuted },
    content: {
      width: '100%',
      maxWidth: 680,
      paddingHorizontal: 20,
      paddingBottom: 24,
      alignSelf: 'center',
    },
    createRow: {
      minHeight: 58,
      paddingHorizontal: 16,
      marginBottom: 12,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    createText: { flex: 1, color: theme.colors.primary, fontWeight: '800' },
    sectionHeader: {
      minHeight: 38,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.colors.background,
    },
    sectionTitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '800',
    },
    separator: { height: 1, flex: 1, backgroundColor: theme.colors.border },
    row: {
      minHeight: 56,
      paddingHorizontal: 14,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    selectedRow: { backgroundColor: theme.colors.surfacePressed },
    pressedRow: { opacity: 0.8 },
    rowText: { flex: 1, color: theme.colors.text, fontSize: 16 },
    empty: {
      paddingVertical: 48,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    actionArea: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
      alignItems: 'flex-end',
      backgroundColor: theme.colors.background,
    },
    confirm: {
      minHeight: 52,
      paddingHorizontal: 22,
      backgroundColor: theme.colors.primary,
      borderRadius: 26,
      elevation: theme.elevation.floating,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmText: { color: theme.colors.onPrimary, fontWeight: '800' },
  });
