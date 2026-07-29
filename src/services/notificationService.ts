import * as Notifications from 'expo-notifications';
import type { Item } from '../types/item';

const THREE_DAY_ID_PREFIX = 'sparklist-3day-';
const UNLOCK_ID_PREFIX = 'sparklist-unlock-';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export async function scheduleReminders(item: Item): Promise<void> {
  const unlockDate = new Date(item.unlockDate);
  const now = Date.now();
  const threeDaysBefore = new Date(unlockDate.getTime() - THREE_DAYS_MS);

  if (threeDaysBefore.getTime() > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${THREE_DAY_ID_PREFIX}${item.id}`,
      content: { title: 'SPARK LIST', body: '再堅持一下，就快解鎖囉！' },
      trigger: threeDaysBefore as unknown as Notifications.NotificationTriggerInput,
    });
  }

  if (unlockDate.getTime() > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${UNLOCK_ID_PREFIX}${item.id}`,
      content: { title: 'SPARK LIST', body: `「${item.name}」已解鎖，可以重新考慮購買了！` },
      trigger: unlockDate as unknown as Notifications.NotificationTriggerInput,
    });
  }
}

export async function cancelReminders(itemId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`${THREE_DAY_ID_PREFIX}${itemId}`);
  await Notifications.cancelScheduledNotificationAsync(`${UNLOCK_ID_PREFIX}${itemId}`);
}

export async function requestNotificationPermission(): Promise<boolean> {
  const result = await Notifications.requestPermissionsAsync();
  return result.status === 'granted';
}
