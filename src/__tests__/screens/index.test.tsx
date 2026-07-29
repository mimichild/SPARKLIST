import { render } from '@testing-library/react-native';
import IndexScreen from '../../../app/index';

// Only need to verify which href IndexScreen hands to <Redirect>; expo-router's
// own navigation machinery is out of scope for this unit test.
jest.mock('expo-router', () => {
  const React = require('react');
  const Redirect = ({ href }: { href: string }) =>
    React.createElement('Text', { testID: 'redirect-target' }, href);
  return { Redirect };
});

describe('IndexScreen', () => {
  it('冷啟動根路徑會導向「我的」分頁，而不是顯示 Unmatched Route', async () => {
    const { getByTestId } = await render(<IndexScreen />);
    expect(getByTestId('redirect-target').props.children).toBe('/(tabs)/me');
  });
});
