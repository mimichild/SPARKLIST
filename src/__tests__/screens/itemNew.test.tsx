import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NewItemScreen from '../../../app/item/new';
import * as storage from '../../services/storage';
import { DEFAULT_THEME_COLOR } from '../../constants/theme';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('NewItemScreen', () => {
  it('填寫名稱與價格後送出，會呼叫 storage.saveItems 並返回上一頁', async () => {
    await render(<NewItemScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('單品名稱'), '測試外套');
    await fireEvent.changeText(screen.getByPlaceholderText('價格'), '1200');

    await fireEvent.press(screen.getByText('7 天後'));
    await fireEvent.press(screen.getByText('儲存'));

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('測試外套');
      expect(items[0].price).toBe(1200);
    });

    expect(mockBack).toHaveBeenCalled();
  });

  it('名稱空白時不能送出，也不會呼叫 back', async () => {
    await render(<NewItemScreen />);

    await fireEvent.press(screen.getByText('7 天後'));
    await fireEvent.press(screen.getByText('儲存'));

    await waitFor(() => {
      expect(screen.getByText('請輸入單品名稱')).toBeTruthy();
    });
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('可以勾選六項條件其中幾項', async () => {
    await render(<NewItemScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('單品名稱'), '測試外套');
    await fireEvent.changeText(screen.getByPlaceholderText('價格'), '1200');
    await fireEvent.press(screen.getByText('7 天後'));
    await fireEvent.press(screen.getByText('符合我的風格嗎？'));
    await fireEvent.press(screen.getByText('儲存'));

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items[0].conditionChecks[2]).toBe(true);
    });
  });

  it('點選解鎖日期快捷按鈕後，該按鈕會顯示選中樣式，其他按鈕不會', async () => {
    await render(<NewItemScreen />);

    await fireEvent.press(screen.getByText('14 天後'));

    const selectedButton = screen.getByTestId('quick-date-14');
    expect(StyleSheet.flatten(selectedButton.props.style).backgroundColor).toBe(DEFAULT_THEME_COLOR);

    const unselectedButton = screen.getByTestId('quick-date-7');
    expect(StyleSheet.flatten(unselectedButton.props.style).backgroundColor).not.toBe(DEFAULT_THEME_COLOR);
  });

  it('可以改變主意，變更快速日期選項', async () => {
    await render(<NewItemScreen />);

    // Press 7, then change mind to 14
    await fireEvent.press(screen.getByText('7 天後'));
    await fireEvent.press(screen.getByText('14 天後'));

    // Verify visual state: 14 should be selected, 7 should not
    const selectedButton = screen.getByTestId('quick-date-14');
    expect(StyleSheet.flatten(selectedButton.props.style).backgroundColor).toBe(DEFAULT_THEME_COLOR);

    const unselectedButton = screen.getByTestId('quick-date-7');
    expect(StyleSheet.flatten(unselectedButton.props.style).backgroundColor).not.toBe(DEFAULT_THEME_COLOR);

    // Fill in and save
    await fireEvent.changeText(screen.getByPlaceholderText('單品名稱'), '測試外套');
    await fireEvent.press(screen.getByText('儲存'));

    // Verify saved item has 14-day unlock date, not 7-day
    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items).toHaveLength(1);

      const unlockDate = new Date(items[0].unlockDate);
      const now = new Date();
      const diffMs = unlockDate.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      // Should be approximately 14 days (allow 13-15 days to avoid flakiness)
      expect(diffDays).toBeGreaterThan(13);
      expect(diffDays).toBeLessThan(15);
    });

    expect(mockBack).toHaveBeenCalled();
  });
});
