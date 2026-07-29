import { RANK_THRESHOLDS } from '../constants/rank';
import type { RankName } from '../constants/rank';

export function computeRank(points: number): RankName {
  let current: RankName = RANK_THRESHOLDS[0].name;
  for (const threshold of RANK_THRESHOLDS) {
    if (points >= threshold.minPoints) {
      current = threshold.name;
    }
  }
  return current;
}

export function pointsToNextRank(points: number): number | null {
  const next = RANK_THRESHOLDS.find((t) => t.minPoints > points);
  return next ? next.minPoints - points : null;
}
