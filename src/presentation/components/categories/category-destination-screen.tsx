import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type { Category } from '@/domain/entities/category';
import { AnimatedFlowScreen } from '@/presentation/components/common/animated-flow-screen';
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

type Props = Readonly<{
  groups: readonly CategoryGroupSummary[];
  excludedCategoryId: string;
  disabled?: boolean;
  onBack: () => void;
  onCreateNew: () => void;
  onSelect: (category: Category) => void;
}>;

export function CategoryDestinationScreen({
  groups,
  excludedCategoryId,
  disabled = false,
  onBack,
  onCreateNew,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const sections = groups.flatMap(({ group, categories }) => {
    const selectable = categories.filter(
      (category) =>
        category.id !== excludedCategoryId && !category.linkedAccountId,
    );
    return selectable.length > 0
      ? [{ title: groupDisplayName(group, t), data: selectable }]
      : [];
  });

  return (
    <AnimatedFlowScreen onBack={onBack} overlay>
      {(goBack) => (
        <SafeAreaView style={styles.screen}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={t('common.back')}
              disabled={disabled}
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
              {t('categories.selectDestination')}
            </Text>
            <View style={styles.headerButton} />
          </View>

          <SectionList
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyExtractor={({ id }) => id}
            ListHeaderComponent={
              <Pressable
                disabled={disabled}
                onPress={onCreateNew}
                style={({ pressed }) => [
                  styles.createButton,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialCommunityIcons
                  color={theme.colors.primary}
                  name="plus-circle-outline"
                  size={24}
                />
                <Text style={styles.createLabel}>
                  {t('categories.createNew')}
                </Text>
              </Pressable>
            }
            renderItem={({ item }) => (
              <Pressable
                disabled={disabled}
                onPress={() => onSelect(item)}
                style={({ pressed }) => [
                  styles.category,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.categoryLabel}>
                  {categoryDisplayName(item, t)}
                </Text>
                <MaterialCommunityIcons
                  color={theme.colors.textMuted}
                  name="chevron-right"
                  size={22}
                />
              </Pressable>
            )}
            renderSectionHeader={({ section }) => (
              <Text style={styles.groupTitle}>{section.title}</Text>
            )}
            sections={sections}
            stickySectionHeadersEnabled={false}
          />
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
      padding: 20,
      paddingBottom: 48,
      alignSelf: 'center',
    },
    createButton: {
      minHeight: 60,
      paddingHorizontal: 18,
      marginBottom: 20,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    createLabel: {
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: '800',
    },
    groupTitle: {
      paddingHorizontal: 6,
      paddingTop: 18,
      paddingBottom: 8,
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    category: {
      minHeight: 60,
      paddingHorizontal: 18,
      backgroundColor: theme.colors.surface,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    categoryLabel: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    pressed: { opacity: 0.7 },
  });
