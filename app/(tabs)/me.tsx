import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { RankBadge } from '../../src/components/RankBadge';
import * as storage from '../../src/services/storage';
import { computeStats } from '../../src/services/itemService';
import { THEME_COLOR_OPTIONS } from '../../src/constants/theme';
import type { HistoryStats } from '../../src/types/item';

export default function MeScreen() {
  const { ninjaPoints, currentRank, conditionLabels, themeColor, hydrate, setConditionLabels, setThemeColor } =
    useAppStore();
  const [stats, setStats] = useState<HistoryStats>({ resistedCount: 0, savedAmount: 0 });
  const [isEditingConditions, setIsEditingConditions] = useState(false);
  const [draftLabels, setDraftLabels] = useState(conditionLabels);

  useEffect(() => {
    hydrate();
    storage.getHistory().then((history) => setStats(computeStats(history)));
  }, [hydrate]);

  useEffect(() => {
    if (!isEditingConditions) {
      setDraftLabels(conditionLabels);
    }
  }, [conditionLabels, isEditingConditions]);

  const handleSaveConditions = async () => {
    await setConditionLabels(draftLabels);
    setIsEditingConditions(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>我的</Text>

      <RankBadge points={ninjaPoints} rank={currentRank} />

      <View style={styles.statsRow}>
        <Text style={styles.statText}>累計放棄 {stats.resistedCount} 次</Text>
        <Text style={styles.statText}>估計省下 NT$ {stats.savedAmount}</Text>
      </View>

      <Text style={styles.sectionTitle}>主題色</Text>
      <View style={styles.themeRow}>
        {THEME_COLOR_OPTIONS.map((color, index) => (
          <Pressable
            key={color}
            testID={`theme-color-${index}`}
            style={[styles.themeSwatch, { backgroundColor: color }, themeColor === color && styles.themeSwatchActive]}
            onPress={() => setThemeColor(color)}
          />
        ))}
      </View>

      <Pressable onPress={() => setIsEditingConditions((prev) => !prev)}>
        <Text style={styles.sectionTitle}>編輯六項條件</Text>
      </Pressable>

      {isEditingConditions ? (
        <View>
          {draftLabels.map((label, index) => (
            <TextInput
              key={index}
              style={styles.conditionInput}
              value={label}
              onChangeText={(text) =>
                setDraftLabels((prev) => prev.map((l, i) => (i === index ? text : l)))
              }
            />
          ))}
          <Pressable style={styles.saveButton} onPress={handleSaveConditions}>
            <Text style={styles.saveButtonText}>儲存條件</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 16 },
  statText: { fontSize: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  themeRow: { flexDirection: 'row', gap: 12 },
  themeSwatch: { width: 32, height: 32, borderRadius: 16 },
  themeSwatchActive: { borderWidth: 3, borderColor: '#333' },
  conditionInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8 },
  saveButton: { backgroundColor: '#4DABF7', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#fff', fontWeight: '600' },
});
