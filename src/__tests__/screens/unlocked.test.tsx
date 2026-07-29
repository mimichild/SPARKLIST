import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UnlockedScreen from '../../../app/(tabs)/unlocked';
import * as storage from '../../services/storage';
import * as itemService from '../../services/itemService';

jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

function makeUnlockedItem(overrides: Partial<Parameters<typeof itemService.createItem>[0]> = {}) {
  const item = itemService.createItem({
    name: '已解鎖外套',
    photoUri: 'mock://photo.jpg',
    price: 900,
    unlockDate: '2020-01-01T00:00:00.000Z',
    initialConditionChecks: [true, true, true, false, false, false],
    ...overrides,
  });
  return { ...item, status: 'unlocked' as const };
}

describe('UnlockedScreen', () => {
  it('沒有解鎖單品時顯示空狀態文字', async () => {
    await render(<UnlockedScreen />);
    await waitFor(() => {
      expect(screen.getByText('目前沒有已解鎖的單品')).toBeTruthy();
    });
  });

  it('顯示已解鎖單品，並可以標記已購買', async () => {
    await storage.saveItems([makeUnlockedItem()]);

    await render(<UnlockedScreen />);
    await waitFor(() => expect(screen.getByText('已解鎖外套')).toBeTruthy());

    await act(async () => {
      await fireEvent.press(screen.getByText('標記已購買'));
    });

    await waitFor(() => {
      expect(screen.queryByText('已解鎖外套')).toBeNull();
    });
  });

  it('有購買連結時可以點擊前往購買頁', async () => {
    await storage.saveItems([makeUnlockedItem({ url: 'https://example.com/product' })]);

    await render(<UnlockedScreen />);
    await waitFor(() => expect(screen.getByText('前往購買頁')).toBeTruthy());

    await fireEvent.press(screen.getByText('前往購買頁'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/product');
  });

  it('點擊刪除仍算忍術點數', async () => {
    await storage.saveItems([makeUnlockedItem()]);

    await render(<UnlockedScreen />);
    await waitFor(() => expect(screen.getByText('已解鎖外套')).toBeTruthy());

    await act(async () => {
      await fireEvent.press(screen.getByText('刪除（不買了）'));
    });

    await waitFor(() => {
      expect(screen.queryByText('已解鎖外套')).toBeNull();
    });

    const history = await storage.getHistory();
    expect(history[0].outcome).toBe('resisted');
  });
});
