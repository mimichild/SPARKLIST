import { render, screen, fireEvent } from '@testing-library/react-native';
import { UnlockCelebrationModal } from '../../components/UnlockCelebrationModal';
import type { Item } from '../../types/item';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    name: '剛解鎖的外套',
    photoUri: 'mock://photo.jpg',
    price: 1200,
    createdAt: '2026-07-01T00:00:00.000Z',
    unlockDate: '2026-07-01T00:00:00.000Z',
    conditionChecks: [true, true, true, false, false, false],
    status: 'unlocked',
    ...overrides,
  };
}

describe('UnlockCelebrationModal', () => {
  it('顯示「恭喜解鎖！」與單品名稱', async () => {
    await render(<UnlockCelebrationModal item={makeItem()} accentColor="#EAAFB3" onDismiss={jest.fn()} />);

    expect(screen.getByText('恭喜解鎖！')).toBeTruthy();
    expect(screen.getByText('剛解鎖的外套')).toBeTruthy();
  });

  it('有照片時會顯示照片，並保持照片本身的比例', async () => {
    await render(
      <UnlockCelebrationModal
        item={makeItem({ photoUri: 'mock://photo.jpg', photoAspectRatio: 3 / 4 })}
        accentColor="#EAAFB3"
        onDismiss={jest.fn()}
      />
    );

    const photo = screen.getByTestId('unlock-celebration-photo');
    expect(photo).toBeTruthy();
  });

  it('沒有照片時不顯示照片區塊', async () => {
    await render(<UnlockCelebrationModal item={makeItem({ photoUri: '' })} accentColor="#EAAFB3" onDismiss={jest.fn()} />);

    expect(screen.queryByTestId('unlock-celebration-photo')).toBeNull();
  });

  it('點擊「太棒了！」會呼叫 onDismiss', async () => {
    const onDismiss = jest.fn();
    await render(<UnlockCelebrationModal item={makeItem()} accentColor="#EAAFB3" onDismiss={onDismiss} />);

    await fireEvent.press(screen.getByText('太棒了！'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
