import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Item, HistoryLogEntry } from '../types/item';

const ITEMS_KEY = 'sparklist:items';
const HISTORY_KEY = 'sparklist:history';
const APP_STATE_KEY = 'sparklist:appState';

export interface PersistedAppState {
  ninjaPoints: number;
  conditionLabels: string[];
  themeColor: string;
  // Optional so state persisted before this setting existed still parses;
  // callers should treat a missing value as sound enabled (the prior behavior).
  soundEnabled?: boolean;
}

export async function getItems(): Promise<Item[]> {
  try {
    const raw = await AsyncStorage.getItem(ITEMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Failed to read or parse items from AsyncStorage:', error);
    return [];
  }
}

export async function saveItems(items: Item[]): Promise<void> {
  await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

export async function getHistory(): Promise<HistoryLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Failed to read or parse history from AsyncStorage:', error);
    return [];
  }
}

export async function saveHistory(history: HistoryLogEntry[]): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export async function getAppState(): Promise<PersistedAppState | null> {
  try {
    const raw = await AsyncStorage.getItem(APP_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Failed to read or parse appState from AsyncStorage:', error);
    return null;
  }
}

export async function saveAppState(state: PersistedAppState): Promise<void> {
  await AsyncStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
}
