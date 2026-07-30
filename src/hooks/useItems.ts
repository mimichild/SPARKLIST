import { useState, useCallback, useEffect, useRef } from 'react';
import * as storage from '../services/storage';
import * as itemService from '../services/itemService';
import * as notificationService from '../services/notificationService';
import * as audioService from '../services/audioService';
import { useAppStore } from '../store/useAppStore';
import type { Item } from '../types/item';
import type { CreateItemInput } from '../services/itemService';

export function useItems() {
  const [items, setItemsState] = useState<Item[]>([]);
  // Mirrors `items` synchronously so mutating functions always read the
  // latest list even if called back-to-back before React re-renders
  // (avoids stale-closure bugs when e.g. addItem() is awaited twice in a row).
  const itemsRef = useRef<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const addNinjaPoint = useAppStore((s) => s.addNinjaPoint);

  const setItems = useCallback((next: Item[]) => {
    itemsRef.current = next;
    setItemsState(next);
  }, []);

  const reload = useCallback(async () => {
    const stored = await storage.getItems();
    const { items: recalculated, newlyUnlockedIds } = itemService.recalculateAllStatuses(stored, new Date());

    if (newlyUnlockedIds.length > 0) {
      await storage.saveItems(recalculated);
      audioService.playCheer();
    }

    setItems(recalculated);
    setLoaded(true);
  }, [setItems]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addItem = useCallback(async (input: CreateItemInput) => {
    const created = itemService.createItem(input);
    // An item can already satisfy its unlock conditions at creation time
    // (e.g. a past unlockDate plus enough pre-checked conditions), so
    // recalculate its status immediately rather than assuming 'cooling'.
    const newItem = itemService.recalculateStatus(created, new Date());
    const next = [...itemsRef.current, newItem];
    setItems(next);
    await storage.saveItems(next);
    await notificationService.scheduleReminders(newItem);
  }, [setItems]);

  const updateItem = useCallback(
    async (itemId: string, patch: Partial<Pick<Item, 'name' | 'price' | 'url' | 'note' | 'photoUri' | 'conditionChecks'>>) => {
      const next = itemsRef.current.map((i) => (i.id === itemId ? { ...i, ...patch } : i));
      await storage.saveItems(next);
      await reload();
    },
    [reload]
  );

  const updateConditionChecks = useCallback(
    (itemId: string, conditionChecks: boolean[]) => updateItem(itemId, { conditionChecks }),
    [updateItem]
  );

  const updateUnlockDate = useCallback(async (itemId: string, unlockDate: string) => {
    const next = itemsRef.current.map((i) => (i.id === itemId ? { ...i, unlockDate } : i));
    await storage.saveItems(next);
    await notificationService.cancelReminders(itemId);
    const updatedItem = next.find((i) => i.id === itemId);
    if (updatedItem) {
      await notificationService.scheduleReminders(updatedItem);
    }
    await reload();
  }, [reload]);

  const resolveItem = useCallback(async (itemId: string, outcome: 'purchased' | 'resisted') => {
    const target = itemsRef.current.find((i) => i.id === itemId);
    if (!target) return;

    const entry = itemService.createHistoryEntry(target, outcome);
    const history = await storage.getHistory();
    await storage.saveHistory([...history, entry]);

    const next = itemsRef.current.filter((i) => i.id !== itemId);
    setItems(next);
    await storage.saveItems(next);
    await notificationService.cancelReminders(itemId);

    if (outcome === 'resisted') {
      audioService.playFireworks();
      await addNinjaPoint();
    }
  }, [setItems, addNinjaPoint]);

  const deleteItem = useCallback((itemId: string) => resolveItem(itemId, 'resisted'), [resolveItem]);
  const markPurchased = useCallback((itemId: string) => resolveItem(itemId, 'purchased'), [resolveItem]);

  return {
    items,
    loaded,
    coolingItems: itemService.sortByUnlockDateAscending(items.filter((i) => i.status === 'cooling')),
    unlockedItems: items.filter((i) => i.status === 'unlocked'),
    reload,
    addItem,
    updateItem,
    updateConditionChecks,
    updateUnlockDate,
    deleteItem,
    markPurchased,
  };
}
