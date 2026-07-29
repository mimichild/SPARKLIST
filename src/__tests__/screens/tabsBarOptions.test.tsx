import { render } from '@testing-library/react-native';
import TabsLayout from '../../../app/(tabs)/_layout';
import { useAppStore } from '../../store/useAppStore';
import { DEFAULT_CONDITION_LABELS } from '../../constants/conditions';
import { DEFAULT_THEME_COLOR } from '../../constants/theme';

let capturedScreenOptions: any;

jest.mock('expo-router', () => {
  const React = require('react');
  const Tabs = ({ screenOptions, children }: { screenOptions: any; children?: React.ReactNode }) => {
    capturedScreenOptions = screenOptions;
    return React.createElement(React.Fragment, null, children);
  };
  Tabs.Screen = () => null;
  return { Tabs };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 20, left: 0 }),
}));

beforeEach(() => {
  capturedScreenOptions = undefined;
  useAppStore.setState({
    ninjaPoints: 0,
    currentRank: '尚無段位',
    conditionLabels: DEFAULT_CONDITION_LABELS,
    themeColor: DEFAULT_THEME_COLOR,
    hydrated: false,
  });
});

describe('TabsLayout screenOptions', () => {
  it('tabBarActiveTintColor 綁定目前的主題色', async () => {
    useAppStore.setState({ themeColor: '#a7c7e7' });
    await render(<TabsLayout />);
    expect(capturedScreenOptions.tabBarActiveTintColor).toBe('#a7c7e7');
  });

  it('tabBarInactiveTintColor 固定為 #999', async () => {
    await render(<TabsLayout />);
    expect(capturedScreenOptions.tabBarInactiveTintColor).toBe('#999');
  });

  it('不顯示 tab icon', async () => {
    await render(<TabsLayout />);
    expect(capturedScreenOptions.tabBarIcon()).toBeNull();
  });

  it('tab bar 高度依安全區動態調整（base 50 + insets.bottom）', async () => {
    await render(<TabsLayout />);
    expect(capturedScreenOptions.tabBarStyle.height).toBe(70);
    expect(capturedScreenOptions.tabBarStyle.paddingBottom).toBe(20);
  });
});
