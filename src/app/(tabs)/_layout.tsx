import { Tabs } from 'expo-router';
import { StyleSheet, Text, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabIconProps = Readonly<{
  color: ColorValue;
  symbol: string;
}>;

function TabIcon({ color, symbol }: TabIconProps) {
  return <Text style={[styles.icon, { color }]}>{symbol}</Text>;
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
          tabBarIcon: ({ color }) => <TabIcon color={color} symbol="◎" />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color }) => <TabIcon color={color} symbol="▣" />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color }) => <TabIcon color={color} symbol="⇄" />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => <TabIcon color={color} symbol="▥" />,
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
  icon: {
    fontSize: 19,
    fontWeight: '700',
  },
});
