import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MeScreen from '../../../app/(tabs)/me';
import { useAppStore } from '../../store/useAppStore';
import * as storage from '../../services/storage';
import { DEFAULT_CONDITION_LABELS } from '../../constants/conditions';
import { DEFAULT_THEME_COLOR } from '../../constants/theme';

beforeEach(async () => {
  await AsyncStorage.clear();
  useAppStore.setState({
    ninjaPoints: 0,
    currentRank: '尚無段位',
    conditionLabels: DEFAULT_CONDITION_LABELS,
    themeColor: DEFAULT_THEME_COLOR,
    hydrated: false,
  });
});

describe('MeScreen', () => {
  it('顯示目前段位與統計數據', async () => {
    await storage.saveAppState({ ninjaPoints: 10, conditionLabels: DEFAULT_CONDITION_LABELS, themeColor: DEFAULT_THEME_COLOR });
    await storage.saveHistory([
      { id: 'h1', itemName: 'A', price: 100, outcome: 'resisted', recordedAt: '2026-07-01T00:00:00.000Z' },
      { id: 'h2', itemName: 'B', price: 200, outcome: 'resisted', recordedAt: '2026-07-02T00:00:00.000Z' },
      { id: 'h3', itemName: 'C', price: 300, outcome: 'purchased', recordedAt: '2026-07-03T00:00:00.000Z' },
    ]);

    await render(<MeScreen />);

    await waitFor(() => {
      expect(screen.getByText('王牌忍術師')).toBeTruthy();
      expect(screen.getByText('累計放棄 2 次')).toBeTruthy();
      expect(screen.getByText('估計省下 NT$ 300')).toBeTruthy();
    });
  });

  it('可以編輯六項條件文字', async () => {
    await render(<MeScreen />);

    await waitFor(() => expect(screen.getByText('編輯六項條件')).toBeTruthy());
    await fireEvent.press(screen.getByText('編輯六項條件'));

    const firstInput = screen.getByDisplayValue(DEFAULT_CONDITION_LABELS[0]);
    await fireEvent.changeText(firstInput, '改過的條件文字');

    await act(async () => {
      await fireEvent.press(screen.getByText('儲存條件'));
    });

    await waitFor(() => {
      expect(useAppStore.getState().conditionLabels[0]).toBe('改過的條件文字');
    });
  });

  it('可以選擇主題色', async () => {
    await render(<MeScreen />);
    await waitFor(() => expect(screen.getByText('主題色')).toBeTruthy());

    await act(async () => {
      await fireEvent.press(screen.getByTestId('theme-color-1'));
    });

    await waitFor(() => {
      expect(useAppStore.getState().themeColor).not.toBe(DEFAULT_THEME_COLOR);
    });
  });
});
