import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as storage from '../../services/storage';
import { buildBackupPayload, buildBackupFilename, parseBackupPayload, BACKUP_SCHEMA_VERSION } from '../../services/backupService';
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

    const payload = await buildBackupPayload();

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
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(sampleItem.photoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  });

  it('沒有單品時 items 為空陣列，appState 為 null', async () => {
    const payload = await buildBackupPayload();

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
});
