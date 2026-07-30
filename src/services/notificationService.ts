import * as Notifications from 'expo-notifications';
import type { Item } from '../types/item';

const THREE_DAY_ID_PREFIX = 'sparklist-3day-';
const UNLOCK_ID_PREFIX = 'sparklist-unlock-';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

// Scheduling/cancelling reminders is a best-effort side effect of saving or
// deleting an item, never a precondition for it. If the native notification
// module throws (denied permission, OS quirk, etc.) we must not let that
// exception propagate into the caller's await chain — callers like
// useItems.addItem() run this as their last step, and an uncaught rejection
// there would silently abort navigation/UI feedback even though the item
// was already persisted to storage a moment earlier.
export async function scheduleReminders(item: Item): Promise<void> {
  try {
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
  } catch (error) {
    console.warn('[notificationService] 排程提醒通知失敗，略過此次排程', error);
  }
}

export async function cancelReminders(itemId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`${THREE_DAY_ID_PREFIX}${itemId}`);
    await Notifications.cancelScheduledNotificationAsync(`${UNLOCK_ID_PREFIX}${itemId}`);
  } catch (error) {
    console.warn('[notificationService] 取消提醒通知失敗', error);
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const result = await Notifications.requestPermissionsAsync();
  return result.status === 'granted';
}
