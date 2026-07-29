import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MeScreen from '../../../app/(tabs)/me';
import { useAppStore } from '../../store/useAppStore';
import * as storage from '../../services/storage';
import { DEFAULT_CONDITION_LABELS } from '../../constants/conditions';
import { DEFAULT_THEME_COLOR } from '../../constants/theme';

beforeEach(async () => {
  await AsyncStorage.clear();
  useAppStore.setState({
    ninjaPoints: 0,
    currentRank: '尚無段位',
    conditionLabels: DEFAULT_CONDITION_LABELS,
    themeColor: DEFAULT_THEME_COLOR,
    hydrated: false,
  });
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
      expect(screen.getByText('累計放棄 2 次')).toBeTruthy();
      expect(screen.getByText('估計省下 NT$ 300')).toBeTruthy();
    });
  });

  it('可以編輯六項條件文字', async () => {
    await render(<MeScreen />);

    await waitFor(() => expect(screen.getByText('編輯六項條件')).toBeTruthy());
    await fireEvent.press(screen.getByText('編輯六項條件'));

    const firstInput = screen.getByDisplayValue(DEFAULT_CONDITION_LABELS[0]);
    await fireEvent.changeText(firstInput, '改過的條件文字');

    await act(async () => {
      await fireEvent.press(screen.getByText('儲存條件'));
    });

    await waitFor(() => {
      expect(useAppStore.getState().conditionLabels[0]).toBe('改過的條件文字');
    });
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

  it('當編輯中時，不應被店鋪狀態更新覆蓋（防止競態條件）', async () => {
    await render(<MeScreen />);

    // 開啟編輯面板
    await waitFor(() => expect(screen.getByText('編輯六項條件')).toBeTruthy());
    await fireEvent.press(screen.getByText('編輯六項條件'));

    // 用戶在第一個輸入框輸入新文字
    const firstInput = screen.getByDisplayValue(DEFAULT_CONDITION_LABELS[0]);
    const userEditedText = '用戶編輯的文字';
    await fireEvent.changeText(firstInput, userEditedText);

    // 驗證 draftLabels 已更新
    await waitFor(() => {
      expect(screen.getByDisplayValue(userEditedText)).toBeTruthy();
    });

    // 模擬外部狀態更新（例如 hydrate() 解決後的情況）
    // 這會觸發 useEffect，但因為 isEditingConditions === true，
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
