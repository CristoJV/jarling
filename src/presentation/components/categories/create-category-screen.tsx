import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type { Category } from '@/domain/entities/category';
import { AnimatedFlowScreen } from '@/presentation/components/common/animated-flow-screen';
import { FullScreenSelectionScreen } from '@/presentation/components/common/full-screen-selection-screen';
import { KeyboardResponsiveScreen } from '@/presentation/components/common/keyboard-responsive-screen';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { groupDisplayName } from '@/presentation/utils/category-name';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

type Props = Readonly<{
  groups: readonly CategoryGroupSummary[];
  initialName?: string;
  onBack: () => void;
  onCreate: (
    input: Readonly<{ groupId: string; name: string }>,
  ) => Promise<Category>;
  onCreated?: (category: Category) => void;
}>;

export function CreateCategoryScreen({
  groups,
  initialName = '',
  onBack,
  onCreate,
  onCreated,
}: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const selectableGroups = groups;
  const [groupId, setGroupId] = useState(selectableGroups[0]?.group.id ?? '');
  const [name, setName] = useState(initialName);
  const [choosingGroup, setChoosingGroup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedGroup = selectableGroups.find(
    ({ group }) => group.id === groupId,
  );

  async function submit() {
    if (!groupId || !name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const category = await onCreate({ groupId, name });
      onCreated?.(category);
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
      setSaving(false);
    }
  }

  return (
    <AnimatedFlowScreen onBack={onBack} overlay>
      {(goBack) => (
        <SafeAreaView style={styles.screen}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={t('common.back')}
              disabled={saving}
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
              {t('categories.createTitle')}
            </Text>
            <View style={styles.headerButton} />
          </View>

          <KeyboardResponsiveScreen>
            <View style={styles.content}>
              <Text style={styles.label}>{t('budget.categoryName')}</Text>
              <TextInput
                autoCapitalize="sentences"
                autoFocus
                editable={!saving}
                onChangeText={setName}
                placeholder={t('categories.namePlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                returnKeyType="done"
                style={styles.input}
                value={name}
              />

              <Text style={styles.label}>{t('categories.chooseGroup')}</Text>
              <Pressable
                disabled={saving || selectableGroups.length === 0}
                onPress={() => setChoosingGroup(true)}
                style={styles.selector}
              >
                <Text style={styles.selectorText}>
                  {selectedGroup
                    ? groupDisplayName(selectedGroup.group, t)
                    : t('categories.noGroups')}
                </Text>
                <MaterialCommunityIcons
                  color={theme.colors.textMuted}
                  name="chevron-right"
                  size={23}
                />
              </Pressable>

              {error ? (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                  {error}
                </Text>
              ) : null}

              <Pressable
                disabled={saving || !groupId || !name.trim()}
                onPress={() => void submit()}
                style={({ pressed }) => [
                  styles.submit,
                  (!groupId || !name.trim()) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={theme.colors.onPrimary} />
                ) : (
                  <Text style={styles.submitLabel}>
                    {t('budget.createCategory')}
                  </Text>
                )}
              </Pressable>
            </View>
          </KeyboardResponsiveScreen>

          {choosingGroup ? (
            <FullScreenSelectionScreen
              onBack={() => setChoosingGroup(false)}
              onSelect={setGroupId}
              options={selectableGroups.map(({ group }) => ({
                value: group.id,
                label: groupDisplayName(group, t),
              }))}
              overlay
              selectedValue={groupId}
              title={t('categories.chooseGroup')}
            />
          ) : null}
        </SafeAreaView>
      )}
    </AnimatedFlowScreen>
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
      padding: 24,
      alignSelf: 'center',
      gap: 10,
    },
    label: {
      marginTop: 10,
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '800',
    },
    input: {
      minHeight: 58,
      paddingHorizontal: 18,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 16,
      borderWidth: 1,
      fontSize: 17,
    },
    selector: {
      minHeight: 58,
      paddingHorizontal: 18,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    selectorText: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    error: {
      padding: 12,
      color: theme.colors.negative,
      backgroundColor: theme.colors.negativeMuted,
      borderRadius: 12,
      fontSize: 13,
      textAlign: 'center',
    },
    submit: {
      minHeight: 54,
      marginTop: 18,
      backgroundColor: theme.colors.primary,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitLabel: {
      color: theme.colors.onPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.75 },
  });
