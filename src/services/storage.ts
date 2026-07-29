import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Item, HistoryLogEntry } from '../types/item';

const ITEMS_KEY = 'sparklist:items';
const HISTORY_KEY = 'sparklist:history';
const APP_STATE_KEY = 'sparklist:appState';

export interface PersistedAppState {
  ninjaPoints: number;
  conditionLabels: string[];
  themeColor: string;
}

export async function getItems(): Promise<Item[]> {
  const raw = await AsyncStorage.getItem(ITEMS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveItems(items: Item[]): Promise<void> {
  await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

export async function getHistory(): Promise<HistoryLogEntry[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveHistory(history: HistoryLogEntry[]): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export async function getAppState(): Promise<PersistedAppState | null> {
  const raw = await AsyncStorage.getItem(APP_STATE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveAppState(state: PersistedAppState): Promise<void> {
  await AsyncStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
}
