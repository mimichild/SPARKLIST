import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UnlockedScreen from '../../../app/(tabs)/unlocked';
import * as storage from '../../services/storage';
import * as itemService from '../../services/itemService';

jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

// See cooling.test.tsx for why @react-navigation/native is mocked this way:
// the real useFocusEffect needs a NavigationContainer that isn't present in
// these unit-rendered screens, so we run the callback once on mount and
// stash it so tests can invoke it again to simulate a later focus event.
let mockFocusCallback: (() => void) | undefined;

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require('react');
    mockFocusCallback = callback;
    React.useEffect(callback, []);
  },
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
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

  it('畫面重新取得焦點時會重新載入單品清單（例如條件解鎖後從詳情頁返回）', async () => {
    await render(<UnlockedScreen />);
    await waitFor(() => {
      expect(screen.getByText('目前沒有已解鎖的單品')).toBeTruthy();
    });

    // Simulate another screen (e.g. /item/[id] after checking conditions)
    // writing a newly-unlocked item to storage while this tab isn't focused.
    await storage.saveItems([makeUnlockedItem({ name: '剛解鎖的外套' })]);

    // Simulate navigating back to this tab (a focus event).
    await act(async () => {
      mockFocusCallback?.();
    });

    await waitFor(() => {
      expect(screen.getByText('剛解鎖的外套')).toBeTruthy();
    });
  });

  it('有購買連結時可以點擊前往購買頁', async () => {
    await storage.saveItems([makeUnlockedItem({ url: 'https://example.com/product' })]);

    await render(<UnlockedScreen />);
    await waitFor(() => expect(screen.getByText('前往購買頁')).toBeTruthy());

    await fireEvent.press(screen.getByText('前往購買頁'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/product');
  });

  it('已解鎖的單品也可以按「忍住不買」刪除，仍算忍術點數並提示贈點', async () => {
    await storage.saveItems([makeUnlockedItem()]);

    await render(<UnlockedScreen />);
    await waitFor(() => expect(screen.getByText('已解鎖外套')).toBeTruthy());

    await act(async () => {
      await fireEvent.press(screen.getByText('忍住不買'));
    });

    expect(Alert.alert).toHaveBeenCalledWith('將贈送您一點忍術點數');

    await waitFor(() => {
      expect(screen.queryByText('已解鎖外套')).toBeNull();
    });

    const history = await storage.getHistory();
    expect(history[0].outcome).toBe('resisted');
  });

  it('按下搜尋按鈕會顯示搜尋欄，輸入關鍵字可以篩選單品清單', async () => {
    await storage.saveItems([
      makeUnlockedItem({ name: '藍色外套' }),
      makeUnlockedItem({ name: '白色球鞋' }),
    ]);

    await render(<UnlockedScreen />);
    await waitFor(() => expect(screen.getByText('藍色外套')).toBeTruthy());

    expect(screen.queryByTestId('search-input')).toBeNull();

    await fireEvent.press(screen.getByTestId('search-toggle'));
    await fireEvent.changeText(screen.getByTestId('search-input'), '外套');

    await waitFor(() => {
      expect(screen.getByText('藍色外套')).toBeTruthy();
      expect(screen.queryByText('白色球鞋')).toBeNull();
    });
  });

  it('搜尋關鍵字找不到符合的單品時顯示提示文字', async () => {
    await storage.saveItems([makeUnlockedItem({ name: '藍色外套' })]);

    await render(<UnlockedScreen />);
    await waitFor(() => expect(screen.getByText('藍色外套')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('search-toggle'));
    await fireEvent.changeText(screen.getByTestId('search-input'), '找不到的關鍵字');

    await waitFor(() => {
      expect(screen.getByText('找不到符合「找不到的關鍵字」的單品')).toBeTruthy();
    });
  });
});
