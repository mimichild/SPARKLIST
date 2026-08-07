import AsyncStorage from '@react-native-async-storage/async-storage';
import { act } from '@testing-library/react-native';
import { useAppStore } from '../../store/useAppStore';
import * as storage from '../../services/storage';
import { DEFAULT_CONDITION_LABELS } from '../../constants/conditions';
import { DEFAULT_THEME_COLOR } from '../../constants/theme';

beforeEach(async () => {
  await AsyncStorage.clear();
  useAppStore.setState({
    ninjaPoints: 0,
    currentRank: '新使用者',
    conditionLabels: DEFAULT_CONDITION_LABELS,
    themeColor: DEFAULT_THEME_COLOR,
    soundEnabled: true,
    hydrated: false,
  });
});

describe('useAppStore 初始值', () => {
  it('尚未 hydrate 前使用預設值', () => {
    const state = useAppStore.getState();
    expect(state.ninjaPoints).toBe(0);
    expect(state.currentRank).toBe('新使用者');
    expect(state.conditionLabels).toEqual(DEFAULT_CONDITION_LABELS);
    expect(state.themeColor).toBe(DEFAULT_THEME_COLOR);
    expect(state.soundEnabled).toBe(true);
  });
});

describe('hydrate', () => {
  it('有持久化資料時會載入並覆蓋預設值', async () => {
    await storage.saveAppState({
      ninjaPoints: 12,
      conditionLabels: ['自訂條件1', '自訂條件2'],
      themeColor: '#4DABF7',
    });

    await act(async () => {
      await useAppStore.getState().hydrate();
    });

    const state = useAppStore.getState();
    expect(state.ninjaPoints).toBe(12);
    expect(state.currentRank).toBe('王牌忍術師');
    expect(state.conditionLabels).toEqual(['自訂條件1', '自訂條件2']);
    expect(state.themeColor).toBe('#4DABF7');
    expect(state.hydrated).toBe(true);
  });

  it('沒有持久化資料時維持預設值，並標記 hydrated', async () => {
    await act(async () => {
      await useAppStore.getState().hydrate();
    });

    expect(useAppStore.getState().ninjaPoints).toBe(0);
    expect(useAppStore.getState().hydrated).toBe(true);
  });

  it('舊資料沒有 soundEnabled 欄位時，預設視為音效開啟', async () => {
    await storage.saveAppState({
      ninjaPoints: 5,
      conditionLabels: DEFAULT_CONDITION_LABELS,
      themeColor: DEFAULT_THEME_COLOR,
    });

    await act(async () => {
      await useAppStore.getState().hydrate();
    });

    expect(useAppStore.getState().soundEnabled).toBe(true);
  });
});

describe('addNinjaPoint', () => {
  it('每次呼叫 +1 點並重新計算段位，同時寫入 storage', async () => {
    await act(async () => {
      for (let i = 0; i < 3; i += 1) {
        await useAppStore.getState().addNinjaPoint();
      }
    });

    expect(useAppStore.getState().ninjaPoints).toBe(3);
    expect(useAppStore.getState().currentRank).toBe('忍術小達人');

    const persisted = await storage.getAppState();
    expect(persisted?.ninjaPoints).toBe(3);
  });
});

describe('setConditionLabels / setThemeColor', () => {
  it('setConditionLabels 會更新 state 並持久化', async () => {
    await act(async () => {
      await useAppStore.getState().setConditionLabels(['新條件A', '新條件B']);
    });
    expect(useAppStore.getState().conditionLabels).toEqual(['新條件A', '新條件B']);
    expect((await storage.getAppState())?.conditionLabels).toEqual(['新條件A', '新條件B']);
  });

  it('setThemeColor 會更新 state 並持久化', async () => {
    await act(async () => {
      await useAppStore.getState().setThemeColor('#69DB7C');
    });
    expect(useAppStore.getState().themeColor).toBe('#69DB7C');
    expect((await storage.getAppState())?.themeColor).toBe('#69DB7C');
  });

  it('setSoundEnabled 會更新 state 並持久化', async () => {
    await act(async () => {
      await useAppStore.getState().setSoundEnabled(false);
    });
    expect(useAppStore.getState().soundEnabled).toBe(false);
    expect((await storage.getAppState())?.soundEnabled).toBe(false);
  });
});
