import { create } from 'zustand';
import * as storage from '../services/storage';
import { computeRank } from '../services/badgeService';
import { DEFAULT_CONDITION_LABELS } from '../constants/conditions';
import { DEFAULT_THEME_COLOR } from '../constants/theme';
import type { RankName } from '../constants/rank';

interface AppState {
  ninjaPoints: number;
  currentRank: RankName;
  conditionLabels: string[];
  themeColor: string;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addNinjaPoint: () => Promise<void>;
  setConditionLabels: (labels: string[]) => Promise<void>;
  setThemeColor: (color: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  ninjaPoints: 0,
  currentRank: computeRank(0),
  conditionLabels: DEFAULT_CONDITION_LABELS,
  themeColor: DEFAULT_THEME_COLOR,
  hydrated: false,

  hydrate: async () => {
    const persisted = await storage.getAppState();
    if (persisted) {
      set({
        ninjaPoints: persisted.ninjaPoints,
        currentRank: computeRank(persisted.ninjaPoints),
        conditionLabels: persisted.conditionLabels,
        themeColor: persisted.themeColor,
        hydrated: true,
      });
    } else {
      set({ hydrated: true });
    }
  },

  addNinjaPoint: async () => {
    const nextPoints = get().ninjaPoints + 1;
    set({ ninjaPoints: nextPoints, currentRank: computeRank(nextPoints) });
    await storage.saveAppState({
      ninjaPoints: nextPoints,
      conditionLabels: get().conditionLabels,
      themeColor: get().themeColor,
    });
  },

  setConditionLabels: async (labels: string[]) => {
    set({ conditionLabels: labels });
    await storage.saveAppState({
      ninjaPoints: get().ninjaPoints,
      conditionLabels: labels,
      themeColor: get().themeColor,
    });
  },

  setThemeColor: async (color: string) => {
    set({ themeColor: color });
    await storage.saveAppState({
      ninjaPoints: get().ninjaPoints,
      conditionLabels: get().conditionLabels,
      themeColor: color,
    });
  },
}));
