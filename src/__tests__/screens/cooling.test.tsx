import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CoolingScreen from '../../../app/(tabs)/cooling';
import * as storage from '../../services/storage';
import * as itemService from '../../services/itemService';
import { useAppStore } from '../../store/useAppStore';
import { useUnlockQueueStore } from '../../store/useUnlockQueueStore';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// react-navigation's real useFocusEffect requires a NavigationContainer,
// which these screens aren't wrapped in during unit tests, and RN Testing
// Library / jsdom has no concept of real navigation focus events. We mock
// useFocusEffect to (a) run the callback once on mount, like the real hook
// does when the screen starts out focused, and (b) stash the latest
// callback in `mockFocusCallback` so tests can invoke it again to simulate
// a subsequent focus event (e.g. navigating back to this tab).
let mockFocusCallback: (() => void) | undefined;
// The search toggle now lives in the header (via navigation.setOptions),
// not in the screen's own render tree, so tests capture the options object
// the screen hands to setOptions and render headerRight() separately.
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
  useUnlockQueueStore.setState({ newlyUnlockedItems: [] });
  capturedNavigationOptions = undefined;
});

describe('CoolingScreen', () => {
  it('沒有單品時顯示空狀態文字', async () => {
    await render(<CoolingScreen />);
    await waitFor(() => {
      expect(screen.getByText('目前沒有正在冷靜的單品，按右下角新增一個吧！')).toBeTruthy();
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

  it('畫面重新取得焦點時會重新載入單品清單（例如從新增單品畫面返回）', async () => {
    await render(<CoolingScreen />);
    await waitFor(() => {
      expect(screen.getByText('目前沒有正在冷靜的單品，按右下角新增一個吧！')).toBeTruthy();
    });

    // Simulate another screen (e.g. /item/new) writing to storage while
    // this already-mounted tab screen is not focused.
    const item = itemService.createItem({
      name: '新增後才出現的外套',
      photoUri: 'mock://photo.jpg',
      price: 300,
      unlockDate: '2099-01-01T00:00:00.000Z',
    });
    await storage.saveItems([item]);

    // Simulate navigating back to this tab (a focus event).
    await act(async () => {
      mockFocusCallback?.();
    });

    await waitFor(() => {
      expect(screen.getByText('新增後才出現的外套')).toBeTruthy();
    });
  });

  it('點擊忍住不買會移除該單品，並提示將贈送忍術點數', async () => {
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
      await fireEvent.press(screen.getByText('忍住不買'));
    });

    expect(Alert.alert).toHaveBeenCalledWith('將贈送您一點忍術點數');

    await waitFor(() => {
      expect(screen.queryByText('要放棄的外套')).toBeNull();
    });
  });

  it('「新增單品」按鈕文字固定為白色，不受主題色明暗影響', async () => {
    // 選一個亮色主題色，若還在用 getContrastColor 自動判斷對比色，
    // 亮色底會算出深色文字，藉此確認文字色已改為寫死白色。
    useAppStore.setState({ themeColor: '#f1aba7' });

    await render(<CoolingScreen />);
    await waitFor(() => expect(screen.getByText('新增單品')).toBeTruthy());

    const label = screen.getByText('新增單品');
    expect(StyleSheet.flatten(label.props.style).color).toBe('#FFFFFF');
  });

  it('搜尋按鈕位於頁首（同一橫向高度），文字為白色，按下會顯示搜尋欄並可篩選單品清單', async () => {
    await storage.saveItems([
      itemService.createItem({ name: '藍色外套', photoUri: 'mock://photo.jpg', price: 100, unlockDate: '2099-01-01T00:00:00.000Z' }),
      itemService.createItem({ name: '白色球鞋', photoUri: 'mock://photo.jpg', price: 200, unlockDate: '2099-01-01T00:00:00.000Z' }),
    ]);

    // Renders the screen and the header button it hands to
    // navigation.setOptions() in the SAME tree, so pressing the header
    // button and querying the screen's own body operate on one consistent
    // render (mirrors how they actually share one screen in the real header).
    // Root element must stay the same wrapper type (Fragment) across the
    // rerender below, or React remounts CoolingScreen instead of updating
    // it in place, discarding the setIsSearchVisible closure headerRight()
    // captured and silently detaching the button from this instance.
    const main = await render(
      <>
        <CoolingScreen />
      </>
    );
    await waitFor(() => expect(main.getByText('藍色外套')).toBeTruthy());
    expect(main.queryByTestId('search-input')).toBeNull();
    expect(capturedNavigationOptions).toBeTruthy();

    await main.rerender(
      <>
        <CoolingScreen />
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
    await storage.saveItems([
      itemService.createItem({ name: '藍色外套', photoUri: 'mock://photo.jpg', price: 100, unlockDate: '2099-01-01T00:00:00.000Z' }),
    ]);

    const main = await render(
      <>
        <CoolingScreen />
      </>
    );
    await waitFor(() => expect(main.getByText('藍色外套')).toBeTruthy());
    expect(capturedNavigationOptions).toBeTruthy();

    await main.rerender(
      <>
        <CoolingScreen />
        {capturedNavigationOptions.headerRight()}
      </>
    );

    await fireEvent.press(main.getByTestId('search-toggle'));
    await fireEvent.changeText(main.getByTestId('search-input'), '找不到的關鍵字');

    await waitFor(() => {
      expect(main.getByText('找不到符合「找不到的關鍵字」的單品')).toBeTruthy();
    });
  });

  it('單品剛解鎖時會加入全域佇列（恭喜解鎖彈窗實際顯示於 TabsLayout，見 tabsBarOptions.test.tsx）', async () => {
    await storage.saveItems([
      itemService.createItem({
        name: '剛解鎖的外套',
        photoUri: 'mock://photo.jpg',
        price: 500,
        unlockDate: '2020-01-01T00:00:00.000Z',
        initialConditionChecks: [true, true, true, false, false, false],
      }),
    ]);

    await render(<CoolingScreen />);

    await waitFor(() => {
      expect(useUnlockQueueStore.getState().newlyUnlockedItems).toHaveLength(1);
      expect(useUnlockQueueStore.getState().newlyUnlockedItems[0].name).toBe('剛解鎖的外套');
    });
  });
});
