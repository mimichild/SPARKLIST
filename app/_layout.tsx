import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as notificationService from '../src/services/notificationService';

export default function RootLayout() {
  useEffect(() => {
    notificationService.requestNotificationPermission();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="item/new" options={{ title: '新增單品', presentation: 'modal' }} />
      <Stack.Screen name="item/[id]" options={{ title: '單品詳情' }} />
    </Stack>
  );
}
