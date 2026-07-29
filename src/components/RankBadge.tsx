import { View, Text, StyleSheet } from 'react-native';
import { RANK_THRESHOLDS, type RankName } from '../constants/rank';
import { COLORS, RADIUS, SHADOW, SPACING, TYPE_SCALE } from '../constants/theme';

interface RankBadgeProps {
  points: number;
  rank: RankName;
  accentColor: string;
}

export function RankBadge({ points, rank, accentColor }: RankBadgeProps) {
  const next = RANK_THRESHOLDS.find((t) => t.minPoints > points);

  return (
    <View testID="rank-badge-card" style={[styles.container, { shadowColor: accentColor }]}>
      <Text style={styles.rank}>{rank}</Text>
      <Text style={styles.points}>目前 {points} 點</Text>
      {next ? (
        <Text style={styles.progress}>距離{next.name}還差 {next.minPoints - points} 點</Text>
      ) : (
        <Text style={styles.progress}>已達最高段位！</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: SPACING.horizontal,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    ...SHADOW.card,
  },
  rank: { fontSize: TYPE_SCALE.title, fontWeight: 'bold', color: COLORS.textPrimary },
  points: { fontSize: TYPE_SCALE.small, marginTop: 4, color: COLORS.textPrimary },
  progress: { fontSize: TYPE_SCALE.caption, marginTop: 4, color: COLORS.textSecondary },
});
