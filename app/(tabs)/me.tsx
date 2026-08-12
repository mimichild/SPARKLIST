import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Switch, Alert, StyleSheet } from 'react-native';
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
import { ProgressModal } from '../../src/components/ProgressModal';
import * as backupService from '../../src/services/backupService';
import * as backupFileService from '../../src/services/backupFileService';

export default function MeScreen() {
  const {
    ninjaPoints,
    currentRank,
    conditionLabels,
    themeColor,
    soundEnabled,
    hydrate,
    setConditionLabels,
    setThemeColor,
    setSoundEnabled,
  } = useAppStore();
  const [stats, setStats] = useState<HistoryStats>({ resistedCount: 0, savedAmount: 0 });
  const [draftLabels, setDraftLabels] = useState(conditionLabels);
  // Tracks whether draftLabels has unsaved local edits, so the sync effect
  // below doesn't clobber them if conditionLabels changes externally
  // (e.g. hydrate() resolving) while the user is mid-edit.
  const [isDirty, setIsDirty] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

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

  const runExport = async (destination: 'share' | 'local') => {
    try {
      setExportProgress({ current: 0, total: 0 });
      const payload = await backupService.buildBackupPayload((current, total) => {
        setExportProgress({ current, total });
      });
      const filename = backupService.buildBackupFilename(new Date());
      const content = JSON.stringify(payload);

      if (destination === 'share') {
        setExportProgress(null);
        await backupFileService.shareBackupFile(content, filename);
        Alert.alert('已透過分享完成匯出');
      } else {
        const result = await backupFileService.saveBackupToFolder(content, filename);
        setExportProgress(null);
        if (result) {
          Alert.alert('已匯出', `存於：${result.folderDisplayName}/${filename}`);
        }
      }
    } catch (error) {
      setExportProgress(null);
      Alert.alert('匯出失敗', error instanceof Error ? error.message : '發生未知錯誤');
    }
  };

  const handleExportPress = () => {
    Alert.alert('匯出資料', '請選擇匯出方式', [
      { text: '分享', onPress: () => runExport('share') },
      { text: '存到本機', onPress: () => runExport('local') },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const runImport = async (payload: backupService.BackupPayload, mode: backupService.ImportMode) => {
    try {
      setImportProgress({ current: 0, total: 0 });
      const result = await backupService.applyBackupPayload(payload, mode, (current, total) => {
        setImportProgress({ current, total });
      });
      setImportProgress(null);
      await hydrate();
      const history = await storage.getHistory();
      setStats(computeStats(history));
      Alert.alert('已匯入', `已匯入 ${result.importedItemCount} 筆單品`);
    } catch (error) {
      setImportProgress(null);
      Alert.alert('匯入失敗', error instanceof Error ? error.message : '發生未知錯誤');
    }
  };

  const handleImportPress = async () => {
    const content = await backupFileService.pickBackupFile();
    if (!content) {
      return;
    }

    let payload: backupService.BackupPayload;
    try {
      payload = backupService.parseBackupPayload(content);
    } catch (error) {
      Alert.alert('匯入失敗', error instanceof Error ? error.message : '發生未知錯誤');
      return;
    }

    const existingItems = await storage.getItems();
    const existingHistory = await storage.getHistory();

    if (existingItems.length > 0 || existingHistory.length > 0) {
      Alert.alert('匯入資料', '本機已有資料，請選擇匯入方式', [
        { text: '覆蓋', onPress: () => runImport(payload, 'overwrite') },
        { text: '合併', onPress: () => runImport(payload, 'merge') },
        { text: '取消', style: 'cancel' },
      ]);
    } else {
      runImport(payload, 'overwrite');
    }
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

      <Text style={styles.sectionTitle}>音效</Text>
      <View style={styles.soundRow}>
        <Text style={styles.soundLabel}>關閉音效</Text>
        <Switch
          testID="mute-sound-switch"
          value={!soundEnabled}
          onValueChange={(muted) => setSoundEnabled(!muted)}
          trackColor={{ true: themeColor }}
        />
      </View>

      <Text style={styles.sectionTitle}>資料備份</Text>
      <View style={styles.backupRow}>
        <Pressable
          testID="export-data-button"
          style={[styles.backupButton, { backgroundColor: themeColor }]}
          onPress={handleExportPress}
        >
          <Text style={styles.backupButtonText}>匯出資料</Text>
        </Pressable>
        <Pressable testID="import-data-button" style={styles.backupButtonOutline} onPress={handleImportPress}>
          <Text style={styles.backupButtonOutlineText}>匯入資料</Text>
        </Pressable>
      </View>

      <ProgressModal
        visible={exportProgress !== null}
        label="匯出中"
        current={exportProgress?.current ?? 0}
        total={exportProgress?.total ?? 0}
        accentColor={themeColor}
      />
      <ProgressModal
        visible={importProgress !== null}
        label="匯入中"
        current={importProgress?.current ?? 0}
        total={importProgress?.total ?? 0}
        accentColor={themeColor}
      />

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
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.verticalMedium,
    paddingHorizontal: SPACING.horizontal,
    ...SHADOW.card,
  },
  soundLabel: { fontSize: TYPE_SCALE.body, color: COLORS.textPrimary },
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
  backupRow: { flexDirection: 'row', gap: 8 },
  backupButton: { flex: 1, padding: SPACING.verticalMedium, borderRadius: RADIUS.pill, alignItems: 'center' },
  backupButtonText: { fontWeight: '600', fontSize: TYPE_SCALE.body, color: '#FFFFFF' },
  backupButtonOutline: {
    flex: 1,
    padding: SPACING.verticalMedium,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backupButtonOutlineText: { fontWeight: '600', fontSize: TYPE_SCALE.body, color: COLORS.textPrimary },
});
