import * as itemService from '../../services/itemService';
import type { Item } from '../../types/item';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    name: '測試外套',
    photoUri: 'mock://photo.jpg',
    price: 1000,
    createdAt: '2026-07-01T00:00:00.000Z',
    unlockDate: '2026-07-10T00:00:00.000Z',
    conditionChecks: [false, false, false, false, false, false],
    status: 'cooling',
    ...overrides,
  };
}

describe('createItem', () => {
  it('建立的單品狀態預設為 cooling，且有唯一 id', () => {
    const item = itemService.createItem({
      name: '外套',
      photoUri: 'mock://photo.jpg',
      price: 1000,
      unlockDate: '2026-08-01T00:00:00.000Z',
    });
    expect(item.status).toBe('cooling');
    expect(item.id).toBeTruthy();
    expect(item.conditionChecks).toEqual([false, false, false, false, false, false]);
  });

  it('可以帶入初始勾選狀態', () => {
    const item = itemService.createItem({
      name: '外套',
      photoUri: 'mock://photo.jpg',
      price: 1000,
      unlockDate: '2026-08-01T00:00:00.000Z',
      initialConditionChecks: [true, true, false, false, false, false],
    });
    expect(item.conditionChecks).toEqual([true, true, false, false, false, false]);
  });
});

describe('countCheckedConditions', () => {
  it('計算勾選數量', () => {
    const item = makeItem({ conditionChecks: [true, true, true, false, false, false] });
    expect(itemService.countCheckedConditions(item)).toBe(3);
  });
});

describe('isUnlockable', () => {
  it('日期未到，即使勾滿 3 項也不能解鎖', () => {
    const item = makeItem({
      unlockDate: '2026-08-01T00:00:00.000Z',
      conditionChecks: [true, true, true, false, false, false],
    });
    expect(itemService.isUnlockable(item, new Date('2026-07-15T00:00:00.000Z'))).toBe(false);
  });

  it('日期已過，但勾選數不足 3 項不能解鎖', () => {
    const item = makeItem({
      unlockDate: '2026-07-01T00:00:00.000Z',
      conditionChecks: [true, true, false, false, false, false],
    });
    expect(itemService.isUnlockable(item, new Date('2026-07-15T00:00:00.000Z'))).toBe(false);
  });

  it('日期已過且勾滿 3 項可以解鎖', () => {
    const item = makeItem({
      unlockDate: '2026-07-01T00:00:00.000Z',
      conditionChecks: [true, true, true, false, false, false],
    });
    expect(itemService.isUnlockable(item, new Date('2026-07-15T00:00:00.000Z'))).toBe(true);
  });

  it('日期恰好等於現在，且勾滿 3 項可以解鎖（邊界值）', () => {
    const item = makeItem({
      unlockDate: '2026-07-15T00:00:00.000Z',
      conditionChecks: [true, true, true, false, false, false],
    });
    expect(itemService.isUnlockable(item, new Date('2026-07-15T00:00:00.000Z'))).toBe(true);
  });
});

