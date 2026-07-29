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
  it('我的畫面會渲染標題', async () => {
    await render(<MeScreen />);
    expect(screen.getByText('我的')).toBeTruthy();
  });

  it('冷靜區畫面會渲染標題', async () => {
    await render(<CoolingScreen />);
    expect(screen.getByText('冷靜區')).toBeTruthy();
  });

  it('解鎖區畫面會渲染標題', async () => {
    await render(<UnlockedScreen />);
    expect(screen.getByText('解鎖區')).toBeTruthy();
  });
});
