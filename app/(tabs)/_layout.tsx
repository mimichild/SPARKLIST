import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS } from '../../src/constants/theme';

export default function TabsLayout() {
  const themeColor = useAppStore((s) => s.themeColor);
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColor,
        tabBarInactiveTintColor: '#999',
        tabBarIcon: () => null,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 50 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 0,
        },
      }}
    >
      <Tabs.Screen name="me" options={{ title: '我的' }} />
      <Tabs.Screen name="cooling" options={{ title: '冷靜區' }} />
      <Tabs.Screen name="unlocked" options={{ title: '解鎖區' }} />
    </Tabs>
  );
}
