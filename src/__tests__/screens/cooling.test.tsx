import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CoolingScreen from '../../../app/(tabs)/cooling';
import * as storage from '../../services/storage';
import * as itemService from '../../services/itemService';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('CoolingScreen', () => {
  it('沒有單品時顯示空狀態文字', async () => {
    await render(<CoolingScreen />);
    await waitFor(() => {
      expect(screen.getByText('目前沒有正在冷靜的單品，按右上角新增一個吧！')).toBeTruthy();
    });
  });

  it('依解鎖日期由近到遠顯示單品清單', async () => {
    const later = itemService.createItem({
      name: '較晚',
      photoUri: 'mock://photo.jpg',
      price: 100,
      unlockDate: '2099-06-01T00:00:00.000Z',
    });
    const sooner = itemService.createItem({
      name: '較早',
      photoUri: 'mock://photo.jpg',
      price: 100,
      unlockDate: '2099-01-01T00:00:00.000Z',
    });
    await storage.saveItems([later, sooner]);

    await render(<CoolingScreen />);

    await waitFor(() => {
      expect(screen.getByText('較早')).toBeTruthy();
      expect(screen.getByText('較晚')).toBeTruthy();
    });
  });

  it('點擊「新增單品」按鈕會導向新增畫面', async () => {
    await render(<CoolingScreen />);
    await waitFor(() => expect(screen.getByText('新增單品')).toBeTruthy());

    await fireEvent.press(screen.getByText('新增單品'));
    expect(mockPush).toHaveBeenCalledWith('/item/new');
  });

  it('點擊主動放棄會移除該單品', async () => {
    const item = itemService.createItem({
      name: '要放棄的外套',
      photoUri: 'mock://photo.jpg',
      price: 500,
      unlockDate: '2099-01-01T00:00:00.000Z',
    });
    await storage.saveItems([item]);

    await render(<CoolingScreen />);
    await waitFor(() => expect(screen.getByText('要放棄的外套')).toBeTruthy());

    await act(async () => {
      await fireEvent.press(screen.getByText('主動放棄'));
    });

    await waitFor(() => {
      expect(screen.queryByText('要放棄的外套')).toBeNull();
    });
  });
});
