import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
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

  it('只填寫名稱，不特別選擇解鎖日期，仍可成功送出（預設 7 天後解鎖）', async () => {
    await render(<NewItemScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('單品名稱'), '測試外套');
    await fireEvent.press(screen.getByText('儲存'));

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items).toHaveLength(1);

      const unlockDate = new Date(items[0].unlockDate);
      const now = new Date();
      const diffDays = (unlockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(6);
      expect(diffDays).toBeLessThan(8);
    });

    expect(mockBack).toHaveBeenCalled();
  });

  it('儲存按鈕文字固定為白色，不受主題色明暗影響', async () => {
    await render(<NewItemScreen />);
    const label = screen.getByText('儲存');
    expect(StyleSheet.flatten(label.props.style).color).toBe('#FFFFFF');
  });

  it('點擊「📅 選日期」可以透過日曆自由挑選日期，並顯示已選擇的日期', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 15));
    try {
      await render(<NewItemScreen />);

      await fireEvent.press(screen.getByText('📅 選日期'));
      await fireEvent.press(screen.getByTestId('calendar-day-2026-07-25'));

      await waitFor(() => {
        expect(screen.getByText('已選擇：2026/7/25')).toBeTruthy();
      });

      await fireEvent.changeText(screen.getByPlaceholderText('單品名稱'), '測試外套');
      await fireEvent.press(screen.getByText('儲存'));

      await waitFor(async () => {
        const items = await storage.getItems();
        expect(items).toHaveLength(1);
        const unlockDate = new Date(items[0].unlockDate);
        expect(unlockDate.getFullYear()).toBe(2026);
        expect(unlockDate.getMonth()).toBe(6);
        expect(unlockDate.getDate()).toBe(25);
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('選了快速日期選項後改用日曆挑選日期，快速選項會取消選中', async () => {
    await render(<NewItemScreen />);

    await fireEvent.press(screen.getByText('14 天後'));
    await fireEvent.press(screen.getByText('📅 選日期'));

    const dayCells = screen.getAllByTestId(/^calendar-day-/);
    await fireEvent.press(dayCells[dayCells.length - 1]);

    const quickButton14 = screen.getByTestId('quick-date-14');
    expect(StyleSheet.flatten(quickButton14.props.style).backgroundColor).not.toBe(DEFAULT_THEME_COLOR);
  });

  it('點擊「拍照」會開啟照片調整畫面，確定後才顯示預覽，並保持拍攝當下的比例', async () => {
    await render(<NewItemScreen />);

    expect(screen.getByTestId('new-item-photo-placeholder')).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByText('📷 拍照'));
    });

    expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
    expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();

    // 還沒按「確定」，畫面上仍是照片調整彈窗，主畫面預覽尚未更新。
    expect(screen.getByTestId('photo-adjust-viewport')).toBeTruthy();
    expect(screen.queryByTestId('new-item-photo-preview')).toBeNull();

    await act(async () => {
      await fireEvent.press(screen.getByTestId('photo-adjust-confirm'));
    });

    await waitFor(() => {
      const preview = screen.getByTestId('new-item-photo-preview');
      // mock 相機回傳 1200x900（4:3）。
      expect(StyleSheet.flatten(preview.props.style).aspectRatio).toBeCloseTo(1200 / 900);
    });
  });

  it('點擊「從相簿選擇」會開啟照片調整畫面，取消則不套用該張照片', async () => {
    await render(<NewItemScreen />);

    await act(async () => {
      await fireEvent.press(screen.getByText('🖼 從相簿選擇'));
    });

    expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    expect(screen.getByTestId('photo-adjust-viewport')).toBeTruthy();

    await fireEvent.press(screen.getByText('取消'));

    expect(screen.queryByTestId('photo-adjust-viewport')).toBeNull();
    expect(screen.queryByTestId('new-item-photo-preview')).toBeNull();
    expect(screen.getByTestId('new-item-photo-placeholder')).toBeTruthy();
  });

  it('儲存後，單品會保留照片本身的比例資訊', async () => {
    await render(<NewItemScreen />);

    await act(async () => {
      await fireEvent.press(screen.getByText('🖼 從相簿選擇'));
    });
    await act(async () => {
      await fireEvent.press(screen.getByTestId('photo-adjust-confirm'));
    });
    await fireEvent.changeText(screen.getByPlaceholderText('單品名稱'), '測試外套');
    await fireEvent.press(screen.getByText('儲存'));

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items[0].photoAspectRatio).toBeCloseTo(900 / 1200);
    });
  });

  it('即使原生通知排程失敗，儲存後仍會正常返回上一頁（不應卡住畫面）', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValueOnce(new Error('native error'));

    await render(<NewItemScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('單品名稱'), '測試外套');
    await fireEvent.press(screen.getByText('儲存'));

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items).toHaveLength(1);
    });
    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
    });
  });
});
