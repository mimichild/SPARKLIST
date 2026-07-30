import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { useUnlockQueueStore } from '../../src/store/useUnlockQueueStore';
import { UnlockCelebrationModal } from '../../src/components/UnlockCelebrationModal';
import { COLORS, TYPE_SCALE } from '../../src/constants/theme';

// React Native's default tab bar label size is ~10-11px; doubled per user request.
const TAB_BAR_LABEL_FONT_SIZE = TYPE_SCALE.subtitle;

export default function TabsLayout() {
  const themeColor = useAppStore((s) => s.themeColor);
  const insets = useSafeAreaInsets();
  // Rendered here (not on an individual tab screen) because a cooling ->
  // unlocked transition can be detected from whichever tab happens to
  // reload() first — the celebration needs to show no matter which tab
  // that was.
  const newlyUnlockedItems = useUnlockQueueStore((s) => s.newlyUnlockedItems);
  const clearNewlyUnlocked = useUnlockQueueStore((s) => s.clearNewlyUnlocked);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: themeColor,
          tabBarInactiveTintColor: '#999',
          tabBarIcon: () => null,
          tabBarLabelStyle: { fontSize: TAB_BAR_LABEL_FONT_SIZE },
          tabBarStyle: {
            backgroundColor: COLORS.card,
            borderTopColor: COLORS.border,
            borderTopWidth: 1,
            height: 50 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 0,
          },
          headerStyle: { backgroundColor: themeColor },
          headerTintColor: '#FFFFFF',
          headerTitleAlign: 'center',
        }}
      >
        <Tabs.Screen name="me" options={{ title: '我的' }} />
        <Tabs.Screen name="cooling" options={{ title: '冷靜區' }} />
        <Tabs.Screen name="unlocked" options={{ title: '解鎖區' }} />
      </Tabs>

      {newlyUnlockedItems.length > 0 ? (
        <UnlockCelebrationModal
          item={newlyUnlockedItems[0]}
          accentColor={themeColor}
          onDismiss={clearNewlyUnlocked}
        />
      ) : null}
    </>
  );
}
