import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ComponentProps } from 'react';
import { useTranslation } from '@/presentation/localization/localization-provider';
import { useAppTheme } from '@/presentation/theme/theme-provider';

type TabIconProps = Readonly<{
  color: ColorValue;
  name: ComponentProps<typeof MaterialCommunityIcons>['name'];
}>;

function TabIcon({ color, name }: TabIconProps) {
  return <MaterialCommunityIcons color={color} name={name} size={25} />;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: { paddingBottom: 5, fontSize: 11, fontWeight: '600' },
        tabBarItemStyle: {
          marginVertical: 3,
          borderRadius: 12,
          overflow: 'hidden',
        },
        tabBarStyle: [
          {
            paddingTop: 6,
            backgroundColor: theme.colors.navigation,
            borderTopColor: theme.colors.border,
            overflow: 'hidden',
          },
          {
            height: 62 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ],
      }}
    >
      <Tabs.Screen
        name="budget"
        options={{
          title: t('tabs.budget'),
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name="piggy-bank-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: t('tabs.accounts'),
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name="bank-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('tabs.transactions'),
          tabBarIcon: ({ color }) => <TabIcon color={color} name="cash" />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: t('tabs.reports'),
          tabBarIcon: ({ color }) => <TabIcon color={color} name="chart-bar" />,
        }}
      />
    </Tabs>
  );
}
