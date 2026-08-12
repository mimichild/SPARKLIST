import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as storage from './storage';
import type { PersistedAppState } from './storage';
import { persistPhotoFromBase64Async } from './photoStorageService';
import type { Item, HistoryLogEntry } from '../types/item';

export const BACKUP_SCHEMA_VERSION = 1;

export type BackupItem = Omit<Item, 'photoUri'> & { photoBase64: string };

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  appState: PersistedAppState | null;
  items: BackupItem[];
  history: HistoryLogEntry[];
}

export interface BuildBackupPayloadResult {
  payload: BackupPayload;
  // 舊資料裡有些單品的 photoUri 指向已經不存在的檔案（歷史 bug，已修，但舊
  // 資料可能還留著壞路徑）。匯出時遇到讀不到的照片不會整包匯出失敗，只會
  // 略過該筆的照片內容，這裡回報略過張數讓 UI 可以提示使用者。
  skippedPhotoCount: number;
}

// 匯出用的照片會先縮圖壓縮（寬度 1280、JPEG 品質 0.7）再轉 base64，避免原始
// 相機解析度的照片在一次匯出多筆時把整個 App 記憶體用量推到被系統關閉。
// 只影響匯出檔內的照片副本，不會覆寫或動到本機正式使用的原始照片檔案。
const EXPORT_PHOTO_MAX_WIDTH = 1280;
const EXPORT_PHOTO_COMPRESS_QUALITY = 0.7;

export async function buildBackupPayload(
  onProgress?: (current: number, total: number) => void
): Promise<BuildBackupPayloadResult> {
  const [items, history, appState] = await Promise.all([
    storage.getItems(),
    storage.getHistory(),
    storage.getAppState(),
  ]);

  const total = items.length;
  const backupItems: BackupItem[] = [];
  let skippedPhotoCount = 0;

  for (let i = 0; i < items.length; i += 1) {
    const { photoUri, ...rest } = items[i];
    let photoBase64 = '';
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: EXPORT_PHOTO_MAX_WIDTH } }],
        { compress: EXPORT_PHOTO_COMPRESS_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
      );
      photoBase64 = await FileSystem.readAsStringAsync(manipulated.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      // 照片檔案遺失或縮圖失敗：不中斷整個匯出，該筆照片以空字串代替。
      skippedPhotoCount += 1;
      photoBase64 = '';
    }
    backupItems.push({ ...rest, photoBase64 });
    onProgress?.(i + 1, total);
  }

  return {
    payload: {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      appState,
      items: backupItems,
      history,
    },
    skippedPhotoCount,
  };
}

export function buildBackupFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `SPARKLIST-備份-${y}${m}${d}-${hh}${mm}.json`;
}

export function parseBackupPayload(raw: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('匯入檔案不是有效的 JSON 格式');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('schemaVersion' in parsed) ||
    !('items' in parsed) ||
    !('history' in parsed)
  ) {
    throw new Error('匯入檔案格式不正確');
  }

  const payload = parsed as BackupPayload;

  if (!Array.isArray(payload.items) || !Array.isArray(payload.history)) {
    throw new Error('匯入檔案格式不正確');
  }

  for (const item of payload.items) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof (item as Partial<BackupItem>).id !== 'string' ||
      typeof (item as Partial<BackupItem>).photoBase64 !== 'string'
    ) {
      throw new Error('匯入檔案格式不正確');
    }
  }

  for (const entry of payload.history) {
    if (typeof entry !== 'object' || entry === null || typeof (entry as Partial<HistoryLogEntry>).id !== 'string') {
      throw new Error('匯入檔案格式不正確');
    }
  }

  if (payload.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error(`不支援的備份檔版本（schemaVersion: ${payload.schemaVersion}）`);
  }

  return payload;
}

export type ImportMode = 'overwrite' | 'merge';

export interface ApplyBackupResult {
  importedItemCount: number;
}

export async function applyBackupPayload(
  payload: BackupPayload,
  mode: ImportMode,
  onProgress?: (current: number, total: number) => void
): Promise<ApplyBackupResult> {
  const total = payload.items.length;
  const restoredItems: Item[] = [];

  for (let i = 0; i < payload.items.length; i += 1) {
    const { photoBase64, ...rest } = payload.items[i];
    // 空字串代表匯出時該筆照片已遺失（見 buildBackupPayload 的
    // skippedPhotoCount），不能寫成一個內容是空字串的「照片」檔案，
    // 直接給空字串 photoUri（沿用現有 UI 對缺照片的容忍度）。
    const photoUri = photoBase64 ? await persistPhotoFromBase64Async(photoBase64) : '';
    restoredItems.push({ ...rest, photoUri });
    onProgress?.(i + 1, total);
  }

  let finalItems: Item[];
  let finalHistory: HistoryLogEntry[];

  if (mode === 'overwrite') {
    finalItems = restoredItems;
    finalHistory = payload.history;
  } else {
    const existingItems = await storage.getItems();
    const existingHistory = await storage.getHistory();
    finalItems = mergeById(existingItems, restoredItems);
    finalHistory = mergeById(existingHistory, payload.history);
  }

  await storage.saveItems(finalItems);
  await storage.saveHistory(finalHistory);

  if (mode === 'overwrite' && payload.appState) {
    await storage.saveAppState(payload.appState);
  }

  return { importedItemCount: restoredItems.length };
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const incomingIds = new Set(incoming.map((entry) => entry.id));
  const keptExisting = existing.filter((entry) => !incomingIds.has(entry.id));
  return [...keptExisting, ...incoming];
}
