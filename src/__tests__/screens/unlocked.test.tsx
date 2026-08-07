import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { StyleSheet, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UnlockedScreen from '../../../app/(tabs)/unlocked';
import * as storage from '../../services/storage';
import * as itemService from '../../services/itemService';

jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// See cooling.test.tsx for why @react-navigation/native is mocked this way:
// the real useFocusEffect needs a NavigationContainer that isn't present in
// these unit-rendered screens, so we run the callback once on mount and
// stash it so tests can invoke it again to simulate a later focus event.
let mockFocusCallback: (() => void) | undefined;
// The search toggle now lives in the header (via navigation.setOptions),
// not in the screen's own render tree, so tests capture the options object
// the screen hands to setOptions and render headerRight() in the same tree.
let capturedNavigationOptions: any;

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require('react');
    mockFocusCallback = callback;
    React.useEffect(callback, []);
  },
  useNavigation: () => ({
    setOptions: (options: any) => {
      capturedNavigationOptions = options;
    },
  }),
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  capturedNavigationOptions = undefined;
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

  it('顯示已解鎖單品，按下「已購買」會提示恭喜畢業並移除該單品', async () => {
    await storage.saveItems([makeUnlockedItem()]);

    await render(<UnlockedScreen />);
    await waitFor(() => expect(screen.getByText('已解鎖外套')).toBeTruthy());

    await act(async () => {
      await fireEvent.press(screen.getByText('已購買'));
    });

    expect(Alert.alert).toHaveBeenCalledWith('恭喜畢業');

    await waitFor(() => {
      expect(screen.queryByText('已解鎖外套')).toBeNull();
    });
  });

  it('點擊已解鎖單品會導向該單品的編輯畫面，與冷靜區相同', async () => {
    const item = makeUnlockedItem();
    await storage.saveItems([item]);

    await render(<UnlockedScreen />);
    await waitFor(() => expect(screen.getByText('已解鎖外套')).toBeTruthy());

    await fireEvent.press(screen.getByText('已解鎖外套'));

    expect(mockPush).toHaveBeenCalledWith(`/item/${item.id}`);
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

  it('搜尋按鈕位於頁首（同一橫向高度），文字為白色，按下會顯示搜尋欄並可篩選單品清單', async () => {
    await storage.saveItems([
      makeUnlockedItem({ name: '藍色外套' }),
      makeUnlockedItem({ name: '白色球鞋' }),
    ]);

    // Root element must stay the same wrapper type (Fragment) across the
    // rerender below, or React remounts UnlockedScreen instead of updating
    // it in place, detaching the header button's onPress from this instance.
    const main = await render(
      <>
        <UnlockedScreen />
      </>
    );
    await waitFor(() => expect(main.getByText('藍色外套')).toBeTruthy());
    expect(main.queryByTestId('search-input')).toBeNull();
    expect(capturedNavigationOptions).toBeTruthy();

    await main.rerender(
      <>
        <UnlockedScreen />
        {capturedNavigationOptions.headerRight()}
      </>
    );

    expect(StyleSheet.flatten(main.getByText('🔍 搜尋').props.style).color).toBe('#FFFFFF');

    await fireEvent.press(main.getByTestId('search-toggle'));
    await fireEvent.changeText(main.getByTestId('search-input'), '外套');

    await waitFor(() => {
      expect(main.getByText('藍色外套')).toBeTruthy();
      expect(main.queryByText('白色球鞋')).toBeNull();
    });
  });

  it('搜尋關鍵字找不到符合的單品時顯示提示文字', async () => {
    await storage.saveItems([makeUnlockedItem({ name: '藍色外套' })]);

    const main = await render(
      <>
        <UnlockedScreen />
      </>
    );
    await waitFor(() => expect(main.getByText('藍色外套')).toBeTruthy());
    expect(capturedNavigationOptions).toBeTruthy();

    await main.rerender(
      <>
        <UnlockedScreen />
        {capturedNavigationOptions.headerRight()}
      </>
    );

    await fireEvent.press(main.getByTestId('search-toggle'));
    await fireEvent.changeText(main.getByTestId('search-input'), '找不到的關鍵字');

    await waitFor(() => {
      expect(main.getByText('找不到符合「找不到的關鍵字」的單品')).toBeTruthy();
    });
  });
});
