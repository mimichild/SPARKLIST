import * as FileSystem from 'expo-file-system/legacy';
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

export async function buildBackupPayload(
  onProgress?: (current: number, total: number) => void
): Promise<BackupPayload> {
  const [items, history, appState] = await Promise.all([
    storage.getItems(),
    storage.getHistory(),
    storage.getAppState(),
  ]);

  const total = items.length;
  const backupItems: BackupItem[] = [];

  for (let i = 0; i < items.length; i += 1) {
    const { photoUri, ...rest } = items[i];
    const photoBase64 = await FileSystem.readAsStringAsync(photoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    backupItems.push({ ...rest, photoBase64 });
    onProgress?.(i + 1, total);
  }

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appState,
    items: backupItems,
    history,
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
    const photoUri = await persistPhotoFromBase64Async(photoBase64);
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
