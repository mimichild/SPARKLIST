import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EditItemScreen from '../../../app/item/[id]';
import * as storage from '../../services/storage';
import * as itemService from '../../services/itemService';

const mockBack = jest.fn();
let mockParams = { id: '' };

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('EditItemScreen', () => {
  it('顯示單品名稱與目前勾選狀態，勾選後寫回 storage', async () => {
    const item = itemService.createItem({
      name: '編輯測試外套',
      photoUri: 'mock://photo.jpg',
      price: 800,
      unlockDate: '2099-01-01T00:00:00.000Z',
      initialConditionChecks: [true, false, false, false, false, false],
    });
    await storage.saveItems([item]);
    mockParams = { id: item.id };

    await render(<EditItemScreen />);

    await waitFor(() => expect(screen.getByText('編輯測試外套')).toBeTruthy());

    await act(async () => {
      await fireEvent.press(screen.getByText('符合我的風格嗎？'));
    });

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items[0].conditionChecks[2]).toBe(true);
    });
  });

  it('找不到對應單品時顯示提示文字', async () => {
    mockParams = { id: 'not-exist' };
    await render(<EditItemScreen />);

    await waitFor(() => {
      expect(screen.getByText('找不到這筆單品')).toBeTruthy();
    });
  });
});
