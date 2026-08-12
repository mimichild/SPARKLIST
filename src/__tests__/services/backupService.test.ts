import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as storage from '../../services/storage';
import {
  buildBackupPayload,
  buildBackupFilename,
  parseBackupPayload,
  applyBackupPayload,
  BACKUP_SCHEMA_VERSION,
  type BackupPayload,
} from '../../services/backupService';
import type { Item } from '../../types/item';

const sampleItem: Item = {
  id: 'item-1',
  name: '測試外套',
  photoUri: 'mock://document/photos/photo-1.jpg',
  photoAspectRatio: 0.75,
  price: 1000,
  createdAt: '2026-07-29T00:00:00.000Z',
  unlockDate: '2026-08-05T00:00:00.000Z',
  conditionChecks: [true, false, false, false, false, false],
  status: 'cooling',
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64-photo-content');
  (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
    uri: 'mock://resized-photo.jpg',
    width: 1280,
    height: 960,
  });
});

describe('backupService.buildBackupPayload', () => {
  it('組出包含 schemaVersion、items（含 photoBase64）、history、appState 的備份物件', async () => {
    await storage.saveItems([sampleItem]);
    await storage.saveHistory([
      { id: 'h1', itemName: '測試外套', price: 1000, outcome: 'resisted', recordedAt: '2026-07-29T00:00:00.000Z' },
    ]);
    await storage.saveAppState({
      ninjaPoints: 3,
      conditionLabels: ['a'],
      themeColor: '#EAAFB3',
      soundEnabled: true,
    });

    const { payload, skippedPhotoCount } = await buildBackupPayload();

    expect(payload.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(payload.items).toEqual([
      {
        id: 'item-1',
        name: '測試外套',
        photoBase64: 'base64-photo-content',
        photoAspectRatio: 0.75,
        price: 1000,
        createdAt: '2026-07-29T00:00:00.000Z',
        unlockDate: '2026-08-05T00:00:00.000Z',
        conditionChecks: [true, false, false, false, false, false],
        status: 'cooling',
      },
    ]);
    expect(payload.history).toHaveLength(1);
    expect(payload.appState).toEqual({
      ninjaPoints: 3,
      conditionLabels: ['a'],
      themeColor: '#EAAFB3',
      soundEnabled: true,
    });
    expect(skippedPhotoCount).toBe(0);
  });

  it('沒有單品時 items 為空陣列，appState 為 null', async () => {
    const { payload } = await buildBackupPayload();

    expect(payload.items).toEqual([]);
    expect(payload.appState).toBeNull();
  });

  it('處理每筆單品時會呼叫 onProgress 回報進度', async () => {
    await storage.saveItems([sampleItem, { ...sampleItem, id: 'item-2' }]);

    const onProgress = jest.fn();
    await buildBackupPayload(onProgress);

    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
  });

  it('讀取照片前會先用 ImageManipulator 縮圖壓縮，並讀取縮圖後檔案的 base64（不是原始 photoUri）', async () => {
    await storage.saveItems([sampleItem]);

    await buildBackupPayload();

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      sampleItem.photoUri,
      [{ resize: { width: 1280 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('mock://resized-photo.jpg', {
      encoding: FileSystem.EncodingType.Base64,
    });
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalledWith(sampleItem.photoUri, expect.anything());

    // manipulateAsync 必須發生在 readAsStringAsync 之前（用縮圖結果去讀，不是原圖）。
    const manipulateOrder = (ImageManipulator.manipulateAsync as jest.Mock).mock.invocationCallOrder[0];
    const readOrder = (FileSystem.readAsStringAsync as jest.Mock).mock.invocationCallOrder[0];
    expect(manipulateOrder).toBeLessThan(readOrder);
  });

  it('單一單品的照片檔案遺失（讀取失敗）時，該筆 photoBase64 為空字串，其餘單品照常處理，並回傳 skippedPhotoCount', async () => {
    const secondItem: Item = { ...sampleItem, id: 'item-2' };
    await storage.saveItems([sampleItem, secondItem]);

    (ImageManipulator.manipulateAsync as jest.Mock).mockImplementationOnce(() => {
      throw new Error('照片檔案不存在');
    });

    const { payload, skippedPhotoCount } = await buildBackupPayload();

    expect(payload.items).toHaveLength(2);
    expect(payload.items[0].photoBase64).toBe('');
    expect(payload.items[1].photoBase64).toBe('base64-photo-content');
    expect(skippedPhotoCount).toBe(1);
  });

  it('讀取 base64 本身失敗（而非縮圖失敗）時，也會被視為照片遺失並繼續處理', async () => {
    await storage.saveItems([sampleItem]);
    (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValueOnce(new Error('讀取失敗'));

    const { payload, skippedPhotoCount } = await buildBackupPayload();

    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].photoBase64).toBe('');
    expect(skippedPhotoCount).toBe(1);
  });
});

describe('backupService.buildBackupFilename', () => {
  it('產生 SPARKLIST-備份-yyyyMMdd-HHmm.json 格式的檔名', () => {
    const filename = buildBackupFilename(new Date('2026-08-12T15:30:00'));
    expect(filename).toBe('SPARKLIST-備份-20260812-1530.json');
  });

  it('個位數的月/日/時/分會補零', () => {
    const filename = buildBackupFilename(new Date('2026-01-05T03:07:00'));
    expect(filename).toBe('SPARKLIST-備份-20260105-0307.json');
  });
});

describe('backupService.parseBackupPayload', () => {
  const validPayload = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: '2026-08-12T10:00:00.000Z',
    appState: null,
    items: [],
    history: [],
  };

  it('解析格式正確的備份 JSON', () => {
    const payload = parseBackupPayload(JSON.stringify(validPayload));
    expect(payload).toEqual(validPayload);
  });

  it('不是合法 JSON 時拋出錯誤', () => {
    expect(() => parseBackupPayload('not valid json')).toThrow('匯入檔案不是有效的 JSON 格式');
  });

  it('缺少必要欄位時拋出錯誤', () => {
    expect(() => parseBackupPayload(JSON.stringify({ foo: 'bar' }))).toThrow('匯入檔案格式不正確');
  });

  it('schemaVersion 不相容時拋出錯誤', () => {
    const incompatible = { ...validPayload, schemaVersion: 999 };
    expect(() => parseBackupPayload(JSON.stringify(incompatible))).toThrow('不支援的備份檔版本');
  });

  it('items 或 history 不是陣列時拋出錯誤', () => {
    const invalid = { ...validPayload, items: 'not-an-array' };
    expect(() => parseBackupPayload(JSON.stringify(invalid))).toThrow('匯入檔案格式不正確');
  });

  it('items 內含 null 元素時拋出錯誤', () => {
    const invalid = { ...validPayload, items: [null] };
    expect(() => parseBackupPayload(JSON.stringify(invalid))).toThrow('匯入檔案格式不正確');
  });

  it('items 內物件缺少 photoBase64 時拋出錯誤', () => {
    const invalid = { ...validPayload, items: [{ id: 'x' }] };
    expect(() => parseBackupPayload(JSON.stringify(invalid))).toThrow('匯入檔案格式不正確');
  });

  it('items 內物件缺少 id 時拋出錯誤', () => {
    const invalid = { ...validPayload, items: [{ photoBase64: 'abc' }] };
    expect(() => parseBackupPayload(JSON.stringify(invalid))).toThrow('匯入檔案格式不正確');
  });

  it('history 內含 null 元素時拋出錯誤', () => {
    const invalid = { ...validPayload, history: [null] };
    expect(() => parseBackupPayload(JSON.stringify(invalid))).toThrow('匯入檔案格式不正確');
  });

  it('history 內物件缺少 id 時拋出錯誤', () => {
    const invalid = { ...validPayload, history: [{ itemName: '沒有 id' }] };
    expect(() => parseBackupPayload(JSON.stringify(invalid))).toThrow('匯入檔案格式不正確');
  });

  it('items/history 內元素格式正確時可正常解析', () => {
    const valid = {
      ...validPayload,
      items: [{ id: 'a', photoBase64: '' }],
      history: [{ id: 'h1' }],
    };
    expect(() => parseBackupPayload(JSON.stringify(valid))).not.toThrow();
  });
});

const existingItem: Item = {
  id: 'item-local',
  name: '本機單品',
  photoUri: 'mock://document/photos/local.jpg',
  price: 500,
  createdAt: '2026-07-01T00:00:00.000Z',
  unlockDate: '2026-07-10T00:00:00.000Z',
  conditionChecks: [false, false, false, false, false, false],
  status: 'cooling',
};

function buildTestPayload(overrides: Partial<BackupPayload> = {}): BackupPayload {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: '2026-08-12T10:00:00.000Z',
    appState: { ninjaPoints: 9, conditionLabels: ['x'], themeColor: '#111111', soundEnabled: false },
    items: [
      {
        id: 'item-local',
        name: '匯入版本的名稱',
        photoBase64: 'incoming-base64',
        price: 999,
        createdAt: '2026-08-01T00:00:00.000Z',
        unlockDate: '2026-08-08T00:00:00.000Z',
        conditionChecks: [true, true, false, false, false, false],
        status: 'cooling',
      },
    ],
    history: [
      { id: 'h-imported', itemName: '匯入版本的名稱', price: 999, outcome: 'resisted', recordedAt: '2026-08-01T00:00:00.000Z' },
    ],
    ...overrides,
  };
}

describe('backupService.applyBackupPayload - 覆蓋模式', () => {
  it('整批取代 items、history、appState', async () => {
    await storage.saveItems([existingItem]);
    await storage.saveHistory([
      { id: 'h-local', itemName: '本機單品', price: 500, outcome: 'resisted', recordedAt: '2026-07-01T00:00:00.000Z' },
    ]);

    const result = await applyBackupPayload(buildTestPayload(), 'overwrite');

    const savedItems = await storage.getItems();
    expect(savedItems).toHaveLength(1);
    expect(savedItems[0].name).toBe('匯入版本的名稱');
    expect(savedItems[0].photoUri).toMatch(/^mock:\/\/document\/photos\/photo-.+/);

    const savedHistory = await storage.getHistory();
    expect(savedHistory).toEqual([
      { id: 'h-imported', itemName: '匯入版本的名稱', price: 999, outcome: 'resisted', recordedAt: '2026-08-01T00:00:00.000Z' },
    ]);

    expect(await storage.getAppState()).toEqual({
      ninjaPoints: 9,
      conditionLabels: ['x'],
      themeColor: '#111111',
      soundEnabled: false,
    });
    expect(result.importedItemCount).toBe(1);
  });
});

describe('backupService.applyBackupPayload - 合併模式', () => {
  it('id 相同時以匯入檔為準覆蓋，本機獨有的 id 保留，appState 維持本機原值', async () => {
    await storage.saveAppState({
      ninjaPoints: 1,
      conditionLabels: ['本機'],
      themeColor: '#EAAFB3',
      soundEnabled: true,
    });
    await storage.saveItems([existingItem, { ...existingItem, id: 'item-local-only', name: '本機獨有' }]);
    await storage.saveHistory([
      { id: 'h-local-only', itemName: '本機獨有', price: 200, outcome: 'resisted', recordedAt: '2026-06-01T00:00:00.000Z' },
    ]);

    await applyBackupPayload(buildTestPayload(), 'merge');

    const savedItems = await storage.getItems();
    expect(savedItems.map((i) => i.id).sort()).toEqual(['item-local', 'item-local-only'].sort());
    expect(savedItems.find((i) => i.id === 'item-local')?.name).toBe('匯入版本的名稱');
    expect(savedItems.find((i) => i.id === 'item-local-only')?.name).toBe('本機獨有');

    const savedHistory = await storage.getHistory();
    expect(savedHistory.map((h) => h.id).sort()).toEqual(['h-imported', 'h-local-only'].sort());

    expect(await storage.getAppState()).toEqual({
      ninjaPoints: 1,
      conditionLabels: ['本機'],
      themeColor: '#EAAFB3',
      soundEnabled: true,
    });
  });
});

describe('backupService.applyBackupPayload - 進度回呼', () => {
  it('每寫回一筆照片就呼叫 onProgress', async () => {
    const payload = buildTestPayload({
      items: [
        {
          id: 'a',
          name: 'A',
          photoBase64: 'x',
          price: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          unlockDate: '2026-01-02T00:00:00.000Z',
          conditionChecks: [false, false, false, false, false, false],
          status: 'cooling',
        },
        {
          id: 'b',
          name: 'B',
          photoBase64: 'y',
          price: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          unlockDate: '2026-01-02T00:00:00.000Z',
          conditionChecks: [false, false, false, false, false, false],
          status: 'cooling',
        },
      ],
    });
    const onProgress = jest.fn();

    await applyBackupPayload(payload, 'overwrite', onProgress);

    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
  });
});

describe('backupService.applyBackupPayload - 照片遺失（photoBase64 為空字串）', () => {
  it('不呼叫寫入照片檔案，直接給予空字串 photoUri，不中斷其餘處理', async () => {
    const payload = buildTestPayload({
      items: [
        {
          id: 'no-photo',
          name: '照片已遺失的單品',
          photoBase64: '',
          price: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          unlockDate: '2026-01-02T00:00:00.000Z',
          conditionChecks: [false, false, false, false, false, false],
          status: 'cooling',
        },
      ],
    });

    const result = await applyBackupPayload(payload, 'overwrite');

    const savedItems = await storage.getItems();
    expect(savedItems).toHaveLength(1);
    expect(savedItems[0].photoUri).toBe('');
    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
    expect(result.importedItemCount).toBe(1);
  });
});

describe('backupService round trip：buildBackupPayload → JSON.stringify → parseBackupPayload → applyBackupPayload', () => {
  it('匯出後再以覆蓋模式匯入，能還原原始資料（photoUri 允許不同，改為指向本機新產生的照片檔案）', async () => {
    await storage.saveItems([sampleItem]);
    await storage.saveHistory([
      { id: 'h1', itemName: '測試外套', price: 1000, outcome: 'resisted', recordedAt: '2026-07-29T00:00:00.000Z' },
    ]);
    await storage.saveAppState({
      ninjaPoints: 3,
      conditionLabels: ['a'],
      themeColor: '#EAAFB3',
      soundEnabled: true,
    });

    const { payload } = await buildBackupPayload();
    const raw = JSON.stringify(payload);
    const parsed = parseBackupPayload(raw);

    await applyBackupPayload(parsed, 'overwrite');

    const savedItems = await storage.getItems();
    expect(savedItems).toHaveLength(1);
    expect(typeof savedItems[0].photoUri).toBe('string');
    expect(savedItems[0].photoUri.length).toBeGreaterThan(0);
    expect(savedItems[0].photoUri).not.toBe(sampleItem.photoUri);
    expect(savedItems[0].photoUri).toMatch(/^mock:\/\/document\/photos\//);
    expect(savedItems[0]).toEqual({ ...sampleItem, photoUri: savedItems[0].photoUri });

    const savedHistory = await storage.getHistory();
    expect(savedHistory).toEqual([
      { id: 'h1', itemName: '測試外套', price: 1000, outcome: 'resisted', recordedAt: '2026-07-29T00:00:00.000Z' },
    ]);

    expect(await storage.getAppState()).toEqual({
      ninjaPoints: 3,
      conditionLabels: ['a'],
      themeColor: '#EAAFB3',
      soundEnabled: true,
    });
  });
});
