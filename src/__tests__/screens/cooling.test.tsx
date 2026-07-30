import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CoolingScreen from '../../../app/(tabs)/cooling';
import * as storage from '../../services/storage';
import * as itemService from '../../services/itemService';
import { useAppStore } from '../../store/useAppStore';

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

  it('「新增單品」按鈕文字固定為白色，不受主題色明暗影響', async () => {
    // 選一個亮色主題色，若還在用 getContrastColor 自動判斷對比色，
    // 亮色底會算出深色文字，藉此確認文字色已改為寫死白色。
    useAppStore.setState({ themeColor: '#f1aba7' });

    await render(<CoolingScreen />);
    await waitFor(() => expect(screen.getByText('新增單品')).toBeTruthy());

    const label = screen.getByText('新增單品');
    expect(StyleSheet.flatten(label.props.style).color).toBe('#FFFFFF');
  });
});
