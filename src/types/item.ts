export type ItemStatus = 'cooling' | 'unlocked';
export type HistoryOutcome = 'purchased' | 'resisted';

export interface Item {
  id: string;
  name: string;
  photoUri: string;
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
