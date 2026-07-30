import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Image, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useItems } from '../../src/hooks/useItems';
import { useAppStore } from '../../src/store/useAppStore';
import { ConditionChecklist } from '../../src/components/ConditionChecklist';
import { PhotoAdjustModal } from '../../src/components/PhotoAdjustModal';
import { UnlockDatePicker } from '../../src/components/UnlockDatePicker';
import { COLORS, RADIUS, SPACING, TYPE_SCALE } from '../../src/constants/theme';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { items, updateItem } = useItems();
  const { themeColor, conditionLabels } = useAppStore();

  const item = items.find((i) => i.id === id);

  const [isInitialized, setIsInitialized] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [draftPhotoUri, setDraftPhotoUri] = useState('');
  // Preserves whatever ratio the user shot/picked the photo in (3:4, 4:3,
  // 1:1, ...) so it never gets force-cropped to a fixed box.
  const [draftPhotoAspectRatio, setDraftPhotoAspectRatio] = useState<number | undefined>(undefined);
  const [draftChecks, setDraftChecks] = useState<boolean[]>([]);
  const [draftUnlockDate, setDraftUnlockDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Holds a freshly picked photo awaiting the pinch/pan adjust step before
  // it's confirmed as the item's photo.
  const [pendingAsset, setPendingAsset] = useState<{ uri: string; width: number; height: number } | null>(null);

  // Populate the draft once from the loaded item. Guarded by isInitialized
  // so later reloads (e.g. another screen recalculating item statuses)
  // never clobber edits the user hasn't saved yet.
  useEffect(() => {
    if (item && !isInitialized) {
      setDraftName(item.name);
      setDraftPrice(String(item.price));
      setDraftUrl(item.url ?? '');
      setDraftNote(item.note ?? '');
      setDraftPhotoUri(item.photoUri);
      setDraftPhotoAspectRatio(item.photoAspectRatio);
      setDraftChecks(item.conditionChecks);
      setDraftUnlockDate(item.unlockDate);
      setIsInitialized(true);
    }
  }, [item, isInitialized]);

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>找不到這筆單品</Text>
      </View>
    );
  }

  const toggleDraftCheck = (index: number) => {
    setDraftChecks((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const applyPickedAsset = (asset: ImagePicker.ImagePickerAsset) => {
    if (asset.width && asset.height) {
      // Route through the adjust step so the user can pinch/pan before
      // it's confirmed as the item's photo.
      setPendingAsset({ uri: asset.uri, width: asset.width, height: asset.height });
    } else {
      setDraftPhotoUri(asset.uri);
      setDraftPhotoAspectRatio(undefined);
    }
  };

  const handleAdjustConfirm = ({ uri, aspectRatio }: { uri: string; aspectRatio: number }) => {
    setDraftPhotoUri(uri);
    setDraftPhotoAspectRatio(aspectRatio);
    setPendingAsset(null);
  };

  const handleAdjustCancel = () => {
    setPendingAsset(null);
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      applyPickedAsset(result.assets[0]);
    }
  };

  const handlePickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      applyPickedAsset(result.assets[0]);
    }
  };

  const handleRemovePhoto = () => {
    setDraftPhotoUri('');
    setDraftPhotoAspectRatio(undefined);
  };

  const handleSave = async () => {
    if (!draftName.trim()) {
      setError('請輸入單品名稱');
      return;
    }

    await updateItem(item.id, {
      name: draftName.trim(),
      price: Number(draftPrice) || 0,
      url: draftUrl.trim() || undefined,
      note: draftNote.trim() || undefined,
      photoUri: draftPhotoUri,
      photoAspectRatio: draftPhotoAspectRatio,
      conditionChecks: draftChecks,
      unlockDate: draftUnlockDate,
    });

    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {draftPhotoUri ? (
        <Image
          testID="item-detail-photo"
          source={{ uri: draftPhotoUri }}
          style={[styles.heroPhoto, { aspectRatio: draftPhotoAspectRatio ?? 1 }]}
        />
      ) : null}

      <View style={styles.photoButtonsRow}>
        <Pressable style={styles.photoButton} onPress={handleTakePhoto}>
          <Text style={styles.photoButtonText}>📷 拍照</Text>
        </Pressable>
        <Pressable style={styles.photoButton} onPress={handlePickFromLibrary}>
          <Text style={styles.photoButtonText}>🖼 從相簿選擇</Text>
        </Pressable>
        {draftPhotoUri ? (
          <Pressable style={styles.photoButton} onPress={handleRemovePhoto}>
            <Text style={styles.photoButtonText}>🗑 移除照片</Text>
          </Pressable>
        ) : null}
      </View>

      <TextInput style={styles.input} placeholder="單品名稱" value={draftName} onChangeText={setDraftName} />
      <TextInput
        style={styles.input}
        placeholder="價格"
        keyboardType="numeric"
        value={draftPrice}
        onChangeText={setDraftPrice}
      />
      <TextInput style={styles.input} placeholder="購買連結（可選）" value={draftUrl} onChangeText={setDraftUrl} />
      <TextInput style={styles.input} placeholder="備註（可選）" value={draftNote} onChangeText={setDraftNote} />

      <Text style={styles.sectionTitle}>解鎖日期</Text>
      {draftUnlockDate ? (
        <UnlockDatePicker
          unlockDate={draftUnlockDate}
          onChange={setDraftUnlockDate}
          accentColor={themeColor}
          calendarInitialDate={new Date(draftUnlockDate)}
        />
      ) : null}

      <ConditionChecklist labels={conditionLabels} checks={draftChecks} onToggle={toggleDraftCheck} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actionsRow}>
        <Pressable style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>取消</Text>
        </Pressable>
        <Pressable style={[styles.saveButton, { backgroundColor: themeColor }]} onPress={handleSave}>
          <Text style={styles.saveButtonText}>儲存</Text>
        </Pressable>
      </View>

      {pendingAsset ? (
        <PhotoAdjustModal
          visible
          photoUri={pendingAsset.uri}
          sourceWidth={pendingAsset.width}
          sourceHeight={pendingAsset.height}
          accentColor={themeColor}
          onConfirm={handleAdjustConfirm}
          onCancel={handleAdjustCancel}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.horizontal, backgroundColor: COLORS.background, flexGrow: 1 },
  heroPhoto: {
    width: '100%',
    borderRadius: RADIUS.card,
    marginBottom: SPACING.verticalSmall,
    backgroundColor: COLORS.border,
  },
  photoButtonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.verticalLarge },
  photoButton: {
    paddingVertical: SPACING.verticalSmall,
    paddingHorizontal: SPACING.verticalMedium,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoButtonText: { fontSize: TYPE_SCALE.small, color: COLORS.textPrimary },
  sectionTitle: {
    fontSize: TYPE_SCALE.subtitle,
    fontWeight: '600',
    marginTop: SPACING.verticalSmall,
    marginBottom: SPACING.verticalSmall,
    color: COLORS.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.card,
    padding: SPACING.verticalMedium,
    marginBottom: SPACING.verticalMedium,
    color: COLORS.textPrimary,
  },
  error: { color: COLORS.error, marginTop: SPACING.verticalSmall },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: SPACING.verticalLarge },
  cancelButton: {
    flex: 1,
    padding: SPACING.verticalMedium,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: { fontWeight: '600', fontSize: TYPE_SCALE.body, color: COLORS.textPrimary },
  saveButton: { flex: 1, padding: SPACING.verticalMedium, borderRadius: RADIUS.pill, alignItems: 'center' },
  saveButtonText: { fontWeight: '600', fontSize: TYPE_SCALE.body, color: '#FFFFFF' },
  notFound: { fontSize: TYPE_SCALE.body, color: COLORS.textSecondary },
});
