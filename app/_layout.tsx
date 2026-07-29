import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="item/new" options={{ title: '新增單品', presentation: 'modal' }} />
      <Stack.Screen name="item/[id]" options={{ title: '單品詳情' }} />
    </Stack>
  );
}
