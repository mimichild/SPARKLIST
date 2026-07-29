import { useCallback } from 'react';
import { View, Text, FlatList, Linking, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useItems } from '../../src/hooks/useItems';
import { ItemCard } from '../../src/components/ItemCard';

export default function UnlockedScreen() {
  const { unlockedItems, deleteItem, markPurchased, reload } = useItems();

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
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  empty: { textAlign: 'center', marginTop: 40, color: '#666' },
});
