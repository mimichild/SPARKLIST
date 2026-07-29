import { render, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import RootLayout from '../../../app/_layout';

// RootLayout only needs to be mounted to verify its mount-time effect (Finding 2);
// it doesn't need real file-based routing, so Stack/Stack.Screen are stubbed out
// to avoid depending on expo-router's actual navigator machinery in a unit test.
jest.mock('expo-router', () => {
  const React = require('react');
  const Stack = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  Stack.Screen = () => null;
  return { Stack };
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RootLayout', () => {
  it('掛載時會請求通知權限，並註冊前景通知處理器', async () => {
    await render(<RootLayout />);

    await waitFor(() => {
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
    });
  });

  it('通知處理器會允許前景顯示橫幅、通知列表與音效，但不設定角標', async () => {
    await render(<RootLayout />);

    await waitFor(() => {
      expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
    });

    const handler = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0][0];
    const behavior = await handler.handleNotification({} as never);

    expect(behavior).toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
  });
});
