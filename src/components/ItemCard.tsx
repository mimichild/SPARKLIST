import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import type { Item } from '../types/item';
import { countCheckedConditions } from '../services/itemService';
import { COLORS, RADIUS, SHADOW, SPACING, TYPE_SCALE } from '../constants/theme';

interface ItemCardProps {
  item: Item;
  variant: 'cooling' | 'unlocked';
  accentColor: string;
  onPress: () => void;
  onDelete: () => void;
  onMarkPurchased?: () => void;
  onOpenLink?: () => void;
}

export function ItemCard({ item, variant, accentColor, onPress, onDelete, onMarkPurchased, onOpenLink }: ItemCardProps) {
  return (
    <View testID={`item-card-${item.id}`} style={[styles.card, { shadowColor: accentColor }]}>
      <Pressable onPress={onPress} style={styles.content}>
        <Image
          testID={`item-thumbnail-${item.id}`}
          source={{ uri: item.photoUri }}
          style={[styles.thumbnail, { aspectRatio: item.photoAspectRatio ?? 1 }]}
        />
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.price}>NT$ {item.price}</Text>
          <Text style={styles.checks}>已勾選 {countCheckedConditions(item)} / {item.conditionChecks.length} 項</Text>
        </View>
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.horizontal,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.card,
    marginBottom: SPACING.verticalMedium,
    ...SHADOW.card,
  },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  thumbnail: { width: 56, borderRadius: RADIUS.card - 4, backgroundColor: COLORS.border },
  info: { flex: 1, marginLeft: SPACING.verticalMedium },
  name: { fontSize: TYPE_SCALE.body, fontWeight: '600', color: COLORS.textPrimary },
  price: { fontSize: TYPE_SCALE.small, marginTop: 2, color: COLORS.textPrimary },
  checks: { fontSize: TYPE_SCALE.caption, marginTop: 4, color: COLORS.textSecondary },
  actions: { flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginLeft: SPACING.verticalSmall },
  primaryButton: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#4DABF7', borderRadius: 6 },
  primaryButtonText: { color: '#fff', fontSize: 13 },
  secondaryButton: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: COLORS.border, borderRadius: 6 },
  secondaryButtonText: { fontSize: 13, color: COLORS.textPrimary },
  dangerButton: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#FFE3E3', borderRadius: 6 },
  dangerButtonText: { fontSize: 13, color: COLORS.error },
});
