import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useItems } from '../../src/hooks/useItems';
import { useAppStore } from '../../src/store/useAppStore';
import { ConditionChecklist } from '../../src/components/ConditionChecklist';
import { CONDITION_COUNT } from '../../src/constants/conditions';
import { COLORS, RADIUS, SPACING, TYPE_SCALE, getContrastColor } from '../../src/constants/theme';

const QUICK_DAY_OPTIONS = [
  { label: '7 天後', days: 7 },
  { label: '14 天後', days: 14 },
  { label: '30 天後', days: 30 },
];

function addDaysIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export default function NewItemScreen() {
  const router = useRouter();
  const { addItem } = useItems();
  const { conditionLabels, themeColor } = useAppStore();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [unlockDate, setUnlockDate] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [checks, setChecks] = useState<boolean[]>(new Array(CONDITION_COUNT).fill(false));
  const [error, setError] = useState<string | null>(null);

  const toggleCheck = (index: number) => {
    setChecks((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('請輸入單品名稱');
      return;
    }
    if (!unlockDate) {
      setError('請選擇解鎖日期');
      return;
    }

    await addItem({
      name: name.trim(),
      photoUri: 'mock://photo.jpg',
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

      <Text style={styles.sectionTitle}>解鎖日期</Text>
      <View style={styles.quickDateRow}>
        {QUICK_DAY_OPTIONS.map((option) => {
          const isSelected = selectedDays === option.days;
          return (
            <Pressable
              key={option.label}
              testID={`quick-date-${option.days}`}
              style={[styles.quickDateButton, isSelected && { backgroundColor: themeColor }]}
              onPress={() => {
                setSelectedDays(option.days);
                setUnlockDate(addDaysIso(option.days));
              }}
            >
              <Text style={isSelected ? { color: getContrastColor(themeColor) } : styles.quickDateButtonText}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>六項條件</Text>
      <ConditionChecklist labels={conditionLabels} checks={checks} onToggle={toggleCheck} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.submitButton, { backgroundColor: themeColor }]} onPress={handleSubmit}>
        <Text style={[styles.submitButtonText, { color: getContrastColor(themeColor) }]}>儲存</Text>
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
  quickDateRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.verticalLarge },
  quickDateButton: {
    paddingVertical: SPACING.verticalSmall,
    paddingHorizontal: SPACING.verticalMedium,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.border,
  },
  quickDateButtonText: { color: COLORS.textPrimary },
  error: { color: COLORS.error, marginBottom: SPACING.verticalMedium },
  submitButton: { padding: SPACING.verticalMedium, borderRadius: RADIUS.pill, alignItems: 'center', marginTop: SPACING.verticalLarge },
  submitButtonText: { fontWeight: '600', fontSize: TYPE_SCALE.body },
});
