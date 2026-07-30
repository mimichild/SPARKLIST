import { render, screen, fireEvent } from '@testing-library/react-native';
import { CalendarPickerModal } from '../../components/CalendarPickerModal';

describe('CalendarPickerModal', () => {
  it('顯示目前檢視月份的年月標題', async () => {
    await render(
      <CalendarPickerModal
        visible
        initialDate={new Date(2026, 7, 15)}
        accentColor="#EAAFB3"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('2026 年 8 月')).toBeTruthy();
  });

  it('點擊某一天會呼叫 onSelect 並帶入正確日期', async () => {
    const onSelect = jest.fn();
    await render(
      <CalendarPickerModal
        visible
        initialDate={new Date(2026, 7, 15)}
        accentColor="#EAAFB3"
        onSelect={onSelect}
        onClose={jest.fn()}
      />
    );

    await fireEvent.press(screen.getByTestId('calendar-day-2026-08-20'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    const calledDate: Date = onSelect.mock.calls[0][0];
    expect(calledDate.getFullYear()).toBe(2026);
    expect(calledDate.getMonth()).toBe(7);
    expect(calledDate.getDate()).toBe(20);
  });

  it('點擊下一個月箭頭會切換到下個月', async () => {
    await render(
      <CalendarPickerModal
        visible
        initialDate={new Date(2026, 7, 15)}
        accentColor="#EAAFB3"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );

    await fireEvent.press(screen.getByTestId('calendar-next-month'));
    expect(screen.getByText('2026 年 9 月')).toBeTruthy();
  });

  it('點擊上一個月箭頭會切換到上個月', async () => {
    await render(
      <CalendarPickerModal
        visible
        initialDate={new Date(2026, 7, 15)}
        accentColor="#EAAFB3"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );

    await fireEvent.press(screen.getByTestId('calendar-prev-month'));
    expect(screen.getByText('2026 年 7 月')).toBeTruthy();
  });

  it('點擊「關閉」會呼叫 onClose', async () => {
    const onClose = jest.fn();
    await render(
      <CalendarPickerModal
        visible
        initialDate={new Date(2026, 7, 15)}
        accentColor="#EAAFB3"
        onSelect={jest.fn()}
        onClose={onClose}
      />
    );

    await fireEvent.press(screen.getByText('關閉'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
