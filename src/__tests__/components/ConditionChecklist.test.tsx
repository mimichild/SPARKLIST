import { render, screen, fireEvent } from '@testing-library/react-native';
import { ConditionChecklist } from '../../components/ConditionChecklist';

describe('ConditionChecklist', () => {
  const labels = ['條件一', '條件二', '條件三'];

  it('渲染所有條件文字', async () => {
    await render(<ConditionChecklist labels={labels} checks={[false, false, false]} onToggle={jest.fn()} />);
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  it('點擊某一項條件會呼叫 onToggle 並帶入正確 index', async () => {
    const onToggle = jest.fn();
    await render(<ConditionChecklist labels={labels} checks={[false, false, false]} onToggle={onToggle} />);

    fireEvent.press(screen.getByText('條件二'));
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('顯示目前勾選數量', async () => {
    await render(<ConditionChecklist labels={labels} checks={[true, true, false]} onToggle={jest.fn()} />);
    expect(screen.getByText('已勾選 2 / 3 項')).toBeTruthy();
  });
});
