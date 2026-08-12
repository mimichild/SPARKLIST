import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ProgressModal } from '../../components/ProgressModal';

describe('ProgressModal', () => {
  it('visible 為 true 時顯示標籤與進度數字', async () => {
    await render(<ProgressModal visible label="匯出中" current={2} total={5} accentColor="#EAAFB3" />);

    expect(screen.getByText('匯出中')).toBeTruthy();
    expect(screen.getByTestId('progress-modal-count').props.children).toEqual([2, ' / ', 5]);
  });

  it('進度條寬度依 current/total 計算百分比', async () => {
    await render(<ProgressModal visible label="匯出中" current={2} total={4} accentColor="#EAAFB3" />);

    const bar = screen.getByTestId('progress-modal-bar');
    expect(StyleSheet.flatten(bar.props.style).width).toBe('50%');
  });

  it('total 為 0 時進度條寬度為 0%，不會噴錯', async () => {
    await render(<ProgressModal visible label="準備中" current={0} total={0} accentColor="#EAAFB3" />);

    const bar = screen.getByTestId('progress-modal-bar');
    expect(StyleSheet.flatten(bar.props.style).width).toBe('0%');
  });

  it('visible 為 false 時不顯示內容', async () => {
    await render(<ProgressModal visible={false} label="匯出中" current={0} total={0} accentColor="#EAAFB3" />);

    expect(screen.queryByText('匯出中')).toBeNull();
  });
});
