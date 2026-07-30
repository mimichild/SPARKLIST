import { useCallback } from 'react';
import { View, Text, FlatList, Linking, Alert, StyleSheet } from 'react-native';
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

  const handleResist = (itemId: string) => {
    Alert.alert('將贈送您一點忍術點數');
    deleteItem(itemId);
  };

  return (
    <View style={styles.container}>
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
              onDelete={() => handleResist(item.id)}
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
  empty: { textAlign: 'center', marginTop: 60, color: COLORS.textSecondary, fontSize: TYPE_SCALE.body },
});