describe('recalculateStatus / recalculateAllStatuses', () => {
  it('符合解鎖條件時狀態從 cooling 轉為 unlocked', () => {
    const item = makeItem({
      unlockDate: '2026-07-01T00:00:00.000Z',
      conditionChecks: [true, true, true, false, false, false],
    });
    const result = itemService.recalculateStatus(item, new Date('2026-07-15T00:00:00.000Z'));
    expect(result.status).toBe('unlocked');
  });

  it('不符合解鎖條件時狀態維持 cooling', () => {
    const item = makeItem();
    const result = itemService.recalculateStatus(item, new Date('2026-07-15T00:00:00.000Z'));
    expect(result.status).toBe('cooling');
  });

  it('recalculateAllStatuses 回傳新解鎖的 id 清單', () => {
    const willUnlock = makeItem({
      id: 'item-unlock',
      unlockDate: '2026-07-01T00:00:00.000Z',
      conditionChecks: [true, true, true, false, false, false],
    });
    const staysLocked = makeItem({
      id: 'item-cooling',
      unlockDate: '2026-08-01T00:00:00.000Z',
    });
    const { items, newlyUnlockedIds } = itemService.recalculateAllStatuses(
      [willUnlock, staysLocked],
      new Date('2026-07-15T00:00:00.000Z')
    );
    expect(newlyUnlockedIds).toEqual(['item-unlock']);
    expect(items.find((i) => i.id === 'item-unlock')?.status).toBe('unlocked');
    expect(items.find((i) => i.id === 'item-cooling')?.status).toBe('cooling');
  });

  it('已經是 unlocked 的單品不會再被視為「新解鎖」', () => {
    const alreadyUnlocked = makeItem({
      id: 'item-already',
      status: 'unlocked',
      unlockDate: '2026-07-01T00:00:00.000Z',
      conditionChecks: [true, true, true, false, false, false],
    });
    const { newlyUnlockedIds } = itemService.recalculateAllStatuses(
      [alreadyUnlocked],
      new Date('2026-07-15T00:00:00.000Z')
    );
    expect(newlyUnlockedIds).toEqual([]);
  });
});

describe('isNearUnlock', () => {
  it('剩不到 3 天且尚未解鎖時回傳 true', () => {
    const item = makeItem({ unlockDate: '2026-07-17T00:00:00.000Z' });
    expect(itemService.isNearUnlock(item, new Date('2026-07-15T00:00:00.000Z'))).toBe(true);
  });

  it('剩超過 3 天時回傳 false', () => {
    const item = makeItem({ unlockDate: '2026-07-25T00:00:00.000Z' });
    expect(itemService.isNearUnlock(item, new Date('2026-07-15T00:00:00.000Z'))).toBe(false);
  });

  it('已經過期時回傳 false（不是「快解鎖」而是「已解鎖」）', () => {
    const item = makeItem({ unlockDate: '2026-07-01T00:00:00.000Z' });
    expect(itemService.isNearUnlock(item, new Date('2026-07-15T00:00:00.000Z'))).toBe(false);
  });
});

describe('daysUntilUnlock', () => {
  it('計算距離解鎖日的天數（無條件進位）', () => {
    const item = makeItem({ unlockDate: '2026-07-17T12:00:00.000Z' });
    expect(itemService.daysUntilUnlock(item, new Date('2026-07-15T00:00:00.000Z'))).toBe(3);
  });
});

describe('sortByUnlockDateAscending', () => {
  it('依解鎖日期由近到遠排序', () => {
    const later = makeItem({ id: 'later', unlockDate: '2026-09-01T00:00:00.000Z' });
    const sooner = makeItem({ id: 'sooner', unlockDate: '2026-08-01T00:00:00.000Z' });
    const sorted = itemService.sortByUnlockDateAscending([later, sooner]);
    expect(sorted.map((i) => i.id)).toEqual(['sooner', 'later']);
  });
});

describe('createHistoryEntry / computeStats', () => {
  it('建立歷史記錄快照名稱與價格', () => {
    const item = makeItem({ name: '外套', price: 1500 });
    const entry = itemService.createHistoryEntry(item, 'resisted');
    expect(entry.itemName).toBe('外套');
    expect(entry.price).toBe(1500);
    expect(entry.outcome).toBe('resisted');
  });

  it('computeStats 只加總 resisted 的金額與次數', () => {
    const history = [
      itemService.createHistoryEntry(makeItem({ name: 'A', price: 100 }), 'resisted'),
      itemService.createHistoryEntry(makeItem({ name: 'B', price: 200 }), 'purchased'),
      itemService.createHistoryEntry(makeItem({ name: 'C', price: 300 }), 'resisted'),
    ];
    const stats = itemService.computeStats(history);
    expect(stats.resistedCount).toBe(2);
    expect(stats.savedAmount).toBe(400);
  });
});
