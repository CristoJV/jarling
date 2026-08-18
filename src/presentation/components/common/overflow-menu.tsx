import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

export type OverflowMenuItem = Readonly<{
  label: string;
  onPress: () => void;
}>;

type OverflowMenuProps = Readonly<{
  items?: readonly OverflowMenuItem[];
}>;

export function OverflowMenu({ items = [] }: OverflowMenuProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [visible, setVisible] = useState(false);

  function select(action: () => void) {
    setVisible(false);
    action();
  }

  return (
    <>
      <Pressable
        accessibilityLabel={t('common.moreOptions')}
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
            accessibilityLabel={t('common.close')}
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
              <Text style={styles.menuItemText}>{t('common.settings')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    menuButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuButtonText: {
      color: theme.colors.textSecondary,
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 1,
    },
    overlay: {
      flex: 1,
      paddingTop: 68,
      paddingRight: 18,
      backgroundColor: theme.colors.scrim,
      alignItems: 'flex-end',
    },
    menu: {
      width: 230,
      paddingVertical: 8,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
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
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      marginVertical: 6,
      backgroundColor: theme.colors.border,
    },
  });
