import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedFlowScreen } from '@/presentation/components/common/animated-flow-screen';
import type { SelectionOption } from '@/presentation/components/common/selection-option';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

type Props<Value extends string> = Readonly<{
  title: string;
  options: readonly SelectionOption<Value>[];
  selectedValue?: Value;
  onSelect: (value: Value) => void;
  onBack: () => void;
  overlay?: boolean;
}>;

export function FullScreenSelectionScreen<Value extends string>({
  title,
  options,
  selectedValue,
  onSelect,
  onBack,
  overlay = false,
}: Props<Value>) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <AnimatedFlowScreen onBack={onBack} overlay={overlay}>
      {(goBack) => (
        <SafeAreaView style={styles.screen}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={t('common.back')}
              hitSlop={10}
              onPress={goBack}
              style={styles.back}
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
            <View style={styles.spacer} />
          </View>
          <FlatList
            contentContainerStyle={styles.options}
            data={options}
            keyExtractor={({ value }) => value}
            renderItem={({ item }) => {
              const selected = item.value === selectedValue;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onSelect(item.value);
                    goBack();
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                >
                  <View style={styles.optionCopy}>
                    <Text style={styles.optionLabel}>{item.label}</Text>
                    {item.description ? (
                      <Text style={styles.optionDescription}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                  {selected ? (
                    <MaterialCommunityIcons
                      color={theme.colors.primary}
                      name="check-circle"
                      size={23}
                    />
                  ) : null}
                </Pressable>
              );
            }}
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
    back: {
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
    spacer: { width: 44 },
    options: {
      width: '100%',
      maxWidth: 680,
      padding: 20,
      paddingBottom: 48,
      alignSelf: 'center',
      gap: 8,
    },
    option: {
      minHeight: 68,
      paddingHorizontal: 18,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    optionSelected: { borderColor: theme.colors.primary },
    optionPressed: { backgroundColor: theme.colors.surfacePressed },
    optionCopy: { flex: 1, paddingVertical: 12 },
    optionLabel: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
    optionDescription: {
      marginTop: 3,
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
  });
