# SPARK LIST 視覺設計套用 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `~/Documents/design-spec.md`（SPARK 系列共同視覺語言）套用到 SPARKLIST 的五個畫面與三個共用元件：新增一份集中式 design tokens 檔案，畫面/元件全部改用該檔案的常數，取代目前散落各處的寫死數值。

**Architecture:** 擴充現有 `src/constants/theme.ts` 為集中式 tokens 檔案（顏色/間距/圓角/陰影/字級）；理論色（`accentColor`）以 props 方式由畫面傳入 `ItemCard`、`RankBadge` 兩個共用元件（維持元件「純 props、不讀 store」的既有慣例），畫面自己透過 `useAppStore` 取得 `themeColor` 再往下傳。

**Tech Stack:** React Native + Expo Router，純 `StyleSheet.create`，Zustand（`useAppStore`）既有主題色狀態不變。

## Global Constraints

- 本次**只調整視覺樣式**（顏色、間距、圓角、陰影、字級、Tab bar 樣式），**不新增功能、不改動任何業務邏輯或資料流**，`useAppStore`/`useItems` 的資料結構與行為不變
- 涵蓋全部 5 個畫面：我的、冷靜區、解鎖區、新增單品、單品詳情
- **不引入 `@expo/vector-icons` 或任何 icon 套件**，三分頁維持純文字標籤（`tabBarIcon: () => null`）
- **不加入使用者可切換字型功能**（本次僅專注視覺風格套用）
- **不實作深色模式**
- 主題色色票（8 色，逐字使用，`#EAAFB3` 為預設）：
  ```ts
  export const THEME_COLOR_OPTIONS: string[] = [
    '#EAAFB3', '#f1aba7', '#A8D5C2', '#a7c7e7', '#d9b8a7', '#8B3A42', '#111111', '#495057',
  ];
  export const DEFAULT_THEME_COLOR = THEME_COLOR_OPTIONS[0];
  ```
- 固定色（逐字使用）：背景 `#faf9f7`、卡片 `#FFFFFF`、主文字 `#2D2D2D`、次要文字 `#9A9A9A`、邊框 `#F0E2E3`、錯誤色 `#E03131`
- 間距：`horizontal: 16`、`verticalSmall: 10`、`verticalMedium: 12`、`verticalLarge: 16`
- 圓角：`card: 12`、`large: 18`、`pill: 24`
- 陰影（`SHADOW.card`）：`shadowOffset: {width:0, height:2}`、`shadowOpacity: 0.15`、`shadowRadius: 6`、`elevation: 3`，**不含 `shadowColor`**——由呼叫端動態帶入目前主題色
- 字級（`TYPE_SCALE`）：`caption: 12`、`small: 14`、`body: 16`、`subtitle: 20`、`title: 24`
- Tab bar：`tabBarActiveTintColor` 綁定 `useAppStore` 的 `themeColor`；`tabBarInactiveTintColor` 固定 `#999`（與 `COLORS.textSecondary` 是刻意不同的兩個值，照抄 design-spec 原文，不要合併成同一個）；底部安全區永遠補滿，**不做廣告耦合判斷**（iOS 未來加廣告列時需要另外排入計畫，本次不處理）
- 不需要新增視覺回歸快照測試（snapshot testing）；既有的「文字內容/樣式屬性斷言」測試風格為主

---

## Task 1: Design Tokens（`src/constants/theme.ts`）

**Files:**
- Modify: `src/constants/theme.ts`
- Test: `src/__tests__/constants/theme.test.ts`

**Interfaces:**
- Produces：
  - `THEME_COLOR_OPTIONS: string[]`（8 色）、`DEFAULT_THEME_COLOR: string`（既有匯出，本次改內容）
  - `getContrastColor(hex: string): '#FFFFFF' | '#2D2D2D'`（新增）
  - `COLORS: { background, card, textPrimary, textSecondary, border, error }`（新增）
  - `SPACING: { horizontal, verticalSmall, verticalMedium, verticalLarge }`（新增）
  - `RADIUS: { card, large, pill }`（新增）
  - `SHADOW: { card: { shadowOffset, shadowOpacity, shadowRadius, elevation } }`（新增，不含 `shadowColor`）
  - `TYPE_SCALE: { caption, small, body, subtitle, title }`（新增）

- [ ] **Step 1: 寫測試（先失敗）**

`src/__tests__/constants/theme.test.ts`：

```ts
import {
  THEME_COLOR_OPTIONS,
  DEFAULT_THEME_COLOR,
  getContrastColor,
  COLORS,
  SPACING,
  RADIUS,
  SHADOW,
  TYPE_SCALE,
} from '../../constants/theme';

describe('theme constants', () => {
  it('主題色色票有 8 色，預設為珊瑚粉', () => {
    expect(THEME_COLOR_OPTIONS).toEqual([
      '#EAAFB3', '#f1aba7', '#A8D5C2', '#a7c7e7', '#d9b8a7', '#8B3A42', '#111111', '#495057',
    ]);
    expect(DEFAULT_THEME_COLOR).toBe('#EAAFB3');
  });

  it('固定色符合設計規格', () => {
    expect(COLORS).toEqual({
      background: '#faf9f7',
      card: '#FFFFFF',
      textPrimary: '#2D2D2D',
      textSecondary: '#9A9A9A',
      border: '#F0E2E3',
      error: '#E03131',
    });
  });

  it('間距/圓角/字級 tokens 符合設計規格', () => {
    expect(SPACING).toEqual({ horizontal: 16, verticalSmall: 10, verticalMedium: 12, verticalLarge: 16 });
    expect(RADIUS).toEqual({ card: 12, large: 18, pill: 24 });
    expect(TYPE_SCALE).toEqual({ caption: 12, small: 14, body: 16, subtitle: 20, title: 24 });
  });

  it('SHADOW.card 有固定的 offset/opacity/radius/elevation，不含 shadowColor', () => {
    expect(SHADOW.card).toEqual({
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    });
    expect(SHADOW.card).not.toHaveProperty('shadowColor');
  });
});

describe('getContrastColor', () => {
  it('淺色（高亮度）回傳深色文字', () => {
    expect(getContrastColor('#f1aba7')).toBe('#2D2D2D');
    expect(getContrastColor('#FFFFFF')).toBe('#2D2D2D');
  });

  it('深色（低亮度）回傳白色文字', () => {
    expect(getContrastColor('#111111')).toBe('#FFFFFF');
    expect(getContrastColor('#8B3A42')).toBe('#FFFFFF');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/constants/theme.test.ts --verbose
```
Expected: FAIL，`COLORS`/`SPACING`/`RADIUS`/`SHADOW`/`TYPE_SCALE`/`getContrastColor` 均未定義；`THEME_COLOR_OPTIONS`/`DEFAULT_THEME_COLOR` 因數值不符而斷言失敗

