import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import type { Item } from '../types/item';
import { countCheckedConditions } from '../services/itemService';

interface ItemCardProps {
  item: Item;
  variant: 'cooling' | 'unlocked';
  onPress: () => void;
  onDelete: () => void;
  onMarkPurchased?: () => void;
  onOpenLink?: () => void;
}

export function ItemCard({ item, variant, onPress, onDelete, onMarkPurchased, onOpenLink }: ItemCardProps) {
  return (
    <View style={styles.card}>
      <Pressable onPress={onPress}>
        <Image source={{ uri: item.photoUri }} style={styles.photo} />
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>NT$ {item.price}</Text>
        <Text style={styles.checks}>已勾選 {countCheckedConditions(item)} / {item.conditionChecks.length} 項</Text>
      </Pressable>

      <View style={styles.actions}>
        {variant === 'unlocked' && onMarkPurchased ? (
          <Pressable onPress={onMarkPurchased} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>標記已購買</Text>
          </Pressable>
        ) : null}

        {variant === 'unlocked' && item.url && onOpenLink ? (
          <Pressable onPress={onOpenLink} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>前往購買頁</Text>
          </Pressable>
        ) : null}

        <Pressable onPress={onDelete} style={styles.dangerButton}>
          <Text style={styles.dangerButtonText}>
            {variant === 'cooling' ? '主動放棄' : '刪除（不買了）'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 12 },
  photo: { width: '100%', height: 120, borderRadius: 6, marginBottom: 8 },
  name: { fontSize: 16, fontWeight: '600' },
  price: { fontSize: 14, marginTop: 2 },
  checks: { fontSize: 12, marginTop: 4, color: '#666' },
  actions: { flexDirection: 'row', marginTop: 8, gap: 8 },
  primaryButton: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#4DABF7', borderRadius: 6 },
  primaryButtonText: { color: '#fff', fontSize: 13 },
  secondaryButton: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#eee', borderRadius: 6 },
  secondaryButtonText: { fontSize: 13 },
  dangerButton: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#FFE3E3', borderRadius: 6 },
  dangerButtonText: { fontSize: 13, color: '#E03131' },
});
