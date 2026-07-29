import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '../../src/store/useAppStore';
import { RankBadge } from '../../src/components/RankBadge';
import * as storage from '../../src/services/storage';
import { computeStats } from '../../src/services/itemService';
import {
  THEME_COLOR_OPTIONS,
  COLORS,
  SPACING,
  RADIUS,
  SHADOW,
  TYPE_SCALE,
  getContrastColor,
} from '../../src/constants/theme';
import type { HistoryStats } from '../../src/types/item';

export default function MeScreen() {
  const { ninjaPoints, currentRank, conditionLabels, themeColor, hydrate, setConditionLabels, setThemeColor } =
    useAppStore();
  const [stats, setStats] = useState<HistoryStats>({ resistedCount: 0, savedAmount: 0 });
  const [isEditingConditions, setIsEditingConditions] = useState(false);
  const [draftLabels, setDraftLabels] = useState(conditionLabels);

  // Hydration should only run once on mount, not on every focus.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Stats (resisted count / saved amount) can go stale after a delete
  // elsewhere in the app, so re-read them every time this screen
  // regains focus.
  useFocusEffect(
    useCallback(() => {
      storage.getHistory().then((history) => setStats(computeStats(history)));
    }, [])
  );

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

      <RankBadge points={ninjaPoints} rank={currentRank} accentColor={themeColor} />

      <View style={[styles.statsRow, { shadowColor: themeColor }]}>
        <Text style={styles.statText}>累計放棄 {stats.resistedCount} 次</Text>
        <Text style={styles.statText}>估計省下 NT$ {stats.savedAmount}</Text>
      </View>

      <Text style={styles.sectionTitle}>主題色</Text>
      <View style={styles.themeRow}>
        {THEME_COLOR_OPTIONS.map((color, index) => (
          <Pressable
            key={color}
            testID={`theme-color-${index}`}
            style={[
              styles.themeSwatch,
              { backgroundColor: color },
              themeColor === color && { borderColor: getContrastColor(color), borderWidth: 3 },
            ]}
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
          <Pressable style={[styles.saveButton, { backgroundColor: themeColor }]} onPress={handleSaveConditions}>
            <Text style={[styles.saveButtonText, { color: getContrastColor(themeColor) }]}>儲存條件</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.horizontal, backgroundColor: COLORS.background, flexGrow: 1 },
  title: { fontSize: TYPE_SCALE.title, fontWeight: 'bold', marginBottom: SPACING.verticalLarge, color: COLORS.textPrimary },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: SPACING.verticalLarge,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.verticalMedium,
    ...SHADOW.card,
  },
  statText: { fontSize: TYPE_SCALE.small, color: COLORS.textPrimary },
  sectionTitle: {
    fontSize: TYPE_SCALE.subtitle,
    fontWeight: '600',
    marginTop: SPACING.verticalLarge,
    marginBottom: SPACING.verticalSmall,
    color: COLORS.textPrimary,
  },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  themeSwatch: { width: 32, height: 32, borderRadius: 16 },
  conditionInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.card,
    padding: SPACING.verticalMedium,
    marginBottom: SPACING.verticalSmall,
    color: COLORS.textPrimary,
  },
  saveButton: {
    padding: SPACING.verticalMedium,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    marginTop: SPACING.verticalSmall,
  },
  saveButtonText: { fontWeight: '600', fontSize: TYPE_SCALE.body },
});
