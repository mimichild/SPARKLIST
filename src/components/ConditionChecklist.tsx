import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPE_SCALE } from '../constants/theme';

interface ConditionChecklistProps {
  labels: string[];
  checks: boolean[];
  onToggle: (index: number) => void;
}

export function ConditionChecklist({ labels, checks, onToggle }: ConditionChecklistProps) {
  const checkedCount = checks.filter(Boolean).length;

  return (
    <View>
      <Text style={styles.summary}>已勾選 {checkedCount} / {labels.length} 項</Text>
      {labels.map((label, index) => (
        <Pressable key={label} style={styles.row} onPress={() => onToggle(index)}>
          <Text style={styles.checkbox}>{checks[index] ? '☑' : '☐'}</Text>
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { fontSize: TYPE_SCALE.caption, fontWeight: '600', marginBottom: SPACING.verticalSmall, color: COLORS.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.verticalMedium },
  checkbox: { fontSize: 18, marginRight: SPACING.verticalSmall },
  label: { fontSize: TYPE_SCALE.body, flex: 1, color: COLORS.textPrimary },
});
