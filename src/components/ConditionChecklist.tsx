import { View, Text, Pressable, StyleSheet } from 'react-native';

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
  summary: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkbox: { fontSize: 18, marginRight: 8 },
  label: { fontSize: 15, flex: 1 },
});
