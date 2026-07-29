import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useItems } from '../../src/hooks/useItems';
import { useAppStore } from '../../src/store/useAppStore';
import { ConditionChecklist } from '../../src/components/ConditionChecklist';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, updateConditionChecks } = useItems();
  const conditionLabels = useAppStore((s) => s.conditionLabels);

  const item = items.find((i) => i.id === id);

  if (!item) {
    return (
      <View style={styles.container}>
        <Text>找不到這筆單品</Text>
      </View>
    );
  }

  const toggleCheck = (index: number) => {
    const nextChecks = item.conditionChecks.map((v, i) => (i === index ? !v : v));
    updateConditionChecks(item.id, nextChecks);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.price}>NT$ {item.price}</Text>
      {item.note ? <Text style={styles.note}>{item.note}</Text> : null}

      <ConditionChecklist labels={conditionLabels} checks={item.conditionChecks} onToggle={toggleCheck} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  name: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  price: { fontSize: 16, marginBottom: 8 },
  note: { fontSize: 14, color: '#666', marginBottom: 16 },
});
