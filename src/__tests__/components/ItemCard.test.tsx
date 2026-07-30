import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ItemCard } from '../../components/ItemCard';
import type { Item } from '../../types/item';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    name: '測試外套',
    photoUri: 'mock://photo.jpg',
    price: 1200,
    createdAt: '2026-07-01T00:00:00.000Z',
    unlockDate: '2099-08-01T00:00:00.000Z',
    conditionChecks: [true, false, false, false, false, false],
    status: 'cooling',
    ...overrides,
  };
}

describe('ItemCard - cooling variant', () => {
  it('顯示名稱、價格與勾選進度', async () => {
    await render(<ItemCard item={makeItem()} variant="cooling" accentColor="#EAAFB3" onPress={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('測試外套')).toBeTruthy();
    expect(screen.getByText('NT$ 1200')).toBeTruthy();
    expect(screen.getByText('已勾選 1 / 6 項')).toBeTruthy();
  });

  it('點擊刪除按鈕會呼叫 onDelete', async () => {
    const onDelete = jest.fn();
    await render(<ItemCard item={makeItem()} variant="cooling" accentColor="#EAAFB3" onPress={jest.fn()} onDelete={onDelete} />);
    await fireEvent.press(screen.getByText('主動放棄'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('點擊卡片本身會呼叫 onPress', async () => {
    const onPress = jest.fn();
    await render(<ItemCard item={makeItem()} variant="cooling" accentColor="#EAAFB3" onPress={onPress} onDelete={jest.fn()} />);
    await fireEvent.press(screen.getByText('測試外套'));
    expect(onPress).toHaveBeenCalled();
  });

  it('卡片陰影顏色會套用傳入的 accentColor', async () => {
    await render(<ItemCard item={makeItem()} variant="cooling" accentColor="#a7c7e7" onPress={jest.fn()} onDelete={jest.fn()} />);
    const card = screen.getByTestId('item-card-item-1');
    expect(StyleSheet.flatten(card.props.style).shadowColor).toBe('#a7c7e7');
  });

  it('圖片以固定大小的小縮圖顯示在資料左側，而非滿版大圖', async () => {
    await render(<ItemCard item={makeItem()} variant="cooling" accentColor="#EAAFB3" onPress={jest.fn()} onDelete={jest.fn()} />);
    const thumbnail = screen.getByTestId('item-thumbnail-item-1');
    expect(StyleSheet.flatten(thumbnail.props.style).width).toBe(56);
    expect(StyleSheet.flatten(thumbnail.props.style).height).toBe(56);
  });
});

describe('ItemCard - unlocked variant', () => {
  it('顯示標記已購買與刪除兩個按鈕', async () => {
    const onMarkPurchased = jest.fn();
    const onDelete = jest.fn();
    await render(
      <ItemCard
        item={makeItem({ status: 'unlocked' })}
        variant="unlocked"
        accentColor="#EAAFB3"
        onPress={jest.fn()}
        onDelete={onDelete}
        onMarkPurchased={onMarkPurchased}
      />
    );

    await fireEvent.press(screen.getByText('標記已購買'));
    expect(onMarkPurchased).toHaveBeenCalled();

    await fireEvent.press(screen.getByText('刪除（不買了）'));
    expect(onDelete).toHaveBeenCalled();
  });
});
