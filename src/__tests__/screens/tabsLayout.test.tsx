import { render, screen } from '@testing-library/react-native';
import MeScreen from '../../../app/(tabs)/me';
import CoolingScreen from '../../../app/(tabs)/cooling';
import UnlockedScreen from '../../../app/(tabs)/unlocked';

// These screens call useFocusEffect on mount to reload their data; the real
// hook requires a NavigationContainer that isn't present when unit-rendering
// a bare screen component, so treat it as a mount effect for tests.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (callback: () => void) => {
    const React = require('react');
    React.useEffect(callback, []);
  },
}));

describe('分頁骨架畫面', () => {
  // 標題文字現在只由 Tab 頁首（app/(tabs)/_layout.tsx 的 screenOptions.title）顯示，
  // 畫面內容本身不應該再重複渲染一次同樣的標題文字。
  it('我的畫面內容不會重複渲染「我的」標題', async () => {
    await render(<MeScreen />);
    expect(screen.queryByText('我的')).toBeNull();
  });

  it('冷靜區畫面內容不會重複渲染「冷靜區」標題', async () => {
    await render(<CoolingScreen />);
    expect(screen.queryByText('冷靜區')).toBeNull();
  });

  it('解鎖區畫面內容不會重複渲染「解鎖區」標題', async () => {
    await render(<UnlockedScreen />);
    expect(screen.queryByText('解鎖區')).toBeNull();
  });
});
