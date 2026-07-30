import { RANK_THRESHOLDS } from '../../constants/rank';

describe('rank thresholds', () => {
  it('門檻依點數由小到大排序', () => {
    const points = RANK_THRESHOLDS.map((t) => t.minPoints);
    expect(points).toEqual([...points].sort((a, b) => a - b));
  });

  it('段位名稱與 spec 逐字相符', () => {
    expect(RANK_THRESHOLDS.map((t) => t.name)).toEqual([
      '新使用者',
      '忍術小達人',
      '王牌忍術師',
      '金牌忍術師',
      '白金忍術師',
      '鑽石忍術師',
    ]);
  });

  it('點數門檻與 spec 逐字相符', () => {
    expect(RANK_THRESHOLDS.map((t) => t.minPoints)).toEqual([0, 3, 10, 20, 50, 100]);
  });
});
