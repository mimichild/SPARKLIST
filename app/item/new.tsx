import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useItems } from '../../src/hooks/useItems';
import { useAppStore } from '../../src/store/useAppStore';
import { ConditionChecklist } from '../../src/components/ConditionChecklist';
import { UnlockDatePicker, addDaysIso } from '../../src/components/UnlockDatePicker';
import { PhotoAdjustModal } from '../../src/components/PhotoAdjustModal';
import { persistPhotoAsync } from '../../src/services/photoStorageService';
import { COLORS, RADIUS, SPACING, TYPE_SCALE } from '../../src/constants/theme';

const DEFAULT_UNLOCK_DAYS = 7;

export default function NewItemScreen() {
  const router = useRouter();
  const { addItem } = useItems();
  const { conditionLabels, themeColor } = useAppStore();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  // Preserves whatever ratio the user shot/picked the photo in (3:4, 4:3,
  // 1:1, ...) so it never gets force-cropped to a fixed box.
  const [photoAspectRatio, setPhotoAspectRatio] = useState<number | undefined>(undefined);
  // Holds a freshly picked photo awaiting the pinch/pan adjust step before
  // it's confirmed as the item's photo.
  const [pendingAsset, setPendingAsset] = useState<{ uri: string; width: number; height: number } | null>(null);
  // Unlock date always defaults to 7 days out, so the user is never forced
  // to interact with this section — only the name is a required field.
  const [unlockDate, setUnlockDate] = useState(() => addDaysIso(DEFAULT_UNLOCK_DAYS));
  const [checks, setChecks] = useState<boolean[]>(() => new Array(conditionLabels.length).fill(false));
  const [error, setError] = useState<string | null>(null);

  // conditionLabels can change length (使用者可新增/刪除條件於「我的」頁面),
  // so keep the checks array in sync with however many labels currently exist.
  useEffect(() => {
    setChecks((prev) =>
      prev.length === conditionLabels.length ? prev : new Array(conditionLabels.length).fill(false)
    );
  }, [conditionLabels.length]);

  const toggleCheck = (index: number) => {
    setChecks((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const applyPickedAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    if (asset.width && asset.height) {
      // Route through the adjust step so the user can pinch/pan before
      // it's confirmed as the item's photo.
      setPendingAsset({ uri: asset.uri, width: asset.width, height: asset.height });
    } else {
      setPhotoUri(await persistPhotoAsync(asset.uri));
      setPhotoAspectRatio(undefined);
    }
  };

  const handleAdjustConfirm = async ({ uri, aspectRatio }: { uri: string; aspectRatio: number }) => {
    setPhotoUri(await persistPhotoAsync(uri));
    setPhotoAspectRatio(aspectRatio);
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
      await applyPickedAsset(result.assets[0]);
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
      await applyPickedAsset(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('請輸入單品名稱');
      return;
    }

    await addItem({
      name: name.trim(),
      photoUri: photoUri ?? '',
      photoAspectRatio,
      price: Number(price) || 0,
      url: url.trim() || undefined,
      note: note.trim() || undefined,
      unlockDate,
      initialConditionChecks: checks,
    });

    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput style={styles.input} placeholder="單品名稱" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder="價格"
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
      />
      <TextInput style={styles.input} placeholder="購買連結（可選）" value={url} onChangeText={setUrl} />
      <TextInput style={styles.input} placeholder="備註（可選）" value={note} onChangeText={setNote} />

      <Text style={styles.sectionTitle}>相片（可選）</Text>
      <View style={styles.photoRow}>
        {photoUri ? (
          <Image
            testID="new-item-photo-preview"
            source={{ uri: photoUri }}
            style={[styles.photoPreview, { aspectRatio: photoAspectRatio ?? 1 }]}
          />
        ) : (
          <View testID="new-item-photo-placeholder" style={styles.photoPlaceholder} />
        )}
        <View style={styles.photoButtonsColumn}>
          <Pressable style={styles.photoButton} onPress={handleTakePhoto}>
            <Text style={styles.photoButtonText}>📷 拍照</Text>
          </Pressable>
          <Pressable style={styles.photoButton} onPress={handlePickFromLibrary}>
            <Text style={styles.photoButtonText}>🖼 從相簿選擇</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>解鎖日期</Text>
      <UnlockDatePicker
        unlockDate={unlockDate}
        onChange={setUnlockDate}
        accentColor={themeColor}
        calendarInitialDate={new Date()}
        initialSelectedDays={DEFAULT_UNLOCK_DAYS}
      />

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

      <Text style={styles.sectionTitle}>六項條件</Text>
      <ConditionChecklist labels={conditionLabels} checks={checks} onToggle={toggleCheck} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.submitButton, { backgroundColor: themeColor }]} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>儲存</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.horizontal, backgroundColor: COLORS.background, flexGrow: 1 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.card,
    padding: SPACING.verticalMedium,
    marginBottom: SPACING.verticalMedium,
    color: COLORS.textPrimary,
  },
  sectionTitle: {
    fontSize: TYPE_SCALE.subtitle,
    fontWeight: '600',
    marginTop: SPACING.verticalSmall,
    marginBottom: SPACING.verticalSmall,
    color: COLORS.textPrimary,
  },
  photoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.verticalLarge },
  photoPreview: { width: 72, borderRadius: RADIUS.card, backgroundColor: COLORS.border },
  photoPlaceholder: { width: 72, height: 72, borderRadius: RADIUS.card, backgroundColor: COLORS.border },
  photoButtonsColumn: { flex: 1, marginLeft: SPACING.verticalMedium, gap: 8 },
  photoButton: {
    paddingVertical: SPACING.verticalSmall,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  photoButtonText: { fontSize: TYPE_SCALE.small, color: COLORS.textPrimary },
  error: { color: COLORS.error, marginBottom: SPACING.verticalMedium },
  submitButton: { padding: SPACING.verticalMedium, borderRadius: RADIUS.pill, alignItems: 'center', marginTop: SPACING.verticalLarge },
  submitButtonText: { fontWeight: '600', fontSize: TYPE_SCALE.body, color: '#FFFFFF' },
});
