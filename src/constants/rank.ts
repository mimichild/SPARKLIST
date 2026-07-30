export type RankName =
  | '新使用者'
  | '忍術小達人'
  | '王牌忍術師'
  | '金牌忍術師'
  | '白金忍術師'
  | '鑽石忍術師';

export interface RankThreshold {
  minPoints: number;
  name: RankName;
}

export const RANK_THRESHOLDS: RankThreshold[] = [
  { minPoints: 0, name: '新使用者' },
  { minPoints: 3, name: '忍術小達人' },
  { minPoints: 10, name: '王牌忍術師' },
  { minPoints: 20, name: '金牌忍術師' },
  { minPoints: 50, name: '白金忍術師' },
  { minPoints: 100, name: '鑽石忍術師' },
];
