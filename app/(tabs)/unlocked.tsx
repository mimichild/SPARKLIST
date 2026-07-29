import { useCallback } from 'react';
import { View, Text, FlatList, Linking, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useItems } from '../../src/hooks/useItems';
import { useAppStore } from '../../src/store/useAppStore';
import { ItemCard } from '../../src/components/ItemCard';
import { COLORS, SPACING, TYPE_SCALE } from '../../src/constants/theme';

export default function UnlockedScreen() {
  const { unlockedItems, deleteItem, markPurchased, reload } = useItems();
  const themeColor = useAppStore((s) => s.themeColor);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>解鎖區</Text>

      {unlockedItems.length === 0 ? (
        <Text style={styles.empty}>目前沒有已解鎖的單品</Text>
      ) : (
        <FlatList
          data={unlockedItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              variant="unlocked"
              accentColor={themeColor}
              onPress={() => {}}
              onDelete={() => deleteItem(item.id)}
              onMarkPurchased={() => markPurchased(item.id)}
              onOpenLink={item.url ? () => Linking.openURL(item.url as string) : undefined}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.horizontal, backgroundColor: COLORS.background },
  title: { fontSize: TYPE_SCALE.title, fontWeight: 'bold', marginBottom: SPACING.verticalLarge, color: COLORS.textPrimary },
  empty: { textAlign: 'center', marginTop: 60, color: COLORS.textSecondary, fontSize: TYPE_SCALE.body },
});
