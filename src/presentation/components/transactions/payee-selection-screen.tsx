import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedFlowScreen } from '@/presentation/components/common/animated-flow-screen';
import { SearchableSelectionInput } from '@/presentation/components/common/searchable-selection-input';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import {
  filterSearchableItems,
  hasExactSelectionMatch,
} from '@/presentation/utils/searchable-selection';

type PayeeSelectionScreenProps = Readonly<{
  payees: readonly string[];
  selectedPayee?: string;
  onSelect: (payee: string) => void;
  onBack: () => void;
  overlay?: boolean;
}>;

export function PayeeSelectionScreen({
  payees,
  selectedPayee,
  onSelect,
  onBack,
  overlay = false,
}: PayeeSelectionScreenProps) {
  const { language, t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [search, setSearch] = useState('');
  const inputRef = useRef<TextInput>(null);
  const query = search.trim();
  const visible = useMemo(
    () => filterSearchableItems(payees, query, language, (payee) => payee),
    [language, payees, query],
  );
  const exactMatch = hasExactSelectionMatch(
    payees,
    query,
    language,
    (payee) => payee,
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  function choose(payee: string, goBack: () => void) {
    onSelect(payee);
    goBack();
  }

  return (
    <AnimatedFlowScreen onBack={onBack} overlay={overlay}>
      {(goBack) => (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={t('common.back')}
              onPress={goBack}
              style={styles.back}
            >
              <MaterialCommunityIcons
                color={theme.colors.text}
                name="arrow-left"
                size={25}
              />
            </Pressable>
            <Text style={styles.title}>{t('payees.choose')}</Text>
            <View style={styles.spacer} />
          </View>
          <SearchableSelectionInput
            inputRef={inputRef}
            onChangeText={setSearch}
            onSubmit={() => query && choose(query, goBack)}
            placeholder={t('payees.searchOrCreate')}
            value={search}
          />
          <FlatList
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.content}
            data={visible}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(payee) => payee.toLocaleLowerCase(language)}
            ListEmptyComponent={
              !query ? (
                <Text style={styles.empty}>{t('payees.emptyHint')}</Text>
              ) : null
            }
            ListHeaderComponent={
              <>
                {query && !exactMatch ? (
                  <Pressable
                    onPress={() => choose(query, goBack)}
                    style={styles.createRow}
                  >
                    <View style={styles.createIcon}>
                      <Text style={styles.createIconText}>+</Text>
                    </View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.createLabel}>
                        {t('payees.create', { name: query })}
                      </Text>
                      <Text style={styles.description}>
                        {t('payees.createHint')}
                      </Text>
                    </View>
                  </Pressable>
                ) : null}
                <Text style={styles.sectionTitle}>
                  {query ? t('payees.matching') : t('payees.all')}
                </Text>
              </>
            }
            renderItem={({ item: payee }) => {
              const selected = payee === selectedPayee;
              return (
                <Pressable
                  onPress={() => choose(payee, goBack)}
                  style={[styles.row, selected && styles.selectedRow]}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {payee.slice(0, 1).toLocaleUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.payee}>{payee}</Text>
                  <Text style={styles.check}>{selected ? '✓' : ''}</Text>
                </Pressable>
              );
            }}
            style={styles.list}
          />
        </SafeAreaView>
      )}
    </AnimatedFlowScreen>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      minHeight: 64,
      paddingHorizontal: 16,
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
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
    },
    spacer: { width: 44 },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 36,
    },
    list: { width: '100%', maxWidth: 680, alignSelf: 'center' },
    createRow: {
      minHeight: 76,
      paddingHorizontal: 16,
      marginBottom: 18,
      backgroundColor: theme.colors.primaryMuted,
      borderColor: theme.colors.border,
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    createIcon: {
      width: 38,
      height: 38,
      backgroundColor: theme.colors.primary,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    createIconText: {
      color: theme.colors.onPrimary,
      fontSize: 25,
      lineHeight: 27,
      fontWeight: '700',
    },
    rowCopy: { flex: 1 },
    createLabel: {
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: '800',
    },
    description: { marginTop: 3, color: theme.colors.textMuted, fontSize: 12 },
    sectionTitle: {
      paddingHorizontal: 8,
      paddingVertical: 10,
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    row: {
      minHeight: 66,
      paddingHorizontal: 12,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    selectedRow: { backgroundColor: theme.colors.surfacePressed },
    avatar: {
      width: 38,
      height: 38,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: '800',
    },
    payee: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    check: {
      width: 26,
      color: theme.colors.primary,
      fontSize: 20,
      fontWeight: '800',
    },
    empty: {
      paddingVertical: 48,
      color: theme.colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },
  });