- [ ] **Step 3: 改寫 `src/constants/theme.ts`**

```ts
export const THEME_COLOR_OPTIONS: string[] = [
  '#EAAFB3',
  '#f1aba7',
  '#A8D5C2',
  '#a7c7e7',
  '#d9b8a7',
  '#8B3A42',
  '#111111',
  '#495057',
];

export const DEFAULT_THEME_COLOR = THEME_COLOR_OPTIONS[0];

export function getContrastColor(hex: string): '#FFFFFF' | '#2D2D2D' {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#2D2D2D' : '#FFFFFF';
}

export const COLORS = {
  background: '#faf9f7',
  card: '#FFFFFF',
  textPrimary: '#2D2D2D',
  textSecondary: '#9A9A9A',
  border: '#F0E2E3',
  error: '#E03131',
};

export const SPACING = {
  horizontal: 16,
  verticalSmall: 10,
  verticalMedium: 12,
  verticalLarge: 16,
};

export const RADIUS = {
  card: 12,
  large: 18,
  pill: 24,
};

export const SHADOW = {
  card: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
};

export const TYPE_SCALE = {
  caption: 12,
  small: 14,
  body: 16,
  subtitle: 20,
  title: 24,
};
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/constants/theme.test.ts --verbose
```
Expected: PASS，5 個測試全過

- [ ] **Step 5: Commit**

```bash
git add src/constants/theme.ts src/__tests__/constants/theme.test.ts
git commit -m "feat: 擴充 design tokens（色票/固定色/間距/圓角/陰影/字級）"
```

---

## Task 2: Tab Bar 套用主題色（`app/(tabs)/_layout.tsx`）

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Test: `src/__tests__/screens/tabsBarOptions.test.tsx`

**Interfaces:**
- Consumes：`useAppStore` 的 `themeColor`（`src/store/useAppStore.ts`）；`COLORS` from `src/constants/theme.ts`；`useSafeAreaInsets` from `react-native-safe-area-context`（既有專案依賴，Task 1 bootstrap 已安裝）
- Produces：`TabsLayout` 的 `screenOptions` 包含 `tabBarActiveTintColor`（綁定 `themeColor`）、`tabBarInactiveTintColor: '#999'`、`tabBarIcon: () => null`、`tabBarStyle`（背景/邊框/依安全區動態高度）

- [ ] **Step 1: 寫測試（先失敗）**

`src/__tests__/screens/tabsBarOptions.test.tsx`：

```tsx
import { render } from '@testing-library/react-native';
import TabsLayout from '../../../app/(tabs)/_layout';
import { useAppStore } from '../../store/useAppStore';
import { DEFAULT_CONDITION_LABELS } from '../../constants/conditions';
import { DEFAULT_THEME_COLOR } from '../../constants/theme';

let capturedScreenOptions: any;

jest.mock('expo-router', () => {
  const React = require('react');
  const Tabs = ({ screenOptions, children }: { screenOptions: any; children?: React.ReactNode }) => {
    capturedScreenOptions = screenOptions;
    return React.createElement(React.Fragment, null, children);
  };
  Tabs.Screen = () => null;
  return { Tabs };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 20, left: 0 }),
}));

beforeEach(() => {
  capturedScreenOptions = undefined;
  useAppStore.setState({
    ninjaPoints: 0,
    currentRank: '尚無段位',
    conditionLabels: DEFAULT_CONDITION_LABELS,
    themeColor: DEFAULT_THEME_COLOR,
    hydrated: false,
  });
});

describe('TabsLayout screenOptions', () => {
  it('tabBarActiveTintColor 綁定目前的主題色', async () => {
    useAppStore.setState({ themeColor: '#a7c7e7' });
    await render(<TabsLayout />);
    expect(capturedScreenOptions.tabBarActiveTintColor).toBe('#a7c7e7');
  });

  it('tabBarInactiveTintColor 固定為 #999', async () => {
    await render(<TabsLayout />);
    expect(capturedScreenOptions.tabBarInactiveTintColor).toBe('#999');
  });

  it('不顯示 tab icon', async () => {
    await render(<TabsLayout />);
    expect(capturedScreenOptions.tabBarIcon()).toBeNull();
  });

  it('tab bar 高度依安全區動態調整（base 50 + insets.bottom）', async () => {
    await render(<TabsLayout />);
    expect(capturedScreenOptions.tabBarStyle.height).toBe(70);
    expect(capturedScreenOptions.tabBarStyle.paddingBottom).toBe(20);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/screens/tabsBarOptions.test.tsx --verbose
```
Expected: FAIL，目前 `TabsLayout` 沒有 `screenOptions`，`capturedScreenOptions` 為 `undefined`

