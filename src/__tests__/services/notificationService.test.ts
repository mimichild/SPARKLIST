import * as Notifications from 'expo-notifications';
import * as notificationService from '../../services/notificationService';
import type { Item } from '../../types/item';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    name: '測試外套',
    photoUri: 'mock://photo.jpg',
    price: 1000,
    createdAt: '2026-07-01T00:00:00.000Z',
    unlockDate: '2026-08-01T00:00:00.000Z',
    conditionChecks: [false, false, false, false, false, false],
    status: 'cooling',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-07-15T00:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('scheduleReminders', () => {
  it('未來的解鎖日會排程「剩3天」與「解鎖日」兩則通知', async () => {
    const item = makeItem({ unlockDate: '2026-08-01T00:00:00.000Z' });
    await notificationService.scheduleReminders(item);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: `sparklist-3day-${item.id}`,
        content: expect.objectContaining({ body: '再堅持一下，就快解鎖囉！' }),
      })
    );
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: `sparklist-unlock-${item.id}` })
    );
  });

  it('距解鎖日已經不足3天時，只排程解鎖日通知，不排程剩3天提醒', async () => {
    const item = makeItem({ unlockDate: '2026-07-16T00:00:00.000Z' });
    await notificationService.scheduleReminders(item);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: `sparklist-unlock-${item.id}` })
    );
  });

  it('解鎖日已經過去則完全不排程通知', async () => {
    const item = makeItem({ unlockDate: '2026-07-01T00:00:00.000Z' });
    await notificationService.scheduleReminders(item);

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('cancelReminders', () => {
  it('取消該單品兩則通知的排程', async () => {
    await notificationService.cancelReminders('item-1');

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('sparklist-3day-item-1');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('sparklist-unlock-item-1');
  });
});

describe('requestNotificationPermission', () => {
  it('授權成功時回傳 true', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    expect(await notificationService.requestNotificationPermission()).toBe(true);
  });

  it('未授權時回傳 false', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    expect(await notificationService.requestNotificationPermission()).toBe(false);
  });
});
