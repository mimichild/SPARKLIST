import type { Item, HistoryLogEntry, HistoryOutcome, HistoryStats } from '../types/item';
import { MIN_CONDITIONS_TO_UNLOCK, CONDITION_COUNT } from '../constants/conditions';

export interface CreateItemInput {
  name: string;
  photoUri: string;
  price: number;
  url?: string;
  note?: string;
  unlockDate: string;
  initialConditionChecks?: boolean[];
}

export function createItem(input: CreateItemInput): Item {
  const checks = input.initialConditionChecks ?? new Array(CONDITION_COUNT).fill(false);
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name,
    photoUri: input.photoUri,
    price: input.price,
    url: input.url,
    note: input.note,
    createdAt: new Date().toISOString(),
    unlockDate: input.unlockDate,
    conditionChecks: checks,
    status: 'cooling',
  };
}

export function countCheckedConditions(item: Item): number {
  return item.conditionChecks.filter(Boolean).length;
}

export function isUnlockable(item: Item, now: Date): boolean {
  const unlockDate = new Date(item.unlockDate);
  return now.getTime() >= unlockDate.getTime() && countCheckedConditions(item) >= MIN_CONDITIONS_TO_UNLOCK;
}

export function recalculateStatus(item: Item, now: Date): Item {
  if (item.status === 'cooling' && isUnlockable(item, now)) {
    return { ...item, status: 'unlocked' };
  }
  return item;
}

export function recalculateAllStatuses(
  items: Item[],
  now: Date
): { items: Item[]; newlyUnlockedIds: string[] } {
  const newlyUnlockedIds: string[] = [];
  const updated = items.map((item) => {
    const next = recalculateStatus(item, now);
    if (next.status === 'unlocked' && item.status === 'cooling') {
      newlyUnlockedIds.push(item.id);
    }
    return next;
  });
  return { items: updated, newlyUnlockedIds };
}

export function isNearUnlock(item: Item, now: Date, daysThreshold = 3): boolean {
  const unlockDate = new Date(item.unlockDate);
  const diffDays = (unlockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= daysThreshold;
}

export function daysUntilUnlock(item: Item, now: Date): number {
  const unlockDate = new Date(item.unlockDate);
  const diffMs = unlockDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function sortByUnlockDateAscending(items: Item[]): Item[] {
  return [...items].sort((a, b) => new Date(a.unlockDate).getTime() - new Date(b.unlockDate).getTime());
}

export function createHistoryEntry(item: Item, outcome: HistoryOutcome): HistoryLogEntry {
  return {
    id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemName: item.name,
    price: item.price,
    outcome,
    recordedAt: new Date().toISOString(),
  };
}

export function computeStats(history: HistoryLogEntry[]): HistoryStats {
  const resisted = history.filter((h) => h.outcome === 'resisted');
  const savedAmount = resisted.reduce((sum, h) => sum + h.price, 0);
  return { resistedCount: resisted.length, savedAmount };
}
