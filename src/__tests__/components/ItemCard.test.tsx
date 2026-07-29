import { render, screen, fireEvent } from '@testing-library/react-native';
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
    await render(<ItemCard item={makeItem()} variant="cooling" onPress={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('測試外套')).toBeTruthy();
    expect(screen.getByText('NT$ 1200')).toBeTruthy();
    expect(screen.getByText('已勾選 1 / 6 項')).toBeTruthy();
  });

  it('點擊刪除按鈕會呼叫 onDelete', async () => {
    const onDelete = jest.fn();
    await render(<ItemCard item={makeItem()} variant="cooling" onPress={jest.fn()} onDelete={onDelete} />);
    await fireEvent.press(screen.getByText('主動放棄'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('點擊卡片本身會呼叫 onPress', async () => {
    const onPress = jest.fn();
    await render(<ItemCard item={makeItem()} variant="cooling" onPress={onPress} onDelete={jest.fn()} />);
    await fireEvent.press(screen.getByText('測試外套'));
    expect(onPress).toHaveBeenCalled();
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
