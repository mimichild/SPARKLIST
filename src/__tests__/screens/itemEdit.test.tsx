import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import EditItemScreen from '../../../app/item/[id]';
import * as storage from '../../services/storage';
import * as itemService from '../../services/itemService';

const mockBack = jest.fn();
let mockParams = { id: '' };

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

async function seedItem(overrides: Partial<Parameters<typeof itemService.createItem>[0]> = {}) {
  const item = itemService.createItem({
    name: '編輯測試外套',
    photoUri: 'mock://photo.jpg',
    price: 800,
    unlockDate: '2099-01-01T00:00:00.000Z',
    initialConditionChecks: [true, false, false, false, false, false],
    ...overrides,
  });
  await storage.saveItems([item]);
  mockParams = { id: item.id };
  return item;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('EditItemScreen', () => {
  it('顯示單品名稱、價格等欄位，勾選條件後按下「儲存」才會寫回 storage', async () => {
    await seedItem();
    await render(<EditItemScreen />);

    await waitFor(() => expect(screen.getByDisplayValue('編輯測試外套')).toBeTruthy());

    await fireEvent.press(screen.getByText('符合我的風格嗎？'));

    // 勾選後尚未按儲存，storage 不應變更。
    let items = await storage.getItems();
    expect(items[0].conditionChecks[2]).toBe(false);

    await act(async () => {
      await fireEvent.press(screen.getByText('儲存'));
    });

    await waitFor(async () => {
      items = await storage.getItems();
      expect(items[0].conditionChecks[2]).toBe(true);
    });
    expect(mockBack).toHaveBeenCalled();
  });

  it('按下「取消」不會寫回任何變更，並直接返回上一頁', async () => {
    await seedItem();
    await render(<EditItemScreen />);

    await waitFor(() => expect(screen.getByDisplayValue('編輯測試外套')).toBeTruthy());

    await fireEvent.changeText(screen.getByDisplayValue('編輯測試外套'), '改過但不儲存的名稱');
    await fireEvent.press(screen.getByText('符合我的風格嗎？'));

    await fireEvent.press(screen.getByText('取消'));

    const items = await storage.getItems();
    expect(items[0].name).toBe('編輯測試外套');
    expect(items[0].conditionChecks[2]).toBe(false);
    expect(mockBack).toHaveBeenCalled();
  });

  it('可以修改名稱、價格、網址、備註並儲存', async () => {
    await seedItem();
    await render(<EditItemScreen />);

    await waitFor(() => expect(screen.getByDisplayValue('編輯測試外套')).toBeTruthy());

    await fireEvent.changeText(screen.getByDisplayValue('編輯測試外套'), '新名稱外套');
    await fireEvent.changeText(screen.getByDisplayValue('800'), '999');
    await fireEvent.changeText(screen.getByPlaceholderText('購買連結（可選）'), 'https://example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('備註（可選）'), '很喜歡這件');

    await act(async () => {
      await fireEvent.press(screen.getByText('儲存'));
    });

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items[0].name).toBe('新名稱外套');
      expect(items[0].price).toBe(999);
      expect(items[0].url).toBe('https://example.com');
      expect(items[0].note).toBe('很喜歡這件');
    });
  });

  it('名稱清空後按儲存會顯示錯誤，且不會返回上一頁', async () => {
    await seedItem();
    await render(<EditItemScreen />);

    await waitFor(() => expect(screen.getByDisplayValue('編輯測試外套')).toBeTruthy());
    await fireEvent.changeText(screen.getByDisplayValue('編輯測試外套'), '');
    await fireEvent.press(screen.getByText('儲存'));

    await waitFor(() => {
      expect(screen.getByText('請輸入單品名稱')).toBeTruthy();
    });
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('有照片時，畫面最上方會顯示照片，並提供移除照片按鈕', async () => {
    await seedItem({ photoUri: 'mock://existing.jpg' });
    await render(<EditItemScreen />);

    await waitFor(() => expect(screen.getByTestId('item-detail-photo')).toBeTruthy());
    expect(screen.getByText('🗑 移除照片')).toBeTruthy();

    await fireEvent.press(screen.getByText('🗑 移除照片'));

    expect(screen.queryByTestId('item-detail-photo')).toBeNull();
    expect(screen.queryByText('🗑 移除照片')).toBeNull();
  });

  it('沒有照片時，畫面最上方不顯示任何照片區塊', async () => {
    await seedItem({ photoUri: '' });
    await render(<EditItemScreen />);

    await waitFor(() => expect(screen.getByDisplayValue('編輯測試外套')).toBeTruthy());
    expect(screen.queryByTestId('item-detail-photo')).toBeNull();
    expect(screen.queryByText('🗑 移除照片')).toBeNull();
  });

  it('點擊「拍照」會開啟照片調整畫面，確定後才更新最上方顯示的照片，維持拍攝當下的比例', async () => {
    await seedItem({ photoUri: '' });
    await render(<EditItemScreen />);

    await waitFor(() => expect(screen.getByDisplayValue('編輯測試外套')).toBeTruthy());

    await act(async () => {
      await fireEvent.press(screen.getByText('📷 拍照'));
    });

    expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    expect(screen.getByTestId('photo-adjust-viewport')).toBeTruthy();
    expect(screen.queryByTestId('item-detail-photo')).toBeNull();

    await act(async () => {
      await fireEvent.press(screen.getByTestId('photo-adjust-confirm'));
    });

    await waitFor(() => {
      const photo = screen.getByTestId('item-detail-photo');
      // mock 相機回傳 1200x900（4:3）。
      expect(StyleSheet.flatten(photo.props.style).aspectRatio).toBeCloseTo(1200 / 900);
    });
  });

  it('點擊「從相簿選擇」開啟照片調整畫面後按「取消」，不會套用該張照片', async () => {
    await seedItem({ photoUri: '' });
    await render(<EditItemScreen />);

    await waitFor(() => expect(screen.getByDisplayValue('編輯測試外套')).toBeTruthy());

    await act(async () => {
      await fireEvent.press(screen.getByText('🖼 從相簿選擇'));
    });

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    expect(screen.getByTestId('photo-adjust-viewport')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('photo-adjust-cancel'));

    expect(screen.queryByTestId('photo-adjust-viewport')).toBeNull();
    expect(screen.queryByTestId('item-detail-photo')).toBeNull();
  });

  it('既有單品原本儲存的照片比例，開啟時會直接套用在照片上', async () => {
    await seedItem({ photoUri: 'mock://existing.jpg', photoAspectRatio: 3 / 4 });
    await render(<EditItemScreen />);

    await waitFor(() => {
      const photo = screen.getByTestId('item-detail-photo');
      expect(StyleSheet.flatten(photo.props.style).aspectRatio).toBeCloseTo(3 / 4);
    });
  });

  it('儲存後，新拍攝照片的比例會寫回 storage', async () => {
    await seedItem({ photoUri: '' });
    await render(<EditItemScreen />);

    await waitFor(() => expect(screen.getByDisplayValue('編輯測試外套')).toBeTruthy());

    await act(async () => {
      await fireEvent.press(screen.getByText('🖼 從相簿選擇'));
    });
    await act(async () => {
      await fireEvent.press(screen.getByTestId('photo-adjust-confirm'));
    });
    await act(async () => {
      await fireEvent.press(screen.getByText('儲存'));
    });

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items[0].photoAspectRatio).toBeCloseTo(900 / 1200);
    });
  });

  it('顯示目前的解鎖日期，並可以用快捷天數按鈕重新設定', async () => {
    await seedItem({ unlockDate: '2026-08-15T00:00:00.000Z' });
    await render(<EditItemScreen />);

    await waitFor(() => {
      expect(screen.getByText('已選擇：2026/8/15')).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('14 天後'));

    await act(async () => {
      await fireEvent.press(screen.getByText('儲存'));
    });

    await waitFor(async () => {
      const items = await storage.getItems();
      const unlockDate = new Date(items[0].unlockDate);
      const now = new Date();
      const diffDays = (unlockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(13);
      expect(diffDays).toBeLessThan(15);
    });
  });

  it('可以透過日曆自訂解鎖日期，日曆預設顯示目前解鎖日期所在的月份', async () => {
    await seedItem({ unlockDate: '2026-08-15T00:00:00.000Z' });
    await render(<EditItemScreen />);

    await waitFor(() => expect(screen.getByText('已選擇：2026/8/15')).toBeTruthy());

    await fireEvent.press(screen.getByText('📅 選日期'));
    expect(screen.getByText('2026 年 8 月')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('calendar-day-2026-08-20'));

    await act(async () => {
      await fireEvent.press(screen.getByText('儲存'));
    });

    await waitFor(async () => {
      const items = await storage.getItems();
      const unlockDate = new Date(items[0].unlockDate);
      expect(unlockDate.getFullYear()).toBe(2026);
      expect(unlockDate.getMonth()).toBe(7);
      expect(unlockDate.getDate()).toBe(20);
    });
  });

  it('按下取消不會寫回修改過的解鎖日期', async () => {
    await seedItem({ unlockDate: '2026-08-15T00:00:00.000Z' });
    await render(<EditItemScreen />);

    await waitFor(() => expect(screen.getByText('已選擇：2026/8/15')).toBeTruthy());

    await fireEvent.press(screen.getByText('30 天後'));
    await fireEvent.press(screen.getByText('取消'));

    const items = await storage.getItems();
    expect(items[0].unlockDate).toBe('2026-08-15T00:00:00.000Z');
  });

  it('按下「刪除」會先跳出確認對話框，未確認前不會刪除單品', async () => {
    await seedItem();
    await render(<EditItemScreen />);

    await waitFor(() => expect(screen.getByDisplayValue('編輯測試外套')).toBeTruthy());

    await fireEvent.press(screen.getByText('刪除'));

    expect(Alert.alert).toHaveBeenCalledWith(
      '刪除單品',
      expect.any(String),
      expect.any(Array)
    );
    const items = await storage.getItems();
    expect(items).toHaveLength(1);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('確認對話框按下「刪除」後，單品會被移除且不留下歷史記錄，並返回上一頁', async () => {
    const seeded = await seedItem();
    (Alert.alert as jest.Mock).mockImplementation((_title, _message, buttons) => {
      const destructive = buttons.find((b: { style?: string }) => b.style === 'destructive');
      destructive?.onPress?.();
    });

    await render(<EditItemScreen />);
    await waitFor(() => expect(screen.getByDisplayValue('編輯測試外套')).toBeTruthy());

    await act(async () => {
      await fireEvent.press(screen.getByText('刪除'));
    });

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items.find((i) => i.id === seeded.id)).toBeUndefined();
    });
    expect(mockBack).toHaveBeenCalled();
    const history = await storage.getHistory();
    expect(history).toHaveLength(0);
  });

  it('找不到對應單品時顯示提示文字', async () => {
    mockParams = { id: 'not-exist' };
    await render(<EditItemScreen />);

    await waitFor(() => {
      expect(screen.getByText('找不到這筆單品')).toBeTruthy();
    });
  });
});
