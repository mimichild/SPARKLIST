import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, act } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { __mockPlayer } from 'expo-audio';
import { useItems } from '../../hooks/useItems';
import { useAppStore } from '../../store/useAppStore';
import * as storage from '../../services/storage';
import { DEFAULT_CONDITION_LABELS } from '../../constants/conditions';
import { DEFAULT_THEME_COLOR } from '../../constants/theme';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  useAppStore.setState({
    ninjaPoints: 0,
    currentRank: '新使用者',
    conditionLabels: DEFAULT_CONDITION_LABELS,
    themeColor: DEFAULT_THEME_COLOR,
    hydrated: false,
  });
});

describe('addItem', () => {
  it('新增單品後會出現在 coolingItems，且排程通知', async () => {
    const { result } = await renderHook(() => useItems());

    await act(async () => {
      await result.current.addItem({
        name: '外套',
        photoUri: 'mock://photo.jpg',
        price: 1000,
        unlockDate: '2099-01-01T00:00:00.000Z',
      });
    });

    expect(result.current.coolingItems).toHaveLength(1);
    expect(result.current.coolingItems[0].name).toBe('外套');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });
});

describe('updateConditionChecks 觸發解鎖', () => {
  it('補勾到第 3 項且日期已過時，單品移入 unlockedItems 並播放歡呼音效', async () => {
    const { result } = await renderHook(() => useItems());

    await act(async () => {
      await result.current.addItem({
        name: '外套',
        photoUri: 'mock://photo.jpg',
        price: 1000,
        unlockDate: '2020-01-01T00:00:00.000Z',
        initialConditionChecks: [true, true, false, false, false, false],
      });
    });

    const itemId = result.current.coolingItems[0].id;

    await act(async () => {
      await result.current.updateConditionChecks(itemId, [true, true, true, false, false, false]);
    });

    expect(result.current.coolingItems).toHaveLength(0);
    expect(result.current.unlockedItems).toHaveLength(1);
    expect(__mockPlayer.play).toHaveBeenCalled();

    expect(result.current.newlyUnlockedItems).toHaveLength(1);
    expect(result.current.newlyUnlockedItems[0].id).toBe(itemId);
  });

  it('clearNewlyUnlocked 會從佇列中移除最前面那一筆', async () => {
    const { result } = await renderHook(() => useItems());

    await act(async () => {
      await result.current.addItem({
        name: '外套',
        photoUri: 'mock://photo.jpg',
        price: 1000,
        unlockDate: '2020-01-01T00:00:00.000Z',
        initialConditionChecks: [true, true, false, false, false, false],
      });
    });

    const itemId = result.current.coolingItems[0].id;

    await act(async () => {
      await result.current.updateConditionChecks(itemId, [true, true, true, false, false, false]);
    });

    expect(result.current.newlyUnlockedItems).toHaveLength(1);

    await act(async () => {
      result.current.clearNewlyUnlocked();
    });

    expect(result.current.newlyUnlockedItems).toHaveLength(0);
  });

  it('同時觸發兩次 reload()（例如 mount 與畫面 focus 幾乎同時發生）不會把同一次解鎖重複計入佇列', async () => {
    const { result } = await renderHook(() => useItems());

    await act(async () => {
      await result.current.addItem({
        name: '外套',
        photoUri: 'mock://photo.jpg',
        price: 1000,
        unlockDate: '2020-01-01T00:00:00.000Z',
        initialConditionChecks: [true, true, false, false, false, false],
      });
    });

    const itemId = result.current.coolingItems[0].id;
    await act(async () => {
      await result.current.updateConditionChecks(itemId, [true, true, true, false, false, false]);
    });
    await act(async () => {
      result.current.clearNewlyUnlocked();
    });

    // 把已解鎖的單品「手動」改回冷靜區狀態，模擬需要重新偵測一次轉換的情境，
    // 然後同時觸發兩次 reload（不 await 第一次就馬上呼叫第二次）。
    const stored = await storage.getItems();
    await storage.saveItems(stored.map((i) => (i.id === itemId ? { ...i, status: 'cooling' as const } : i)));

    await act(async () => {
      await Promise.all([result.current.reload(), result.current.reload()]);
    });

    expect(result.current.newlyUnlockedItems).toHaveLength(1);
  });
});

describe('deleteItem（忍住不買）', () => {
  it('刪除冷靜區單品會播放煙火音效、+1 忍術點數，並寫入歷史記錄', async () => {
    const { result } = await renderHook(() => useItems());

    await act(async () => {
      await result.current.addItem({
        name: '外套',
        photoUri: 'mock://photo.jpg',
        price: 1000,
        unlockDate: '2099-01-01T00:00:00.000Z',
      });
    });

    const itemId = result.current.coolingItems[0].id;

    await act(async () => {
      await result.current.deleteItem(itemId);
    });

    expect(result.current.items).toHaveLength(0);
    expect(__mockPlayer.play).toHaveBeenCalled();
    expect(useAppStore.getState().ninjaPoints).toBe(1);

    const history = await storage.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].outcome).toBe('resisted');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalled();
  });
});

describe('markPurchased', () => {
  it('標記已購買不會增加忍術點數，但會寫入歷史記錄', async () => {
    const { result } = await renderHook(() => useItems());

    await act(async () => {
      await result.current.addItem({
        name: '外套',
        photoUri: 'mock://photo.jpg',
        price: 1000,
        unlockDate: '2020-01-01T00:00:00.000Z',
        initialConditionChecks: [true, true, true, false, false, false],
      });
    });

    const itemId = result.current.unlockedItems[0].id;

    await act(async () => {
      await result.current.markPurchased(itemId);
    });

    expect(result.current.items).toHaveLength(0);
    expect(useAppStore.getState().ninjaPoints).toBe(0);

    const history = await storage.getHistory();
    expect(history[0].outcome).toBe('purchased');
  });
});

describe('coolingItems 排序', () => {
  it('冷靜區依解鎖日期由近到遠排序', async () => {
    const { result } = await renderHook(() => useItems());

    await act(async () => {
      await result.current.addItem({
        name: '較晚',
        photoUri: 'mock://photo.jpg',
        price: 100,
        unlockDate: '2099-06-01T00:00:00.000Z',
      });
      await result.current.addItem({
        name: '較早',
        photoUri: 'mock://photo.jpg',
        price: 100,
        unlockDate: '2099-01-01T00:00:00.000Z',
      });
    });

    expect(result.current.coolingItems.map((i) => i.name)).toEqual(['較早', '較晚']);
  });
});
