export type ItemStatus = 'cooling' | 'unlocked';
export type HistoryOutcome = 'purchased' | 'resisted';

export interface Item {
  id: string;
  name: string;
  photoUri: string;
  // Captured from the picked photo's own dimensions at selection time, so
  // the UI can display it at its original ratio (3:4, 4:3, 1:1, ...)
  // without ever needing a native image-size probe at render time.
  photoAspectRatio?: number;
  price: number;
  url?: string;
  note?: string;
  createdAt: string;
  unlockDate: string;
  conditionChecks: boolean[];
  status: ItemStatus;
}

export interface HistoryLogEntry {
  id: string;
  itemName: string;
  price: number;
  outcome: HistoryOutcome;
  recordedAt: string;
}

export interface HistoryStats {
  resistedCount: number;
  savedAmount: number;
}
