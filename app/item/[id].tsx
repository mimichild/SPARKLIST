import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useItems } from '../../src/hooks/useItems';
import { useAppStore } from '../../src/store/useAppStore';
import { ConditionChecklist } from '../../src/components/ConditionChecklist';
import { COLORS, SPACING, TYPE_SCALE } from '../../src/constants/theme';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, updateConditionChecks } = useItems();
  const conditionLabels = useAppStore((s) => s.conditionLabels);

  const item = items.find((i) => i.id === id);

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>找不到這筆單品</Text>
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
  container: { padding: SPACING.horizontal, backgroundColor: COLORS.background, flexGrow: 1 },
  name: { fontSize: TYPE_SCALE.title, fontWeight: 'bold', marginBottom: 4, color: COLORS.textPrimary },
  price: { fontSize: TYPE_SCALE.body, marginBottom: SPACING.verticalSmall, color: COLORS.textPrimary },
  note: { fontSize: TYPE_SCALE.small, color: COLORS.textSecondary, marginBottom: SPACING.verticalLarge },
  notFound: { fontSize: TYPE_SCALE.body, color: COLORS.textSecondary },
});
