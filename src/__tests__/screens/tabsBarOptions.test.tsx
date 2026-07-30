import { render, screen, fireEvent } from '@testing-library/react-native';
import TabsLayout from '../../../app/(tabs)/_layout';
import { useAppStore } from '../../store/useAppStore';
import { useUnlockQueueStore } from '../../store/useUnlockQueueStore';
import { DEFAULT_CONDITION_LABELS } from '../../constants/conditions';
import { DEFAULT_THEME_COLOR } from '../../constants/theme';
import type { Item } from '../../types/item';

function makeUnlockedItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    name: '剛解鎖的外套',
    photoUri: 'mock://photo.jpg',
    price: 1200,
    createdAt: '2026-07-01T00:00:00.000Z',
    unlockDate: '2026-07-01T00:00:00.000Z',
    conditionChecks: [true, true, true, false, false, false],
    status: 'unlocked',
    ...overrides,
  };
}

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
    currentRank: '新使用者',
    conditionLabels: DEFAULT_CONDITION_LABELS,
    themeColor: DEFAULT_THEME_COLOR,
    hydrated: false,
  });
  useUnlockQueueStore.setState({ newlyUnlockedItems: [] });
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

  it('頁首標題置中', async () => {
    await render(<TabsLayout />);
    expect(capturedScreenOptions.headerTitleAlign).toBe('center');
  });

  it('頁首背景綁定目前的主題色', async () => {
    useAppStore.setState({ themeColor: '#8B3A42' });
    await render(<TabsLayout />);
    expect(capturedScreenOptions.headerStyle.backgroundColor).toBe('#8B3A42');
  });

  it('頁首文字（標題與返回鍵）為白色', async () => {
    await render(<TabsLayout />);
    expect(capturedScreenOptions.headerTintColor).toBe('#FFFFFF');
  });

  it('分頁標籤字級放大兩倍（20px，約為預設 10px 的兩倍）', async () => {
    await render(<TabsLayout />);
    expect(capturedScreenOptions.tabBarLabelStyle.fontSize).toBe(20);
  });

  it('不論哪個分頁偵測到單品解鎖，都會在分頁畫面上顯示恭喜解鎖彈窗', async () => {
    useUnlockQueueStore.setState({ newlyUnlockedItems: [makeUnlockedItem()] });
    await render(<TabsLayout />);

    expect(screen.getByText('恭喜解鎖！')).toBeTruthy();
    expect(screen.getByText('剛解鎖的外套')).toBeTruthy();
  });

  it('沒有新解鎖的單品時不顯示彈窗', async () => {
    await render(<TabsLayout />);
    expect(screen.queryByText('恭喜解鎖！')).toBeNull();
  });

  it('按下「太棒了！」會把該筆從佇列移除，彈窗跟著消失', async () => {
    useUnlockQueueStore.setState({ newlyUnlockedItems: [makeUnlockedItem()] });
    await render(<TabsLayout />);

    await fireEvent.press(screen.getByText('太棒了！'));

    expect(screen.queryByText('恭喜解鎖！')).toBeNull();
    expect(useUnlockQueueStore.getState().newlyUnlockedItems).toHaveLength(0);
  });
});
