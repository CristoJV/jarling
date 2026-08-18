import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export type OverflowMenuItem = Readonly<{
  label: string;
  onPress: () => void;
}>;

type OverflowMenuProps = Readonly<{
  items?: readonly OverflowMenuItem[];
}>;

export function OverflowMenu({ items = [] }: OverflowMenuProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  function select(action: () => void) {
    setVisible(false);
    action();
  }

  return (
    <>
      <Pressable
        accessibilityLabel="Más opciones"
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => setVisible(true)}
        style={styles.menuButton}
      >
        <Text style={styles.menuButtonText}>•••</Text>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        transparent
        visible={visible}
      >
        <View style={styles.overlay}>
          <Pressable
            accessibilityLabel="Cerrar menú"
            onPress={() => setVisible(false)}
            style={StyleSheet.absoluteFill}
          />
          <View accessibilityRole="menu" style={styles.menu}>
            {items.map((item) => (
              <Pressable
                accessibilityRole="menuitem"
                key={item.label}
                onPress={() => select(item.onPress)}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText}>{item.label}</Text>
              </Pressable>
            ))}
            {items.length > 0 ? <View style={styles.separator} /> : null}
            <Pressable
              accessibilityRole="menuitem"
              onPress={() => select(() => router.push('/settings'))}
              style={styles.menuItem}
            >
              <Text style={styles.menuItemText}>Settings</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: {
    color: '#33463a',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  overlay: {
    flex: 1,
    paddingTop: 68,
    paddingRight: 18,
    backgroundColor: 'rgba(18, 24, 20, 0.2)',
    alignItems: 'flex-end',
  },
  menu: {
    width: 230,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderColor: '#e1e5df',
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
  },
  menuItem: {
    minHeight: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  menuItemText: {
    color: '#26332b',
    fontSize: 15,
    fontWeight: '600',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
    backgroundColor: '#dfe3dc',
  },
});
