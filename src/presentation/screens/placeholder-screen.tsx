import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OverflowMenu } from '@/presentation/components/common/overflow-menu';

type PlaceholderScreenProps = Readonly<{
  description: string;
  title: string;
}>;

export function PlaceholderScreen({
  description,
  title,
}: PlaceholderScreenProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <OverflowMenu />
      </View>
      <View style={styles.content}>
        <Text style={styles.heading}>Próximamente</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f7f5',
  },
  header: {
    minHeight: 68,
    paddingHorizontal: 24,
    borderBottomColor: '#dfe3dc',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#18201a',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  content: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heading: {
    color: '#253028',
    fontSize: 20,
    fontWeight: '700',
  },
  description: {
    maxWidth: 360,
    color: '#687268',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
