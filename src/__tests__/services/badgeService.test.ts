import { computeRank, pointsToNextRank } from '../../services/badgeService';

describe('computeRank', () => {
  it.each([
    [0, '尚無段位'],
    [2, '尚無段位'],
    [3, '忍術小達人'],
    [9, '忍術小達人'],
    [10, '王牌忍術師'],
    [19, '王牌忍術師'],
    [20, '金牌忍術師'],
    [49, '金牌忍術師'],
    [50, '白金忍術師'],
    [99, '白金忍術師'],
    [100, '鑽石忍術師'],
    [999, '鑽石忍術師'],
  ])('%i 點 -> %s', (points, expected) => {
    expect(computeRank(points)).toBe(expected);
  });
});

describe('pointsToNextRank', () => {
  it('尚無段位時回傳距離下一段位的點數', () => {
    expect(pointsToNextRank(1)).toBe(2);
  });

  it('剛好在門檻上時回傳距離下一個門檻的點數', () => {
    expect(pointsToNextRank(3)).toBe(7);
  });

  it('已達最高段位時回傳 null', () => {
    expect(pointsToNextRank(100)).toBeNull();
    expect(pointsToNextRank(500)).toBeNull();
  });
});
