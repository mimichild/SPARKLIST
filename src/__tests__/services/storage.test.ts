import AsyncStorage from '@react-native-async-storage/async-storage';
import * as storage from '../../services/storage';
import type { Item, HistoryLogEntry } from '../../types/item';

const sampleItem: Item = {
  id: 'item-1',
  name: '測試外套',
  photoUri: 'mock://photo.jpg',
  price: 1000,
  createdAt: '2026-07-29T00:00:00.000Z',
  unlockDate: '2026-08-05T00:00:00.000Z',
  conditionChecks: [true, false, false, false, false, false],
  status: 'cooling',
};

const sampleHistory: HistoryLogEntry = {
  id: 'history-1',
  itemName: '測試外套',
  price: 1000,
  outcome: 'resisted',
  recordedAt: '2026-07-29T00:00:00.000Z',
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('storage service', () => {
  it('沒有資料時 getItems 回傳空陣列', async () => {
    expect(await storage.getItems()).toEqual([]);
  });

  it('saveItems 後 getItems 可以讀回相同資料', async () => {
    await storage.saveItems([sampleItem]);
    expect(await storage.getItems()).toEqual([sampleItem]);
  });

  it('沒有資料時 getHistory 回傳空陣列', async () => {
    expect(await storage.getHistory()).toEqual([]);
  });

  it('saveHistory 後 getHistory 可以讀回相同資料', async () => {
    await storage.saveHistory([sampleHistory]);
    expect(await storage.getHistory()).toEqual([sampleHistory]);
  });

  it('沒有資料時 getAppState 回傳 null', async () => {
    expect(await storage.getAppState()).toBeNull();
  });

  it('saveAppState 後 getAppState 可以讀回相同資料', async () => {
    const state = { ninjaPoints: 5, conditionLabels: ['a', 'b'], themeColor: '#FF6B6B' };
    await storage.saveAppState(state);
    expect(await storage.getAppState()).toEqual(state);
  });
});
