import { useCallback, useEffect, useRef, useState } from 'react';
import * as storage from '../services/storage';
import * as itemService from '../services/itemService';
import * as notificationService from '../services/notificationService';
import * as audioService from '../services/audioService';
import { useAppStore } from '../store/useAppStore';
import { useUnlockQueueStore } from '../store/useUnlockQueueStore';
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
  const newlyUnlockedItems = useUnlockQueueStore((s) => s.newlyUnlockedItems);
  const pushUnlocked = useUnlockQueueStore((s) => s.pushUnlocked);
  const clearNewlyUnlocked = useUnlockQueueStore((s) => s.clearNewlyUnlocked);
  // useItems() reloads once on its own mount (effect below) AND screens
  // typically also reload on focus, which fires at essentially the same
  // moment as mount. Without this guard, both calls race to read storage
  // before either writes the recalculated status back, so both detect the
  // same cooling->unlocked transition and double-count it (duplicate cheer
  // sound, duplicate celebration modal entry). A concurrent call instead
  // just awaits the in-flight one.
  const reloadPromiseRef = useRef<Promise<void> | null>(null);

  const setItems = useCallback((next: Item[]) => {
    itemsRef.current = next;
    setItemsState(next);
  }, []);

  const reload = useCallback(async () => {
    if (reloadPromiseRef.current) {
      return reloadPromiseRef.current;
    }

    const promise = (async () => {
      const stored = await storage.getItems();
      const { items: recalculated, newlyUnlockedIds } = itemService.recalculateAllStatuses(stored, new Date());

      if (newlyUnlockedIds.length > 0) {
        await storage.saveItems(recalculated);
        audioService.playCheer();
        const unlockedIdSet = new Set(newlyUnlockedIds);
        pushUnlocked(recalculated.filter((i) => unlockedIdSet.has(i.id)));
      }

      setItems(recalculated);
      setLoaded(true);
    })();

    reloadPromiseRef.current = promise;
    try {
      await promise;
    } finally {
      reloadPromiseRef.current = null;
    }
  }, [setItems, pushUnlocked]);

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
    async (
      itemId: string,
      patch: Partial<
        Pick<Item, 'name' | 'price' | 'url' | 'note' | 'photoUri' | 'photoAspectRatio' | 'conditionChecks' | 'unlockDate'>
      >
    ) => {
      const next = itemsRef.current.map((i) => (i.id === itemId ? { ...i, ...patch } : i));
      await storage.saveItems(next);

      // Changing the unlock date invalidates any reminders scheduled
      // against the old one, so they need to be cancelled and rescheduled.
      if (patch.unlockDate !== undefined) {
        await notificationService.cancelReminders(itemId);
        const updatedItem = next.find((i) => i.id === itemId);
        if (updatedItem) {
          await notificationService.scheduleReminders(updatedItem);
        }
      }

      await reload();
    },
    [reload]
  );

  const updateConditionChecks = useCallback(
    (itemId: string, conditionChecks: boolean[]) => updateItem(itemId, { conditionChecks }),
    [updateItem]
  );

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
    } else {
      audioService.playApplause();
    }
  }, [setItems, addNinjaPoint]);

  const deleteItem = useCallback((itemId: string) => resolveItem(itemId, 'resisted'), [resolveItem]);
  const markPurchased = useCallback((itemId: string) => resolveItem(itemId, 'purchased'), [resolveItem]);

  return {
    items,
    loaded,
    coolingItems: itemService.sortByUnlockDateAscending(items.filter((i) => i.status === 'cooling')),
    unlockedItems: items.filter((i) => i.status === 'unlocked'),
    newlyUnlockedItems,
    clearNewlyUnlocked,
    reload,
    addItem,
    updateItem,
    updateConditionChecks,
    deleteItem,
    markPurchased,
  };
}
