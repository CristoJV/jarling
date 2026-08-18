import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FullScreenModal } from '@/presentation/components/common/full-screen-modal';

type PayeeSelectionScreenProps = Readonly<{
  payees: readonly string[];
  selectedPayee?: string;
  onSelect: (payee: string) => void;
  onDismiss: () => void;
}>;

export function PayeeSelectionScreen({
  payees,
  selectedPayee,
  onSelect,
  onDismiss,
}: PayeeSelectionScreenProps) {
  const [search, setSearch] = useState('');
  const query = search.trim();
  const visible = useMemo(
    () =>
      payees.filter((payee) =>
        payee.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      ),
    [payees, query],
  );
  const exactMatch = payees.some(
    (payee) => payee.toLocaleLowerCase() === query.toLocaleLowerCase(),
  );

  function choose(payee: string) {
    onSelect(payee);
    onDismiss();
  }

  return (
    <FullScreenModal onRequestClose={onDismiss}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back"
            onPress={onDismiss}
            style={styles.back}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Choose Payee</Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            autoCapitalize="words"
            autoFocus
            onChangeText={setSearch}
            placeholder="Search or create a payee"
            placeholderTextColor="#89918b"
            returnKeyType="done"
            onSubmitEditing={() => query && choose(query)}
            style={styles.search}
            value={search}
          />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {query && !exactMatch ? (
            <Pressable onPress={() => choose(query)} style={styles.createRow}>
              <View style={styles.createIcon}>
                <Text style={styles.createIconText}>+</Text>
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.createLabel}>Create “{query}”</Text>
                <Text style={styles.description}>
                  It will be saved when the transaction is saved.
                </Text>
              </View>
            </Pressable>
          ) : null}
          <Text style={styles.sectionTitle}>
            {query ? 'MATCHING PAYEES' : 'ALL PAYEES'}
          </Text>
          {visible.map((payee) => {
            const selected = payee === selectedPayee;
            return (
              <Pressable
                key={payee}
                onPress={() => choose(payee)}
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
          })}
          {visible.length === 0 && !query ? (
            <Text style={styles.empty}>
              No payees yet. Type a name to create the first one.
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f8f6' },
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
  backText: { color: '#315a3e', fontSize: 38, lineHeight: 40 },
  title: {
    flex: 1,
    color: '#18201a',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  spacer: { width: 44 },
  searchWrap: {
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    backgroundColor: '#e9ede9',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: { color: '#657068', fontSize: 24 },
  search: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 10,
    color: '#18201a',
    fontSize: 16,
  },
  content: {
    width: '100%',
    maxWidth: 680,
    paddingHorizontal: 20,
    paddingBottom: 36,
    alignSelf: 'center',
  },
  createRow: {
    minHeight: 76,
    paddingHorizontal: 16,
    marginBottom: 18,
    backgroundColor: '#eaf2eb',
    borderColor: '#cadbcd',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createIcon: {
    width: 38,
    height: 38,
    backgroundColor: '#315a3e',
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createIconText: {
    color: '#fff',
    fontSize: 25,
    lineHeight: 27,
    fontWeight: '700',
  },
  rowCopy: { flex: 1 },
  createLabel: { color: '#24492f', fontSize: 16, fontWeight: '800' },
  description: { marginTop: 3, color: '#68736b', fontSize: 12 },
  sectionTitle: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    color: '#79827b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  row: {
    minHeight: 66,
    paddingHorizontal: 12,
    borderBottomColor: '#e4e8e3',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedRow: { backgroundColor: '#eef5ef' },
  avatar: {
    width: 38,
    height: 38,
    backgroundColor: '#dfe8e0',
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#315a3e', fontSize: 16, fontWeight: '800' },
  payee: { flex: 1, color: '#253028', fontSize: 16, fontWeight: '600' },
  check: { width: 26, color: '#315a3e', fontSize: 20, fontWeight: '800' },
  empty: {
    paddingVertical: 48,
    color: '#737d76',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
