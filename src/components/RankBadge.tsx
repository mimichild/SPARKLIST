import { View, Text, StyleSheet } from 'react-native';
import { RANK_THRESHOLDS, type RankName } from '../constants/rank';

interface RankBadgeProps {
  points: number;
  rank: RankName;
}

export function RankBadge({ points, rank }: RankBadgeProps) {
  const next = RANK_THRESHOLDS.find((t) => t.minPoints > points);

  return (
    <View style={styles.container}>
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
  container: { alignItems: 'center', padding: 16 },
  rank: { fontSize: 24, fontWeight: 'bold' },
  points: { fontSize: 14, marginTop: 4 },
  progress: { fontSize: 13, marginTop: 4, color: '#666' },
});
