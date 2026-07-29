import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useItems } from '../../src/hooks/useItems';
import { useAppStore } from '../../src/store/useAppStore';
import { ConditionChecklist } from '../../src/components/ConditionChecklist';
import { CONDITION_COUNT } from '../../src/constants/conditions';

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
  const conditionLabels = useAppStore((s) => s.conditionLabels);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [unlockDate, setUnlockDate] = useState<string | null>(null);
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
        {QUICK_DAY_OPTIONS.map((option) => (
          <Pressable
            key={option.label}
            style={[styles.quickDateButton, unlockDate ? null : styles.quickDateButtonActive]}
            onPress={() => setUnlockDate(addDaysIso(option.days))}
          >
            <Text>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>六項條件</Text>
      <ConditionChecklist labels={conditionLabels} checks={checks} onToggle={toggleCheck} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>儲存</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginTop: 8, marginBottom: 8 },
  quickDateRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  quickDateButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#eee' },
  quickDateButtonActive: {},
  error: { color: '#E03131', marginBottom: 12 },
  submitButton: { backgroundColor: '#4DABF7', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  submitButtonText: { color: '#fff', fontWeight: '600' },
});
