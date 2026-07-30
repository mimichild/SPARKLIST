import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MeScreen from '../../../app/(tabs)/me';
import { useAppStore } from '../../store/useAppStore';
import * as storage from '../../services/storage';
import { DEFAULT_CONDITION_LABELS } from '../../constants/conditions';
import { DEFAULT_THEME_COLOR } from '../../constants/theme';

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
  useAppStore.setState({
    ninjaPoints: 0,
    currentRank: '新使用者',
    conditionLabels: DEFAULT_CONDITION_LABELS,
    themeColor: DEFAULT_THEME_COLOR,
    hydrated: false,
  });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('MeScreen', () => {
  it('顯示目前段位與統計數據', async () => {
    await storage.saveAppState({ ninjaPoints: 10, conditionLabels: DEFAULT_CONDITION_LABELS, themeColor: DEFAULT_THEME_COLOR });
    await storage.saveHistory([
      { id: 'h1', itemName: 'A', price: 100, outcome: 'resisted', recordedAt: '2026-07-01T00:00:00.000Z' },
      { id: 'h2', itemName: 'B', price: 200, outcome: 'resisted', recordedAt: '2026-07-02T00:00:00.000Z' },
      { id: 'h3', itemName: 'C', price: 300, outcome: 'purchased', recordedAt: '2026-07-03T00:00:00.000Z' },
    ]);

    await render(<MeScreen />);

    await waitFor(() => {
      expect(screen.getByText('王牌忍術師')).toBeTruthy();
      expect(screen.getByText('累計忍住 2 次')).toBeTruthy();
      expect(screen.getByText('估計省下 NT$ 300')).toBeTruthy();
    });
  });

  it('畫面重新取得焦點時會重新載入統計數據（例如其他畫面刪除單品後）', async () => {
    await render(<MeScreen />);
    await waitFor(() => {
      expect(screen.getByText('累計忍住 0 次')).toBeTruthy();
      expect(screen.getByText('估計省下 NT$ 0')).toBeTruthy();
    });

    // Simulate a delete happening on another already-mounted tab while
    // this screen isn't focused.
    await storage.saveHistory([
      { id: 'h1', itemName: 'A', price: 500, outcome: 'resisted', recordedAt: '2026-07-01T00:00:00.000Z' },
    ]);

    // Simulate navigating back to this tab (a focus event).
    await act(async () => {
      mockFocusCallback?.();
    });

    await waitFor(() => {
      expect(screen.getByText('累計忍住 1 次')).toBeTruthy();
      expect(screen.getByText('估計省下 NT$ 500')).toBeTruthy();
    });
  });

  it('可以編輯條件文字', async () => {
    await render(<MeScreen />);

    // 條件編輯區塊預設就主動展開顯示，不需要額外點擊才看得到。
    await waitFor(() => expect(screen.getByText('編輯條件')).toBeTruthy());
    expect(screen.getAllByText('刪除')).toHaveLength(6);

    const firstInput = screen.getByDisplayValue(DEFAULT_CONDITION_LABELS[0]);
    await fireEvent.changeText(firstInput, '改過的條件文字');

    await act(async () => {
      await fireEvent.press(screen.getByText('儲存'));
    });

    await waitFor(() => {
      expect(useAppStore.getState().conditionLabels[0]).toBe('改過的條件文字');
    });
    expect(Alert.alert).toHaveBeenCalledWith('已儲存');
  });

  it('可以新增一項條件（超過上限 10 項後不再顯示新增按鈕）', async () => {
    // 從 6 項預設條件開始，新增 4 次到 10 項上限。
    useAppStore.setState({ conditionLabels: DEFAULT_CONDITION_LABELS });
    await render(<MeScreen />);

    for (let i = 0; i < 4; i += 1) {
      await fireEvent.press(screen.getByText('＋ 新增條件'));
    }

    await waitFor(() => {
      expect(screen.queryAllByDisplayValue('').length).toBe(4);
      expect(screen.queryByText('＋ 新增條件')).toBeNull();
    });
  });

  it('條件超過 3 項時可以刪除；只剩 3 項時刪除按鈕消失', async () => {
    useAppStore.setState({ conditionLabels: DEFAULT_CONDITION_LABELS });
    await render(<MeScreen />);

    expect(screen.getAllByText('刪除')).toHaveLength(6);

    // 刪到只剩 3 項。
    for (let i = 0; i < 3; i += 1) {
      await fireEvent.press(screen.getAllByText('刪除')[0]);
    }

    await waitFor(() => {
      expect(screen.queryByText('刪除')).toBeNull();
    });

    await act(async () => {
      await fireEvent.press(screen.getByText('儲存'));
    });

    await waitFor(() => {
      expect(useAppStore.getState().conditionLabels).toHaveLength(3);
    });
  });

  it('編輯條件時按下「取消」，不會儲存變更，且還原顯示原本的條件內容', async () => {
    await render(<MeScreen />);

    const firstInput = screen.getByDisplayValue(DEFAULT_CONDITION_LABELS[0]);
    await fireEvent.changeText(firstInput, '不想儲存的文字');
    await fireEvent.press(screen.getByText('＋ 新增條件'));

    await fireEvent.press(screen.getByText('取消'));

    await waitFor(() => {
      expect(screen.getByDisplayValue(DEFAULT_CONDITION_LABELS[0])).toBeTruthy();
      expect(screen.queryByDisplayValue('不想儲存的文字')).toBeNull();
    });
    expect(useAppStore.getState().conditionLabels).toEqual(DEFAULT_CONDITION_LABELS);
    expect(Alert.alert).toHaveBeenCalledWith('已取消，條件內容恢復原狀');
  });

  it('可以選擇主題色', async () => {
    await render(<MeScreen />);
    await waitFor(() => expect(screen.getByText('主題色')).toBeTruthy());

    await act(async () => {
      await fireEvent.press(screen.getByTestId('theme-color-1'));
    });

    await waitFor(() => {
      expect(useAppStore.getState().themeColor).not.toBe(DEFAULT_THEME_COLOR);
    });
  });

  it('選中的主題色色塊，外框固定為白色（不是黑色）', async () => {
    await render(<MeScreen />);

    await act(async () => {
      await fireEvent.press(screen.getByTestId('theme-color-1'));
    });

    await waitFor(() => {
      const selectedSwatch = screen.getByTestId('theme-color-1');
      expect(StyleSheet.flatten(selectedSwatch.props.style).borderColor).toBe('#FFFFFF');
    });
  });

  it('有未儲存的編輯時，不應被店鋪狀態更新覆蓋（防止競態條件）', async () => {
    await render(<MeScreen />);

    // 用戶在第一個輸入框輸入新文字
    const firstInput = screen.getByDisplayValue(DEFAULT_CONDITION_LABELS[0]);
    const userEditedText = '用戶編輯的文字';
    await fireEvent.changeText(firstInput, userEditedText);

    // 驗證 draftLabels 已更新
    await waitFor(() => {
      expect(screen.getByDisplayValue(userEditedText)).toBeTruthy();
    });

    // 模擬外部狀態更新（例如 hydrate() 解決後的情況）
    // 這會觸發 useEffect，但因為 draftLabels 已被標記為 dirty，
    // 不應該覆蓋 draftLabels
    const newConditionLabels = ['外部更新的條件1', '外部更新的條件2', '外部更新的條件3', '外部更新的條件4', '外部更新的條件5', '外部更新的條件6'];
    await act(async () => {
      useAppStore.setState({ conditionLabels: newConditionLabels });
    });

    // 關鍵斷言：用戶編輯的文字應該保留，不被覆蓋
    await waitFor(() => {
      expect(screen.getByDisplayValue(userEditedText)).toBeTruthy();
    });

    // 驗證未被修改的欄位確實被外部更新的值替換（用於確認測試邏輯正確）
    // 因為編輯中，draftLabels 不應該更新
    expect(screen.queryByDisplayValue(newConditionLabels[1])).toBeFalsy();
  });
});
