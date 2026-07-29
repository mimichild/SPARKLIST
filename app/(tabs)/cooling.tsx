import { useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useItems } from '../../src/hooks/useItems';
import { useAppStore } from '../../src/store/useAppStore';
import { ItemCard } from '../../src/components/ItemCard';
import { COLORS, RADIUS, SPACING, TYPE_SCALE, getContrastColor } from '../../src/constants/theme';

export default function CoolingScreen() {
  const router = useRouter();
  const { coolingItems, deleteItem, reload } = useItems();
  const themeColor = useAppStore((s) => s.themeColor);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>冷靜區</Text>
        <Pressable style={[styles.addButton, { backgroundColor: themeColor }]} onPress={() => router.push('/item/new')}>
          <Text style={[styles.addButtonText, { color: getContrastColor(themeColor) }]}>新增單品</Text>
        </Pressable>
      </View>

      {coolingItems.length === 0 ? (
        <Text style={styles.empty}>目前沒有正在冷靜的單品，按右上角新增一個吧！</Text>
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
              onDelete={() => deleteItem(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.horizontal, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.verticalLarge },
  title: { fontSize: TYPE_SCALE.title, fontWeight: 'bold', color: COLORS.textPrimary },
  addButton: { paddingVertical: SPACING.verticalSmall, paddingHorizontal: SPACING.horizontal, borderRadius: RADIUS.pill },
  addButtonText: { fontWeight: '600', fontSize: TYPE_SCALE.small },
  empty: { textAlign: 'center', marginTop: 60, color: COLORS.textSecondary, fontSize: TYPE_SCALE.body },
});
