import * as FileSystem from 'expo-file-system/legacy';
import * as storage from './storage';
import type { PersistedAppState } from './storage';
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
