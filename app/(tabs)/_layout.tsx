import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="me" options={{ title: '我的' }} />
      <Tabs.Screen name="cooling" options={{ title: '冷靜區' }} />
      <Tabs.Screen name="unlocked" options={{ title: '解鎖區' }} />
    </Tabs>
  );
}
