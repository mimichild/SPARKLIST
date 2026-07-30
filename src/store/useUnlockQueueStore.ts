import { create } from 'zustand';
import type { Item } from '../types/item';

interface UnlockQueueState {
  // Items that just transitioned cooling -> unlocked, for the celebration
  // modal to show. This has to live outside useItems() itself: each screen
  // that calls useItems() gets its own independent hook instance, so
  // whichever screen's reload() happens to detect the transition needs to
  // hand it off somewhere every screen can see — not just its own local
  // state. Cleared one at a time via clearNewlyUnlocked() so multiple
  // simultaneous unlocks show in sequence.
  newlyUnlockedItems: Item[];
  pushUnlocked: (items: Item[]) => void;
  clearNewlyUnlocked: () => void;
}

export const useUnlockQueueStore = create<UnlockQueueState>((set) => ({
  newlyUnlockedItems: [],
  pushUnlocked: (items) =>
    set((state) => ({ newlyUnlockedItems: [...state.newlyUnlockedItems, ...items] })),
  clearNewlyUnlocked: () => set((state) => ({ newlyUnlockedItems: state.newlyUnlockedItems.slice(1) })),
}));
