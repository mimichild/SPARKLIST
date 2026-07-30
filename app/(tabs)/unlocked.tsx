import { useCallback, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, Linking, Alert, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useItems } from '../../src/hooks/useItems';
import { useAppStore } from '../../src/store/useAppStore';
import { ItemCard } from '../../src/components/ItemCard';
import { COLORS, RADIUS, SPACING, TYPE_SCALE } from '../../src/constants/theme';

export default function UnlockedScreen() {
  const { unlockedItems, deleteItem, markPurchased, reload } = useItems();
  const themeColor = useAppStore((s) => s.themeColor);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const handleResist = (itemId: string) => {
    Alert.alert('將贈送您一點忍術點數');
    deleteItem(itemId);
  };

  const handlePurchased = (itemId: string) => {
    Alert.alert('恭喜畢業');
    markPurchased(itemId);
  };

  const trimmedQuery = searchQuery.trim();
  const filteredItems = trimmedQuery
    ? unlockedItems.filter((item) => item.name.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : unlockedItems;

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Pressable
          testID="search-toggle"
          style={styles.searchToggle}
          onPress={() => setIsSearchVisible((prev) => !prev)}
        >
          <Text style={styles.searchToggleText}>🔍 搜尋</Text>
        </Pressable>
      </View>

      {isSearchVisible ? (
        <TextInput
          testID="search-input"
          style={styles.searchInput}
          placeholder="輸入單品名稱關鍵字"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      ) : null}

      {unlockedItems.length === 0 ? (
        <Text style={styles.empty}>目前沒有已解鎖的單品</Text>
      ) : filteredItems.length === 0 ? (
        <Text style={styles.empty}>找不到符合「{trimmedQuery}」的單品</Text>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              variant="unlocked"
              accentColor={themeColor}
              onPress={() => {}}
              onDelete={() => handleResist(item.id)}
              onMarkPurchased={() => handlePurchased(item.id)}
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
  searchRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: SPACING.verticalSmall },
  searchToggle: {
    paddingVertical: SPACING.verticalSmall,
    paddingHorizontal: SPACING.verticalMedium,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.border,
  },
  searchToggleText: { fontSize: TYPE_SCALE.small, color: COLORS.textPrimary },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.card,
    padding: SPACING.verticalMedium,
    marginBottom: SPACING.verticalMedium,
    color: COLORS.textPrimary,
  },
  empty: { textAlign: 'center', marginTop: 60, color: COLORS.textSecondary, fontSize: TYPE_SCALE.body },
});
