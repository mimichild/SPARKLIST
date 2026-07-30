import { useCallback } from 'react';
import { View, Text, FlatList, Pressable, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useItems } from '../../src/hooks/useItems';
import { useAppStore } from '../../src/store/useAppStore';
import { ItemCard } from '../../src/components/ItemCard';
import { COLORS, RADIUS, SHADOW, SPACING, TYPE_SCALE } from '../../src/constants/theme';

export default function CoolingScreen() {
  const router = useRouter();
  const { coolingItems, deleteItem, reload } = useItems();
  const themeColor = useAppStore((s) => s.themeColor);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const handleResist = (itemId: string) => {
    Alert.alert('將贈送您一點忍術點數');
    deleteItem(itemId);
  };

  return (
    <View style={styles.container}>
      {coolingItems.length === 0 ? (
        <Text style={styles.empty}>目前沒有正在冷靜的單品，按右下角新增一個吧！</Text>
      ) : (
        <FlatList
          data={coolingItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              variant="cooling"
              accentColor={themeColor}
              onPress={() => router.push(`/item/${item.id}`)}
              onDelete={() => handleResist(item.id)}
            />
          )}
        />
      )}

      <Pressable
        style={[styles.addButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
        onPress={() => router.push('/item/new')}
      >
        <Text style={styles.addButtonText}>新增單品</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.horizontal, backgroundColor: COLORS.background },
  addButton: {
    position: 'absolute',
    right: SPACING.horizontal,
    bottom: SPACING.verticalLarge,
    paddingVertical: SPACING.verticalMedium,
    paddingHorizontal: SPACING.horizontal,
    borderRadius: RADIUS.pill,
    ...SHADOW.card,
  },
  addButtonText: { fontWeight: '600', fontSize: TYPE_SCALE.small, color: '#FFFFFF' },
  empty: { textAlign: 'center', marginTop: 60, color: COLORS.textSecondary, fontSize: TYPE_SCALE.body },
});
