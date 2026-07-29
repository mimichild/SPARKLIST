import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { RankBadge } from '../../components/RankBadge';

describe('RankBadge', () => {
  it('顯示目前段位與點數', async () => {
    await render(<RankBadge points={12} rank="王牌忍術師" accentColor="#EAAFB3" />);
    expect(screen.getByText('王牌忍術師')).toBeTruthy();
    expect(screen.getByText('目前 12 點')).toBeTruthy();
  });

  it('未達最高段位時顯示距離下一段位還差幾點', async () => {
    await render(<RankBadge points={12} rank="王牌忍術師" accentColor="#EAAFB3" />);
    expect(screen.getByText('距離金牌忍術師還差 8 點')).toBeTruthy();
  });

  it('已達最高段位時顯示恭喜文字而非「還差幾點」', async () => {
    await render(<RankBadge points={150} rank="鑽石忍術師" accentColor="#EAAFB3" />);
    expect(screen.getByText('已達最高段位！')).toBeTruthy();
  });

  it('卡片陰影顏色會套用傳入的 accentColor', async () => {
    await render(<RankBadge points={0} rank="尚無段位" accentColor="#a7c7e7" />);
    const card = screen.getByTestId('rank-badge-card');
    expect(StyleSheet.flatten(card.props.style).shadowColor).toBe('#a7c7e7');
  });
});
