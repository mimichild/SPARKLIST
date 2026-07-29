import { useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useItems } from '../../src/hooks/useItems';
import { ItemCard } from '../../src/components/ItemCard';

export default function CoolingScreen() {
  const router = useRouter();
  const { coolingItems, deleteItem, reload } = useItems();

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>冷靜區</Text>
        <Pressable style={styles.addButton} onPress={() => router.push('/item/new')}>
          <Text style={styles.addButtonText}>新增單品</Text>
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
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold' },
  addButton: { backgroundColor: '#4DABF7', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, color: '#666' },
});