- [ ] **Step 3: 改寫 `app/(tabs)/_layout.tsx`**

```tsx
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS } from '../../src/constants/theme';

export default function TabsLayout() {
  const themeColor = useAppStore((s) => s.themeColor);
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColor,
        tabBarInactiveTintColor: '#999',
        tabBarIcon: () => null,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 50 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 0,
        },
      }}
    >
      <Tabs.Screen name="me" options={{ title: '我的' }} />
      <Tabs.Screen name="cooling" options={{ title: '冷靜區' }} />
      <Tabs.Screen name="unlocked" options={{ title: '解鎖區' }} />
    </Tabs>
  );
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/screens/tabsBarOptions.test.tsx --verbose
```
Expected: PASS，4 個測試全過

- [ ] **Step 5: 真機/本機建置驗證安全區不會導致當機**

`useSafeAreaInsets` 需要 `SafeAreaProvider` 祖先元件才能正常運作；expo-router 已知會在框架內部自動包一層 `SafeAreaProvider`，但這件事只有真正執行原生 App 才能百分之百確認（Jest 測試已經 mock 掉這個依賴，測不到這件事）。用專案裡已經建好的 `/build-apk` 技能本地建置一次，實際裝到裝置上確認 Tab bar 正常顯示、App 沒有因為安全區相關的錯誤而當機：

```bash
bash /Users/mimi/.claude/skills/build-apk/scripts/build-apk.sh
```

裝到裝置上（沿用之前 session 的 `adb install -r` + `adb uninstall` 簽章衝突處理方式，見 `docs/REUSABLE_INFRA.md`）並打開 App，確認能正常看到底部三個文字分頁、沒有黑屏或當機。

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/_layout.tsx" src/__tests__/screens/tabsBarOptions.test.tsx
git commit -m "feat: Tab bar 套用主題色與安全區動態高度"
```

---

## Task 3: RankBadge 卡片化

**Files:**
- Modify: `src/components/RankBadge.tsx`
- Modify: `src/__tests__/components/RankBadge.test.tsx`

**Interfaces:**
- Consumes：`COLORS`、`RADIUS`、`SHADOW`、`SPACING`、`TYPE_SCALE` from `src/constants/theme.ts`
- Produces：`RankBadge` 新增必填 prop `accentColor: string`（用於卡片陰影色），其餘 props（`points`、`rank`）不變。容器 `View` 固定 `testID="rank-badge-card"`

- [ ] **Step 1: 更新測試（先失敗）**

`src/__tests__/components/RankBadge.test.tsx`（完整覆寫）：

```tsx
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { RankBadge } from '../../components/RankBadge';

