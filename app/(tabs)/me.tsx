import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
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
} from '../../src/constants/theme';
import { MIN_CONDITIONS_TO_UNLOCK, MAX_CONDITION_COUNT } from '../../src/constants/conditions';
import type { HistoryStats } from '../../src/types/item';

export default function MeScreen() {
  const { ninjaPoints, currentRank, conditionLabels, themeColor, hydrate, setConditionLabels, setThemeColor } =
    useAppStore();
  const [stats, setStats] = useState<HistoryStats>({ resistedCount: 0, savedAmount: 0 });
  const [draftLabels, setDraftLabels] = useState(conditionLabels);
  // Tracks whether draftLabels has unsaved local edits, so the sync effect
  // below doesn't clobber them if conditionLabels changes externally
  // (e.g. hydrate() resolving) while the user is mid-edit.
  const [isDirty, setIsDirty] = useState(false);

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
    if (!isDirty) {
      setDraftLabels(conditionLabels);
    }
  }, [conditionLabels, isDirty]);

  const updateDraftLabel = (index: number, text: string) => {
    setIsDirty(true);
    setDraftLabels((prev) => prev.map((l, i) => (i === index ? text : l)));
  };

  const addDraftLabel = () => {
    setIsDirty(true);
    setDraftLabels((prev) => [...prev, '']);
  };

  const deleteDraftLabel = (index: number) => {
    setIsDirty(true);
    setDraftLabels((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveConditions = async () => {
    await setConditionLabels(draftLabels);
    setIsDirty(false);
    Alert.alert('已儲存');
  };

  const handleCancelConditions = () => {
    setDraftLabels(conditionLabels);
    setIsDirty(false);
    Alert.alert('已取消，條件內容恢復原狀');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <RankBadge points={ninjaPoints} rank={currentRank} accentColor={themeColor} />

      <View style={[styles.statsRow, { shadowColor: themeColor }]}>
        <Text style={styles.statText}>累計忍住 {stats.resistedCount} 次</Text>
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
              themeColor === color && styles.themeSwatchSelected,
            ]}
            onPress={() => setThemeColor(color)}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>編輯條件</Text>

      <View>
        {draftLabels.map((label, index) => (
          <View key={index} style={styles.conditionRow}>
            <TextInput
              style={[styles.conditionInput, styles.conditionInputFlex]}
              value={label}
              onChangeText={(text) => updateDraftLabel(index, text)}
            />
            {draftLabels.length > MIN_CONDITIONS_TO_UNLOCK ? (
              <Pressable style={styles.deleteConditionButton} onPress={() => deleteDraftLabel(index)}>
                <Text style={styles.deleteConditionButtonText}>刪除</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        {draftLabels.length < MAX_CONDITION_COUNT ? (
          <Pressable style={styles.addConditionButton} onPress={addDraftLabel}>
            <Text style={styles.addConditionButtonText}>＋ 新增條件</Text>
          </Pressable>
        ) : null}

        <View style={styles.conditionActionsRow}>
          <Pressable style={styles.cancelButton} onPress={handleCancelConditions}>
            <Text style={styles.cancelButtonText}>取消</Text>
          </Pressable>
          <Pressable
            style={[styles.saveButton, { backgroundColor: themeColor }]}
            onPress={handleSaveConditions}
          >
            <Text style={styles.saveButtonText}>儲存</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.horizontal, backgroundColor: COLORS.background, flexGrow: 1 },
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
  themeSwatchSelected: { borderColor: '#FFFFFF', borderWidth: 3 },
  conditionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.verticalSmall },
  conditionInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.card,
    padding: SPACING.verticalMedium,
    color: COLORS.textPrimary,
  },
  conditionInputFlex: { flex: 1 },
  deleteConditionButton: {
    paddingVertical: SPACING.verticalSmall,
    paddingHorizontal: SPACING.verticalMedium,
    borderRadius: RADIUS.card,
    backgroundColor: '#FFE3E3',
  },
  deleteConditionButtonText: { fontSize: TYPE_SCALE.caption, color: COLORS.error },
  addConditionButton: {
    paddingVertical: SPACING.verticalMedium,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: SPACING.verticalSmall,
  },
  addConditionButtonText: { fontSize: TYPE_SCALE.small, color: COLORS.textPrimary },
  conditionActionsRow: { flexDirection: 'row', gap: 8, marginTop: SPACING.verticalSmall },
  cancelButton: {
    flex: 1,
    padding: SPACING.verticalMedium,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: { fontWeight: '600', fontSize: TYPE_SCALE.body, color: COLORS.textPrimary },
  saveButton: {
    flex: 1,
    padding: SPACING.verticalMedium,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
  },
  saveButtonText: { fontWeight: '600', fontSize: TYPE_SCALE.body, color: '#FFFFFF' },
});
