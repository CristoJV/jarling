import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ComponentProps } from 'react';

type TabIconProps = Readonly<{
  color: ColorValue;
  name: ComponentProps<typeof MaterialCommunityIcons>['name'];
}>;

function TabIcon({ color, name }: TabIconProps) {
  return <MaterialCommunityIcons color={color} name={name} size={25} />;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#294d36',
        tabBarInactiveTintColor: '#747d76',
        tabBarLabelStyle: styles.label,
        tabBarStyle: [
          styles.tabBar,
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
          title: 'Budget',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name="piggy-bank-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name="bank-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="cash" />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="chart-bar" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    paddingTop: 6,
    backgroundColor: '#ffffff',
    borderTopColor: '#dfe3dc',
  },
  label: {
    paddingBottom: 5,
    fontSize: 11,
    fontWeight: '600',
  },
});