describe('RankBadge', () => {
  it('顯示目前段位與點數', async () => {
    await render(<RankBadge points={12} rank="王牌忍術師" accentColor="#EAAFB3" />);
    expect(screen.getByText('王牌忍術師')).toBeTruthy();
    expect(screen.getByText('目前 12 點')).toBeTruthy();
  });

  it('未達最高段位時顯示距離下一段位還差幾點', async () => {
    await render(<RankBadge points={12} rank="王牌忍術師" accentColor="#EAAFB3" />);
    expect(screen.getByText('距離金牌忍術師還差 8 點')).toBeTruthy();
  });

  it('已達最高段位時顯示恭喜文字而非「還差幾點」', async () => {
    await render(<RankBadge points={150} rank="鑽石忍術師" accentColor="#EAAFB3" />);
    expect(screen.getByText('已達最高段位！')).toBeTruthy();
  });

  it('卡片陰影顏色會套用傳入的 accentColor', async () => {
    await render(<RankBadge points={0} rank="尚無段位" accentColor="#a7c7e7" />);
    const card = screen.getByTestId('rank-badge-card');
    expect(StyleSheet.flatten(card.props.style).shadowColor).toBe('#a7c7e7');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/components/RankBadge.test.tsx --verbose
```
Expected: FAIL，`accentColor` prop 缺少型別、`testID="rank-badge-card"` 不存在

- [ ] **Step 3: 改寫 `src/components/RankBadge.tsx`**

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { RANK_THRESHOLDS, type RankName } from '../constants/rank';
import { COLORS, RADIUS, SHADOW, SPACING, TYPE_SCALE } from '../constants/theme';

interface RankBadgeProps {
  points: number;
  rank: RankName;
  accentColor: string;
}

export function RankBadge({ points, rank, accentColor }: RankBadgeProps) {
  const next = RANK_THRESHOLDS.find((t) => t.minPoints > points);

  return (
    <View testID="rank-badge-card" style={[styles.container, { shadowColor: accentColor }]}>
      <Text style={styles.rank}>{rank}</Text>
      <Text style={styles.points}>目前 {points} 點</Text>
      {next ? (
        <Text style={styles.progress}>距離{next.name}還差 {next.minPoints - points} 點</Text>
      ) : (
        <Text style={styles.progress}>已達最高段位！</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: SPACING.horizontal,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    ...SHADOW.card,
  },
  rank: { fontSize: TYPE_SCALE.title, fontWeight: 'bold', color: COLORS.textPrimary },
  points: { fontSize: TYPE_SCALE.small, marginTop: 4, color: COLORS.textPrimary },
  progress: { fontSize: TYPE_SCALE.caption, marginTop: 4, color: COLORS.textSecondary },
});
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/components/RankBadge.test.tsx --verbose
```
Expected: PASS，4 個測試全過

- [ ] **Step 5: Commit**

```bash
git add src/components/RankBadge.tsx src/__tests__/components/RankBadge.test.tsx
git commit -m "feat: RankBadge 改為卡片樣式，陰影色套用 accentColor"
```

---

## Task 4: ItemCard 卡片化

**Files:**
- Modify: `src/components/ItemCard.tsx`
- Modify: `src/__tests__/components/ItemCard.test.tsx`

**Interfaces:**
- Consumes：`COLORS`、`RADIUS`、`SHADOW`、`SPACING`、`TYPE_SCALE` from `src/constants/theme.ts`
- Produces：`ItemCard` 新增必填 prop `accentColor: string`（卡片陰影色），其餘 props 不變。容器 `View` 固定 `testID={`item-card-${item.id}`}`

- [ ] **Step 1: 更新測試（先失敗）**

`src/__tests__/components/ItemCard.test.tsx`（完整覆寫）：

```tsx
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
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/components/ItemCard.test.tsx --verbose
```
Expected: FAIL，`accentColor` prop 缺少型別、`testID="item-card-item-1"` 不存在

- [ ] **Step 3: 改寫 `src/components/ItemCard.tsx`**

```tsx
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import type { Item } from '../types/item';
import { countCheckedConditions } from '../services/itemService';
import { COLORS, RADIUS, SHADOW, SPACING, TYPE_SCALE } from '../constants/theme';

interface ItemCardProps {
  item: Item;
  variant: 'cooling' | 'unlocked';
  accentColor: string;
  onPress: () => void;
  onDelete: () => void;
  onMarkPurchased?: () => void;
  onOpenLink?: () => void;
}

export function ItemCard({ item, variant, accentColor, onPress, onDelete, onMarkPurchased, onOpenLink }: ItemCardProps) {
  return (
    <View testID={`item-card-${item.id}`} style={[styles.card, { shadowColor: accentColor }]}>
      <Pressable onPress={onPress}>
        <Image source={{ uri: item.photoUri }} style={styles.photo} />
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>NT$ {item.price}</Text>
        <Text style={styles.checks}>已勾選 {countCheckedConditions(item)} / {item.conditionChecks.length} 項</Text>
      </Pressable>

      <View style={styles.actions}>
        {variant === 'unlocked' && onMarkPurchased ? (
          <Pressable onPress={onMarkPurchased} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>標記已購買</Text>
          </Pressable>
        ) : null}

        {variant === 'unlocked' && item.url && onOpenLink ? (
          <Pressable onPress={onOpenLink} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>前往購買頁</Text>
          </Pressable>
        ) : null}

        <Pressable onPress={onDelete} style={styles.dangerButton}>
          <Text style={styles.dangerButtonText}>
            {variant === 'cooling' ? '主動放棄' : '刪除（不買了）'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.horizontal,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.card,
    marginBottom: SPACING.verticalMedium,
    ...SHADOW.card,
  },
  photo: { width: '100%', height: 120, borderRadius: RADIUS.card - 2, marginBottom: SPACING.verticalSmall },
  name: { fontSize: TYPE_SCALE.body, fontWeight: '600', color: COLORS.textPrimary },
  price: { fontSize: TYPE_SCALE.small, marginTop: 2, color: COLORS.textPrimary },
  checks: { fontSize: TYPE_SCALE.caption, marginTop: 4, color: COLORS.textSecondary },
  actions: { flexDirection: 'row', marginTop: SPACING.verticalSmall, gap: 8 },
  primaryButton: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#4DABF7', borderRadius: 6 },
  primaryButtonText: { color: '#fff', fontSize: 13 },
  secondaryButton: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: COLORS.border, borderRadius: 6 },
  secondaryButtonText: { fontSize: 13, color: COLORS.textPrimary },
  dangerButton: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#FFE3E3', borderRadius: 6 },
  dangerButtonText: { fontSize: 13, color: COLORS.error },
});
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/components/ItemCard.test.tsx --verbose
```
Expected: PASS，5 個測試全過

- [ ] **Step 5: Commit**

```bash
git add src/components/ItemCard.tsx src/__tests__/components/ItemCard.test.tsx
git commit -m "feat: ItemCard 改為卡片樣式，陰影色套用 accentColor"
```

---

## Task 5: ConditionChecklist 間距/字級調整

**Files:**
- Modify: `src/components/ConditionChecklist.tsx`

**Interfaces:**
- Consumes：`COLORS`、`SPACING`、`TYPE_SCALE` from `src/constants/theme.ts`
- Produces：無 API 變動（props 不變），純樣式調整

此任務不涉及任何新行為（沒有新增 prop、沒有新增互動邏輯），純粹套用 tokens，既有的 `src/__tests__/components/ConditionChecklist.test.tsx` 已完整覆蓋文字渲染、`onToggle` index、勾選數量三項行為，不需要新增測試。

- [ ] **Step 1: 改寫 `src/components/ConditionChecklist.tsx`**

```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPE_SCALE } from '../constants/theme';

interface ConditionChecklistProps {
  labels: string[];
  checks: boolean[];
  onToggle: (index: number) => void;
}

export function ConditionChecklist({ labels, checks, onToggle }: ConditionChecklistProps) {
  const checkedCount = checks.filter(Boolean).length;

  return (
    <View>
      <Text style={styles.summary}>已勾選 {checkedCount} / {labels.length} 項</Text>
      {labels.map((label, index) => (
        <Pressable key={label} style={styles.row} onPress={() => onToggle(index)}>
          <Text style={styles.checkbox}>{checks[index] ? '☑' : '☐'}</Text>
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { fontSize: TYPE_SCALE.caption, fontWeight: '600', marginBottom: SPACING.verticalSmall, color: COLORS.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.verticalMedium },
  checkbox: { fontSize: 18, marginRight: SPACING.verticalSmall },
  label: { fontSize: TYPE_SCALE.body, flex: 1, color: COLORS.textPrimary },
});
```

- [ ] **Step 2: 執行既有測試確認沒有回歸**

```bash
npx jest src/__tests__/components/ConditionChecklist.test.tsx --verbose
```
Expected: PASS，3 個既有測試維持全過（純樣式調整，文字內容與互動行為都沒變）

- [ ] **Step 3: Commit**

```bash
git add src/components/ConditionChecklist.tsx
git commit -m "style: ConditionChecklist 套用間距/字級 tokens"
```

---

## Task 6: 我的畫面套用設計

**Files:**
- Modify: `app/(tabs)/me.tsx`

**Interfaces:**
- Consumes：`RankBadge`（Task 3，需要 `accentColor` prop）、`COLORS`/`SPACING`/`RADIUS`/`SHADOW`/`TYPE_SCALE`/`getContrastColor`/`THEME_COLOR_OPTIONS`（Task 1）
- Produces：無 API 變動，畫面內部樣式調整

`src/__tests__/screens/me.test.tsx` 的既有 5 個測試只斷言文字內容與 `testID`（`theme-color-N`），不涉及樣式細節，本任務不需要修改測試檔案。

- [ ] **Step 1: 改寫 `app/(tabs)/me.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '../../src/store/useAppStore';
import { RankBadge } from '../../src/components/RankBadge';
import * as storage from '../../src/services/storage';
import { computeStats } from '../../src/services/itemService';
import {
  THEME_COLOR_OPTIONS,
  COLORS,
  SPACING,
  RADIUS,
  SHADOW,
  TYPE_SCALE,
  getContrastColor,
} from '../../src/constants/theme';
import type { HistoryStats } from '../../src/types/item';

export default function MeScreen() {
  const { ninjaPoints, currentRank, conditionLabels, themeColor, hydrate, setConditionLabels, setThemeColor } =
    useAppStore();
  const [stats, setStats] = useState<HistoryStats>({ resistedCount: 0, savedAmount: 0 });
  const [isEditingConditions, setIsEditingConditions] = useState(false);
  const [draftLabels, setDraftLabels] = useState(conditionLabels);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useFocusEffect(
    useCallback(() => {
      storage.getHistory().then((history) => setStats(computeStats(history)));
    }, [])
  );

  useEffect(() => {
    if (!isEditingConditions) {
      setDraftLabels(conditionLabels);
    }
  }, [conditionLabels, isEditingConditions]);

  const handleSaveConditions = async () => {
    await setConditionLabels(draftLabels);
    setIsEditingConditions(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>我的</Text>

      <RankBadge points={ninjaPoints} rank={currentRank} accentColor={themeColor} />

      <View style={[styles.statsRow, { shadowColor: themeColor }]}>
        <Text style={styles.statText}>累計放棄 {stats.resistedCount} 次</Text>
        <Text style={styles.statText}>估計省下 NT$ {stats.savedAmount}</Text>
      </View>

      <Text style={styles.sectionTitle}>主題色</Text>
      <View style={styles.themeRow}>
        {THEME_COLOR_OPTIONS.map((color, index) => (
          <Pressable
            key={color}
            testID={`theme-color-${index}`}
            style={[
              styles.themeSwatch,
              { backgroundColor: color },
              themeColor === color && { borderColor: getContrastColor(color), borderWidth: 3 },
            ]}
            onPress={() => setThemeColor(color)}
          />
        ))}
      </View>

      <Pressable onPress={() => setIsEditingConditions((prev) => !prev)}>
        <Text style={styles.sectionTitle}>編輯六項條件</Text>
      </Pressable>

      {isEditingConditions ? (
        <View>
          {draftLabels.map((label, index) => (
            <TextInput
              key={index}
              style={styles.conditionInput}
              value={label}
              onChangeText={(text) =>
                setDraftLabels((prev) => prev.map((l, i) => (i === index ? text : l)))
              }
            />
          ))}
          <Pressable style={[styles.saveButton, { backgroundColor: themeColor }]} onPress={handleSaveConditions}>
            <Text style={[styles.saveButtonText, { color: getContrastColor(themeColor) }]}>儲存條件</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.horizontal, backgroundColor: COLORS.background, flexGrow: 1 },
  title: { fontSize: TYPE_SCALE.title, fontWeight: 'bold', marginBottom: SPACING.verticalLarge, color: COLORS.textPrimary },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: SPACING.verticalLarge,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.verticalMedium,
    ...SHADOW.card,
  },
  statText: { fontSize: TYPE_SCALE.small, color: COLORS.textPrimary },
  sectionTitle: {
    fontSize: TYPE_SCALE.subtitle,
    fontWeight: '600',
    marginTop: SPACING.verticalLarge,
    marginBottom: SPACING.verticalSmall,
    color: COLORS.textPrimary,
  },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  themeSwatch: { width: 32, height: 32, borderRadius: 16 },
  conditionInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.card,
    padding: SPACING.verticalMedium,
    marginBottom: SPACING.verticalSmall,
    color: COLORS.textPrimary,
  },
  saveButton: {
    padding: SPACING.verticalMedium,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    marginTop: SPACING.verticalSmall,
  },
  saveButtonText: { fontWeight: '600', fontSize: TYPE_SCALE.body },
});
```

- [ ] **Step 2: 執行既有測試確認沒有回歸**

```bash
npx jest src/__tests__/screens/me.test.tsx --verbose
```
Expected: PASS，5 個既有測試維持全過

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/me.tsx"
git commit -m "style: 我的畫面套用 design tokens（卡片化、圓形選色、對比文字色）"
```

---

## Task 7: 冷靜區畫面套用設計

**Files:**
- Modify: `app/(tabs)/cooling.tsx`

**Interfaces:**
- Consumes：`ItemCard`（Task 4，需要 `accentColor` prop）、`useAppStore` 的 `themeColor`、`COLORS`/`RADIUS`/`SPACING`/`TYPE_SCALE`/`getContrastColor`（Task 1）
- Produces：無 API 變動，畫面內部樣式調整

`src/__tests__/screens/cooling.test.tsx` 的既有 5 個測試只斷言文字內容，不涉及樣式細節或直接建構 `ItemCard`，本任務不需要修改測試檔案。

- [ ] **Step 1: 改寫 `app/(tabs)/cooling.tsx`**

```tsx
import { useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useItems } from '../../src/hooks/useItems';
import { useAppStore } from '../../src/store/useAppStore';
import { ItemCard } from '../../src/components/ItemCard';
import { COLORS, RADIUS, SPACING, TYPE_SCALE, getContrastColor } from '../../src/constants/theme';

export default function CoolingScreen() {
  const router = useRouter();
  const { coolingItems, deleteItem, reload } = useItems();
  const themeColor = useAppStore((s) => s.themeColor);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>冷靜區</Text>
        <Pressable style={[styles.addButton, { backgroundColor: themeColor }]} onPress={() => router.push('/item/new')}>
          <Text style={[styles.addButtonText, { color: getContrastColor(themeColor) }]}>新增單品</Text>
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
              accentColor={themeColor}
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
  container: { flex: 1, padding: SPACING.horizontal, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.verticalLarge },
  title: { fontSize: TYPE_SCALE.title, fontWeight: 'bold', color: COLORS.textPrimary },
  addButton: { paddingVertical: SPACING.verticalSmall, paddingHorizontal: SPACING.horizontal, borderRadius: RADIUS.pill },
  addButtonText: { fontWeight: '600', fontSize: TYPE_SCALE.small },
  empty: { textAlign: 'center', marginTop: 60, color: COLORS.textSecondary, fontSize: TYPE_SCALE.body },
});
```

- [ ] **Step 2: 執行既有測試確認沒有回歸**

```bash
npx jest src/__tests__/screens/cooling.test.tsx --verbose
```
Expected: PASS，5 個既有測試維持全過

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/cooling.tsx"
git commit -m "style: 冷靜區畫面套用 design tokens（卡片化、主題色膠囊按鈕）"
```

---

## Task 8: 解鎖區畫面套用設計

**Files:**
- Modify: `app/(tabs)/unlocked.tsx`

**Interfaces:**
- Consumes：`ItemCard`（Task 4，需要 `accentColor` prop）、`useAppStore` 的 `themeColor`、`COLORS`/`SPACING`/`TYPE_SCALE`（Task 1）
- Produces：無 API 變動，畫面內部樣式調整

`src/__tests__/screens/unlocked.test.tsx` 的既有 5 個測試只斷言文字內容，不涉及樣式細節或直接建構 `ItemCard`，本任務不需要修改測試檔案。

- [ ] **Step 1: 改寫 `app/(tabs)/unlocked.tsx`**

```tsx
import { useCallback } from 'react';
import { View, Text, FlatList, Linking, StyleSheet } from 'react-native';
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
              accentColor={themeColor}
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
  container: { flex: 1, padding: SPACING.horizontal, backgroundColor: COLORS.background },
  title: { fontSize: TYPE_SCALE.title, fontWeight: 'bold', marginBottom: SPACING.verticalLarge, color: COLORS.textPrimary },
  empty: { textAlign: 'center', marginTop: 60, color: COLORS.textSecondary, fontSize: TYPE_SCALE.body },
});
```

- [ ] **Step 2: 執行既有測試確認沒有回歸**

```bash
npx jest src/__tests__/screens/unlocked.test.tsx --verbose
```
Expected: PASS，5 個既有測試維持全過

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/unlocked.tsx"
git commit -m "style: 解鎖區畫面套用 design tokens"
```

---

## Task 9: 新增單品畫面套用設計（含快捷日期按鈕選中狀態修正）

**Files:**
- Modify: `app/item/new.tsx`
- Modify: `src/__tests__/screens/itemNew.test.tsx`

**Interfaces:**
- Consumes：`ConditionChecklist`（Task 5）、`useAppStore` 的 `themeColor`/`conditionLabels`、`COLORS`/`RADIUS`/`SPACING`/`TYPE_SCALE`/`getContrastColor`（Task 1）
- Produces：無對外 API 變動（畫面本身無 props）。內部新增 `selectedDays` state 修正快捷日期按鈕的選中樣式判斷（原本的 `quickDateButtonActive` 邏輯是反的：沒選任何按鈕時全部按鈕都會套用「選中樣式」、選了之後反而沒有任何按鈕顯示選中——這次順便修正，因為本任務本來就要重寫這段按鈕的樣式邏輯）

- [ ] **Step 1: 更新測試（先失敗，新增一項快捷日期選中狀態測試）**

`src/__tests__/screens/itemNew.test.tsx`（完整覆寫）：

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NewItemScreen from '../../../app/item/new';
import * as storage from '../../services/storage';
import { DEFAULT_THEME_COLOR } from '../../constants/theme';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('NewItemScreen', () => {
  it('填寫名稱與價格後送出，會呼叫 storage.saveItems 並返回上一頁', async () => {
    await render(<NewItemScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('單品名稱'), '測試外套');
    await fireEvent.changeText(screen.getByPlaceholderText('價格'), '1200');

    await fireEvent.press(screen.getByText('7 天後'));
    await fireEvent.press(screen.getByText('儲存'));

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('測試外套');
      expect(items[0].price).toBe(1200);
    });

    expect(mockBack).toHaveBeenCalled();
  });

  it('名稱空白時不能送出，也不會呼叫 back', async () => {
    await render(<NewItemScreen />);

    await fireEvent.press(screen.getByText('7 天後'));
    await fireEvent.press(screen.getByText('儲存'));

    await waitFor(() => {
      expect(screen.getByText('請輸入單品名稱')).toBeTruthy();
    });
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('可以勾選六項條件其中幾項', async () => {
    await render(<NewItemScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('單品名稱'), '測試外套');
    await fireEvent.changeText(screen.getByPlaceholderText('價格'), '1200');
    await fireEvent.press(screen.getByText('7 天後'));
    await fireEvent.press(screen.getByText('符合我的風格嗎？'));
    await fireEvent.press(screen.getByText('儲存'));

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items[0].conditionChecks[2]).toBe(true);
    });
  });

  it('點選解鎖日期快捷按鈕後，該按鈕會顯示選中樣式，其他按鈕不會', async () => {
    await render(<NewItemScreen />);

    await fireEvent.press(screen.getByText('14 天後'));

    const selectedButton = screen.getByTestId('quick-date-14');
    expect(StyleSheet.flatten(selectedButton.props.style).backgroundColor).toBe(DEFAULT_THEME_COLOR);

    const unselectedButton = screen.getByTestId('quick-date-7');
    expect(StyleSheet.flatten(unselectedButton.props.style).backgroundColor).not.toBe(DEFAULT_THEME_COLOR);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/screens/itemNew.test.tsx --verbose
```
Expected: FAIL，新增的「點選解鎖日期快捷按鈕」測試會失敗（`testID="quick-date-14"` 尚不存在）

- [ ] **Step 3: 改寫 `app/item/new.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useItems } from '../../src/hooks/useItems';
import { useAppStore } from '../../src/store/useAppStore';
import { ConditionChecklist } from '../../src/components/ConditionChecklist';
import { CONDITION_COUNT } from '../../src/constants/conditions';
import { COLORS, RADIUS, SPACING, TYPE_SCALE, getContrastColor } from '../../src/constants/theme';

const QUICK_DAY_OPTIONS = [
  { label: '7 天後', days: 7 },
  { label: '14 天後', days: 14 },
  { label: '30 天後', days: 30 },
];

function addDaysIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export default function NewItemScreen() {
  const router = useRouter();
  const { addItem } = useItems();
  const { conditionLabels, themeColor } = useAppStore();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [unlockDate, setUnlockDate] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [checks, setChecks] = useState<boolean[]>(new Array(CONDITION_COUNT).fill(false));
  const [error, setError] = useState<string | null>(null);

  const toggleCheck = (index: number) => {
    setChecks((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('請輸入單品名稱');
      return;
    }
    if (!unlockDate) {
      setError('請選擇解鎖日期');
      return;
    }

    await addItem({
      name: name.trim(),
      photoUri: 'mock://photo.jpg',
      price: Number(price) || 0,
      url: url.trim() || undefined,
      note: note.trim() || undefined,
      unlockDate,
      initialConditionChecks: checks,
    });

    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput style={styles.input} placeholder="單品名稱" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder="價格"
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
      />
      <TextInput style={styles.input} placeholder="購買連結（可選）" value={url} onChangeText={setUrl} />
      <TextInput style={styles.input} placeholder="備註（可選）" value={note} onChangeText={setNote} />

      <Text style={styles.sectionTitle}>解鎖日期</Text>
      <View style={styles.quickDateRow}>
        {QUICK_DAY_OPTIONS.map((option) => {
          const isSelected = selectedDays === option.days;
          return (
            <Pressable
              key={option.label}
              testID={`quick-date-${option.days}`}
              style={[styles.quickDateButton, isSelected && { backgroundColor: themeColor }]}
              onPress={() => {
                setSelectedDays(option.days);
                setUnlockDate(addDaysIso(option.days));
              }}
            >
              <Text style={isSelected ? { color: getContrastColor(themeColor) } : styles.quickDateButtonText}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>六項條件</Text>
      <ConditionChecklist labels={conditionLabels} checks={checks} onToggle={toggleCheck} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.submitButton, { backgroundColor: themeColor }]} onPress={handleSubmit}>
        <Text style={[styles.submitButtonText, { color: getContrastColor(themeColor) }]}>儲存</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.horizontal, backgroundColor: COLORS.background, flexGrow: 1 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.card,
    padding: SPACING.verticalMedium,
    marginBottom: SPACING.verticalMedium,
    color: COLORS.textPrimary,
  },
  sectionTitle: {
    fontSize: TYPE_SCALE.subtitle,
    fontWeight: '600',
    marginTop: SPACING.verticalSmall,
    marginBottom: SPACING.verticalSmall,
    color: COLORS.textPrimary,
  },
  quickDateRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.verticalLarge },
  quickDateButton: {
    paddingVertical: SPACING.verticalSmall,
    paddingHorizontal: SPACING.verticalMedium,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.border,
  },
  quickDateButtonText: { color: COLORS.textPrimary },
  error: { color: COLORS.error, marginBottom: SPACING.verticalMedium },
  submitButton: { padding: SPACING.verticalMedium, borderRadius: RADIUS.pill, alignItems: 'center', marginTop: SPACING.verticalLarge },
  submitButtonText: { fontWeight: '600', fontSize: TYPE_SCALE.body },
});
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/screens/itemNew.test.tsx --verbose
```
Expected: PASS，4 個測試全過

- [ ] **Step 5: Commit**

```bash
git add app/item/new.tsx src/__tests__/screens/itemNew.test.tsx
git commit -m "style: 新增單品畫面套用 design tokens，修正快捷日期按鈕選中狀態邏輯"
```

---

## Task 10: 單品詳情畫面套用設計

**Files:**
- Modify: `app/item/[id].tsx`

**Interfaces:**
- Consumes：`ConditionChecklist`（Task 5）、`COLORS`/`SPACING`/`TYPE_SCALE`（Task 1）
- Produces：無 API 變動，畫面內部樣式調整

`src/__tests__/screens/itemEdit.test.tsx` 的既有 2 個測試只斷言文字內容，本任務不需要修改測試檔案。

- [ ] **Step 1: 改寫 `app/item/[id].tsx`**

```tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useItems } from '../../src/hooks/useItems';
import { useAppStore } from '../../src/store/useAppStore';
import { ConditionChecklist } from '../../src/components/ConditionChecklist';
import { COLORS, SPACING, TYPE_SCALE } from '../../src/constants/theme';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, updateConditionChecks } = useItems();
  const conditionLabels = useAppStore((s) => s.conditionLabels);

  const item = items.find((i) => i.id === id);

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>找不到這筆單品</Text>
      </View>
    );
  }

  const toggleCheck = (index: number) => {
    const nextChecks = item.conditionChecks.map((v, i) => (i === index ? !v : v));
    updateConditionChecks(item.id, nextChecks);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.price}>NT$ {item.price}</Text>
      {item.note ? <Text style={styles.note}>{item.note}</Text> : null}

      <ConditionChecklist labels={conditionLabels} checks={item.conditionChecks} onToggle={toggleCheck} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.horizontal, backgroundColor: COLORS.background, flexGrow: 1 },
  name: { fontSize: TYPE_SCALE.title, fontWeight: 'bold', marginBottom: 4, color: COLORS.textPrimary },
  price: { fontSize: TYPE_SCALE.body, marginBottom: SPACING.verticalSmall, color: COLORS.textPrimary },
  note: { fontSize: TYPE_SCALE.small, color: COLORS.textSecondary, marginBottom: SPACING.verticalLarge },
  notFound: { fontSize: TYPE_SCALE.body, color: COLORS.textSecondary },
});
```

- [ ] **Step 2: 執行既有測試確認沒有回歸**

```bash
npx jest src/__tests__/screens/itemEdit.test.tsx --verbose
```
Expected: PASS，2 個既有測試維持全過

- [ ] **Step 3: 執行完整測試套件，確認全部 5 個畫面 + 元件改動沒有互相破壞**

```bash
npx jest --verbose
npx tsc --noEmit
```
Expected: 全部測試通過（原有 105 個 + 本計畫新增的測試），`tsc` 無錯誤

- [ ] **Step 4: 本機建置實機驗證視覺結果**

```bash
bash /Users/mimi/.claude/skills/build-apk/scripts/build-apk.sh
```

裝到裝置上，實際打開五個畫面，對照 `docs/superpowers/specs/2026-07-29-design-refresh-design.md` 第 5 節逐一確認：卡片陰影/圓角、暖白背景、主題色膠囊按鈕、圓形選色、Tab bar 選中色是否正確套用。

- [ ] **Step 5: Commit**

```bash
git add app/item/[id].tsx
git commit -m "style: 單品詳情畫面套用 design tokens"
```

---

## 自我檢查（Plan Self-Review）

**Spec 覆蓋確認：**
- §3.1 顏色（主題色色票、固定色、`getContrastColor`）→ Task 1
- §3.2 間距/圓角/陰影/字級 tokens → Task 1
- §4 Tab Bar → Task 2
- §5 我的畫面 → Task 6（含 Task 3 的 RankBadge 卡片化）
- §5 冷靜區／解鎖區 → Task 7、Task 8（含 Task 4 的 ItemCard 卡片化）
- §5 新增單品／單品詳情 → Task 9、Task 10（含 Task 5 的 ConditionChecklist 調整）
- §6 排除範圍（不加 icon、不加字型切換、不做深色模式、不處理廣告安全區耦合）→ 未在任何任務中實作，符合排除範圍
- §7 測試策略（`getContrastColor` 單元測試、Tab bar 主題色綁定測試、既有文字斷言測試風格）→ Task 1、Task 2 的新測試；Task 3-10 沿用/更新既有測試

**Placeholder 掃描：** 已重新檢視全部 10 個任務，沒有 TBD／「之後補」／模糊的錯誤處理描述。Task 2 Step 5 與 Task 10 Step 4 的「本機建置實機驗證」是刻意的手動驗證步驟（因為 `useSafeAreaInsets` 與實際視覺效果無法完全被 Jest 覆蓋），不是偷懶留白。

**型別一致性檢查：** `RankBadge`、`ItemCard` 新增的 `accentColor: string` 必填 prop，在 Task 3/4 定義後，Task 6/7/8 呼叫端都正確傳入 `themeColor`；`COLORS`/`SPACING`/`RADIUS`/`SHADOW`/`TYPE_SCALE`/`getContrastColor` 的匯出名稱在 Task 1 定義後，後續任務的 import 語句都對得上；`THEME_COLOR_OPTIONS`/`DEFAULT_THEME_COLOR` 沿用既有匯出名稱不變。

---

Plan complete and saved to `docs/superpowers/plans/2026-07-29-design-refresh.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach？**
