import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { UnlockDatePicker } from '../../components/UnlockDatePicker';
import { DEFAULT_THEME_COLOR } from '../../constants/theme';

describe('UnlockDatePicker', () => {
  it('預設可以指定其中一個快捷天數為選中狀態', async () => {
    await render(
      <UnlockDatePicker
        unlockDate="2026-08-01T00:00:00.000Z"
        onChange={jest.fn()}
        accentColor={DEFAULT_THEME_COLOR}
        calendarInitialDate={new Date('2026-08-01T00:00:00.000Z')}
        initialSelectedDays={7}
      />
    );

    const selectedButton = screen.getByTestId('quick-date-7');
    expect(StyleSheet.flatten(selectedButton.props.style).backgroundColor).toBe(DEFAULT_THEME_COLOR);
    expect(screen.queryByText(/已選擇/)).toBeNull();
  });

  it('沒有指定預設天數時，一開始不選任何快捷按鈕，並直接顯示目前的日期', async () => {
    await render(
      <UnlockDatePicker
        unlockDate="2026-08-15T00:00:00.000Z"
        onChange={jest.fn()}
        accentColor={DEFAULT_THEME_COLOR}
        calendarInitialDate={new Date('2026-08-15T00:00:00.000Z')}
      />
    );

    expect(screen.getByText('已選擇：2026/8/15')).toBeTruthy();
    const button7 = screen.getByTestId('quick-date-7');
    expect(StyleSheet.flatten(button7.props.style).backgroundColor).not.toBe(DEFAULT_THEME_COLOR);
  });

  it('點擊快捷天數按鈕會呼叫 onChange 並帶入正確天數', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-01T00:00:00.000Z'));
    try {
      const onChange = jest.fn();
      await render(
        <UnlockDatePicker
          unlockDate="2026-08-01T00:00:00.000Z"
          onChange={onChange}
          accentColor={DEFAULT_THEME_COLOR}
          calendarInitialDate={new Date('2026-08-01T00:00:00.000Z')}
        />
      );

      await fireEvent.press(screen.getByText('14 天後'));

      expect(onChange).toHaveBeenCalledTimes(1);
      const calledIso = onChange.mock.calls[0][0];
      const diffDays = (new Date(calledIso).getTime() - new Date('2026-08-01T00:00:00.000Z').getTime()) / 86400000;
      expect(diffDays).toBeCloseTo(14);
    } finally {
      jest.useRealTimers();
    }
  });

  it('點擊「📅 選日期」後在日曆上選日期，會呼叫 onChange 並取消快捷按鈕的選中狀態', async () => {
    const onChange = jest.fn();
    await render(
      <UnlockDatePicker
        unlockDate="2026-08-01T00:00:00.000Z"
        onChange={onChange}
        accentColor={DEFAULT_THEME_COLOR}
        calendarInitialDate={new Date('2026-08-01T00:00:00.000Z')}
        initialSelectedDays={7}
      />
    );

    await fireEvent.press(screen.getByText('📅 選日期'));
    await fireEvent.press(screen.getByTestId('calendar-day-2026-08-20'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const calledIso = onChange.mock.calls[0][0];
    const d = new Date(calledIso);
    expect(d.getDate()).toBe(20);

    const button7 = screen.getByTestId('quick-date-7');
    expect(StyleSheet.flatten(button7.props.style).backgroundColor).not.toBe(DEFAULT_THEME_COLOR);
  });

  it('日曆開啟時預設顯示的月份由 calendarInitialDate 決定', async () => {
    await render(
      <UnlockDatePicker
        unlockDate="2026-08-01T00:00:00.000Z"
        onChange={jest.fn()}
        accentColor={DEFAULT_THEME_COLOR}
        calendarInitialDate={new Date(2026, 2, 15)}
      />
    );

    await fireEvent.press(screen.getByText('📅 選日期'));
    expect(screen.getByText('2026 年 3 月')).toBeTruthy();
  });
});
