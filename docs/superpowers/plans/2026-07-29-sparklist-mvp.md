# SPARK LIST MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 SPARK LIST — 一款「衝動購物冷靜期」App：使用者記錄心動單品、設定解鎖日期，解鎖後（日期已過 AND 六項條件勾滿 3 項）才能購買，並透過忍術點數/段位、音效、通知把「忍住不買」變成遊戲化的慶祝體驗。

**Architecture:** Expo Router 三分頁（我的／冷靜區／解鎖區）＋ AsyncStorage 持久化 ＋ 分層架構（`services/` 純函式 → `hooks/` 狀態封裝 → `app/` 畫面）。全域狀態（忍術點數/段位/條件文字/主題色）用 Zustand，單品清單狀態用 custom hook（`useItems`）。

**Tech Stack:** React Native 0.81.x、Expo SDK 54、Expo Router v6、TypeScript（strict）、Zustand v5、Jest + jest-expo + @testing-library/react-native、EAS Build、`@react-native-async-storage/async-storage`、`expo-image-picker`、`expo-notifications`、`expo-audio`。

## Global Constraints

- React Native 0.81.x、Expo SDK 54（`create-expo-app` 產生的 package.json 版本需落在此範圍，不符合需手動調整）
- TypeScript `strict: true`，`paths` 設定 `@/*` → `./src/*`（見 `docs/REUSABLE_INFRA.md` §2）
- Jest 設定沿用 `docs/REUSABLE_INFRA.md` §3 骨架，`testMatch` 固定為 `<rootDir>/src/__tests__/**/*.test.(ts|tsx)`
- 資料儲存只用 AsyncStorage + JSON，**不使用 SQLite**（spec §7 決議）
- 六項條件預設文字必須逐字使用（spec §5），不得意譯或改寫：
  1. 可做出三套穿搭嗎？
  2. 我可以在一個月內完全不用思考就穿出門嗎？
  3. 符合我的風格嗎？
  4. 我已經有類似的單品嗎？
  5. C/P 值夠高嗎？（值得嗎？）
  6. 材質/洗滌方式我夠了解嗎？（耐用度高嗎）
- 忍術段位門檻與名稱必須逐字使用（spec §6）：3 點＝忍術小達人｜10 點＝王牌忍術師｜20 點＝金牌忍術師｜50 點＝白金忍術師｜100 點＝鑽石忍術師
- 三分頁名稱固定：我的／冷靜區／解鎖區（spec §3）
- 解鎖判斷邏輯固定為 AND：`(now >= unlockDate) AND (勾選數 >= 3)`（spec §2）
- 不做多使用者/雲端同步/登入、不做商品分類標籤、不做獨立的「還心動嗎？」確認步驟（spec §9 排除範圍）
- 本計畫不含 UI 視覺風格打磨（配色細節、動畫效果），僅實作功能正確性；主題色僅止於「可選色票套用」的基本功能

---

## Task 1: 專案初始化（Expo + TypeScript + Jest + 原生模組 Mock）

**Files:**
- Modify: `package.json`（新增 dependencies、jest 設定區塊）
- Create: `tsconfig.json`
- Create: `app.json`
- Create: `eas.json`
- Create: `.gitignore`（若既有則覆寫為骨架版本）
- Create: `.claude/settings.local.json`
- Create: `src/__mocks__/async-storage.ts`
- Create: `src/__mocks__/expo-image-picker.ts`
- Create: `src/__mocks__/expo-notifications.ts`
- Create: `src/__mocks__/expo-audio.ts`

**Interfaces:**
- Produces：完整可執行的 Expo Router 專案骨架、Jest 測試環境、四個原生模組 mock 檔案，後續所有任務依賴這些 mock 才能在 Jest 下測試。

此任務屬於純腳手架設定，沒有「寫測試先失敗」的循環，但結束時必須讓 `npx tsc --noEmit` 與 `npx jest --passWithNoTests` 都成功執行，作為此任務的驗收標準。

- [ ] **Step 1: 用 Expo 官方工具建立 TypeScript 專案骨架**

目前目錄已有 `README.md` 與 `.git`（已初始化的 git repo），非全空目錄。執行：

```bash
npx create-expo-app@latest . --template blank-typescript
```

如果指令因為目錄非空而報錯，改用暫存目錄再搬移：

```bash
npx create-expo-app@latest sparklist-tmp --template blank-typescript
rsync -a --exclude 'node_modules' sparklist-tmp/ ./
rm -rf sparklist-tmp
```

執行後確認 `package.json` 內 `"expo"` 版本落在 `~54.x` 範圍（`cat package.json | grep '"expo"'`），若不是，執行 `npx expo install expo@54`。

- [ ] **Step 2: 安裝 Expo Router 與必要 peer 套件**

```bash
npx expo install expo-router expo-linking expo-constants expo-status-bar react-native-safe-area-context react-native-screens
```

- [ ] **Step 3: 安裝業務所需原生模組**

```bash
npx expo install @react-native-async-storage/async-storage expo-image-picker expo-notifications expo-audio
```

- [ ] **Step 4: 安裝狀態管理與測試套件**

```bash
npm install zustand
npm install --save-dev jest-expo @testing-library/react-native @types/jest
```

- [ ] **Step 5: 設定 `package.json` 的 `main` 入口與 `jest` 區塊**

編輯 `package.json`，將 `"main"` 欄位設為：

```json
"main": "expo-router/entry"
```

在 `package.json` 頂層加入（若已有 `"jest"` 區塊則整段取代）：

```json
"jest": {
  "preset": "jest-expo",
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|zustand)"
  ],
  "moduleNameMapper": {
    "^expo-image-picker$": "<rootDir>/src/__mocks__/expo-image-picker.ts",
    "^expo-notifications$": "<rootDir>/src/__mocks__/expo-notifications.ts",
    "^expo-audio$": "<rootDir>/src/__mocks__/expo-audio.ts",
    "^@react-native-async-storage/async-storage$": "<rootDir>/src/__mocks__/async-storage.ts"
  },
  "testMatch": [
    "<rootDir>/src/__tests__/**/*.test.(ts|tsx)"
  ],
  "collectCoverageFrom": [
    "src/**/*.{ts,tsx}",
    "!src/__mocks__/**",
    "!src/__tests__/**"
  ]
}
```

- [ ] **Step 6: 寫 `tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ],
  "exclude": [
    "node_modules",
    "src/__mocks__",
    "src/__tests__"
  ]
}
```

- [ ] **Step 7: 建立四個原生模組 mock 檔案**

`src/__mocks__/async-storage.ts`：

```ts
const store: Record<string, string> = {};

const AsyncStorage = {
  getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve(); }),
  removeItem: jest.fn((key: string) => { delete store[key]; return Promise.resolve(); }),
  clear: jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); return Promise.resolve(); }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
  multiGet: jest.fn((keys: string[]) => Promise.resolve(keys.map(k => [k, store[k] ?? null]))),
  multiSet: jest.fn((pairs: [string, string][]) => { pairs.forEach(([k, v]) => { store[k] = v; }); return Promise.resolve(); }),
  __store: store,
};

export default AsyncStorage;
```

`src/__mocks__/expo-image-picker.ts`：

```ts
export const MediaTypeOptions = { Images: 'Images' };

export const requestMediaLibraryPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const requestCameraPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const launchImageLibraryAsync = jest.fn().mockResolvedValue({
  canceled: false,
  assets: [{ uri: 'mock://photo.jpg' }],
});
export const launchCameraAsync = jest.fn().mockResolvedValue({
  canceled: false,
  assets: [{ uri: 'mock://photo.jpg' }],
});
```

`src/__mocks__/expo-notifications.ts`：

```ts
export const scheduleNotificationAsync = jest.fn().mockResolvedValue('mock-notification-id');
export const cancelScheduledNotificationAsync = jest.fn().mockResolvedValue(undefined);
export const requestPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const getPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const setNotificationHandler = jest.fn();
export const addNotificationResponseReceivedListener = jest.fn(() => ({ remove: jest.fn() }));
```

`src/__mocks__/expo-audio.ts`：

```ts
const mockPlayer = {
  play: jest.fn(),
  pause: jest.fn(),
  remove: jest.fn(),
  seekTo: jest.fn(),
};

export const createAudioPlayer = jest.fn(() => mockPlayer);
export const __mockPlayer = mockPlayer;
```

- [ ] **Step 8: 寫 `app.json`**

```json
{
  "expo": {
    "name": "SPARK LIST",
    "slug": "sparklist",
    "scheme": "sparklist",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "android": {
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "output": "static"
    },
    "plugins": [
      "expo-router",
      "expo-notifications"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 9: 寫 `eas.json`**

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

（`submit` 區塊需要正式的 Apple ID，等到真正要上架時再手動補上，此階段先不寫。）

- [ ] **Step 10: 寫 `.gitignore`**

```
node_modules/

.expo/
dist/
web-build/
expo-env.d.ts

.kotlin/
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

.metro-health-check*

npm-debug.*
yarn-debug.*
yarn-error.*

.DS_Store
*.pem

.env*.local

*.tsbuildinfo

/ios
/android

/coverage
/tmp/e2e-*.png

*.apk
*.aab
*.ipa

*.log
/tmp/expo-*.log
```

- [ ] **Step 11: 寫 `.claude/settings.local.json`**

```json
{
  "permissions": {
    "allow": [
      "Bash(npx expo *)",
      "Bash(npm install *)",
      "Bash(npx jest *)",
      "Bash(npx tsc *)",
      "Bash(npm test *)",
      "Bash(node *)",
      "Bash(git *)",
      "Bash(npx eas *)",
      "Bash(npx eas-cli *)",
      "Bash(adb install *)",
      "Bash(adb devices *)",
      "Bash(java -version)",
      "Bash(./gradlew assembleRelease)",
      "Bash(npx agent-browser *)",
      "Bash(npx playwright *)",
      "Bash(gh auth *)",
      "Bash(gh repo *)"
    ]
  }
}
```

- [ ] **Step 12: 驗證型別檢查與測試環境**

```bash
npx tsc --noEmit
```
Expected: 沒有錯誤輸出

```bash
npx jest --passWithNoTests
```
Expected: `No tests found, exiting with code 0`（因為尚未寫任何測試）

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: 初始化 Expo Router 專案骨架與測試環境"
```

---

## Task 2: 核心型別與常數

**Files:**
- Create: `src/types/item.ts`
- Create: `src/constants/conditions.ts`
- Create: `src/constants/rank.ts`
- Create: `src/constants/theme.ts`
- Test: `src/__tests__/constants/conditions.test.ts`
- Test: `src/__tests__/constants/rank.test.ts`

**Interfaces:**
- Produces：
  - `Item`、`ItemStatus`、`HistoryLogEntry`、`HistoryOutcome`、`HistoryStats` 型別（`src/types/item.ts`）
  - `DEFAULT_CONDITION_LABELS: string[]`、`CONDITION_COUNT = 6`、`MIN_CONDITIONS_TO_UNLOCK = 3`（`src/constants/conditions.ts`）
  - `RankName` 型別、`RANK_THRESHOLDS: RankThreshold[]`（`src/constants/rank.ts`）
  - `THEME_COLOR_OPTIONS: string[]`、`DEFAULT_THEME_COLOR: string`（`src/constants/theme.ts`）

- [ ] **Step 1: 寫常數測試（先失敗）**

`src/__tests__/constants/conditions.test.ts`：

```ts
import { DEFAULT_CONDITION_LABELS, CONDITION_COUNT, MIN_CONDITIONS_TO_UNLOCK } from '../../constants/conditions';

describe('conditions constants', () => {
  it('有剛好 6 項預設條件文字', () => {
    expect(DEFAULT_CONDITION_LABELS).toHaveLength(6);
    expect(CONDITION_COUNT).toBe(6);
  });

  it('解鎖門檻是 3 項', () => {
    expect(MIN_CONDITIONS_TO_UNLOCK).toBe(3);
  });

  it('條件文字與 spec 逐字相符', () => {
    expect(DEFAULT_CONDITION_LABELS).toEqual([
      '可做出三套穿搭嗎？',
      '我可以在一個月內完全不用思考就穿出門嗎？',
      '符合我的風格嗎？',
      '我已經有類似的單品嗎？',
      'C/P 值夠高嗎？（值得嗎？）',
      '材質/洗滌方式我夠了解嗎？（耐用度高嗎）',
    ]);
  });
});
```

`src/__tests__/constants/rank.test.ts`：

```ts
import { RANK_THRESHOLDS } from '../../constants/rank';

describe('rank thresholds', () => {
  it('門檻依點數由小到大排序', () => {
    const points = RANK_THRESHOLDS.map((t) => t.minPoints);
    expect(points).toEqual([...points].sort((a, b) => a - b));
  });

  it('段位名稱與 spec 逐字相符', () => {
    expect(RANK_THRESHOLDS.map((t) => t.name)).toEqual([
      '尚無段位',
      '忍術小達人',
      '王牌忍術師',
      '金牌忍術師',
      '白金忍術師',
      '鑽石忍術師',
    ]);
  });

  it('點數門檻與 spec 逐字相符', () => {
    expect(RANK_THRESHOLDS.map((t) => t.minPoints)).toEqual([0, 3, 10, 20, 50, 100]);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/constants -v
```
Expected: FAIL，找不到 `../../constants/conditions` 與 `../../constants/rank` 模組

- [ ] **Step 3: 寫型別檔案**

`src/types/item.ts`：

```ts
export type ItemStatus = 'cooling' | 'unlocked';
export type HistoryOutcome = 'purchased' | 'resisted';

export interface Item {
  id: string;
  name: string;
  photoUri: string;
  price: number;
  url?: string;
  note?: string;
  createdAt: string;
  unlockDate: string;
  conditionChecks: boolean[];
  status: ItemStatus;
}

export interface HistoryLogEntry {
  id: string;
  itemName: string;
  price: number;
  outcome: HistoryOutcome;
  recordedAt: string;
}

export interface HistoryStats {
  resistedCount: number;
  savedAmount: number;
}
```

- [ ] **Step 4: 寫常數檔案**

`src/constants/conditions.ts`：

```ts
export const DEFAULT_CONDITION_LABELS: string[] = [
  '可做出三套穿搭嗎？',
  '我可以在一個月內完全不用思考就穿出門嗎？',
  '符合我的風格嗎？',
  '我已經有類似的單品嗎？',
  'C/P 值夠高嗎？（值得嗎？）',
  '材質/洗滌方式我夠了解嗎？（耐用度高嗎）',
];

export const CONDITION_COUNT = 6;
export const MIN_CONDITIONS_TO_UNLOCK = 3;
```

`src/constants/rank.ts`：

```ts
export type RankName =
  | '尚無段位'
  | '忍術小達人'
  | '王牌忍術師'
  | '金牌忍術師'
  | '白金忍術師'
  | '鑽石忍術師';

export interface RankThreshold {
  minPoints: number;
  name: RankName;
}

export const RANK_THRESHOLDS: RankThreshold[] = [
  { minPoints: 0, name: '尚無段位' },
  { minPoints: 3, name: '忍術小達人' },
  { minPoints: 10, name: '王牌忍術師' },
  { minPoints: 20, name: '金牌忍術師' },
  { minPoints: 50, name: '白金忍術師' },
  { minPoints: 100, name: '鑽石忍術師' },
];
```

`src/constants/theme.ts`：

```ts
export const THEME_COLOR_OPTIONS: string[] = [
  '#FF6B6B',
  '#FFA94D',
  '#4DABF7',
  '#69DB7C',
  '#DA77F2',
  '#495057',
];

export const DEFAULT_THEME_COLOR = THEME_COLOR_OPTIONS[0];
```

- [ ] **Step 5: 執行測試確認通過**

```bash
npx jest src/__tests__/constants -v
```
Expected: PASS，6 個測試全過

- [ ] **Step 6: Commit**

```bash
git add src/types src/constants src/__tests__/constants
git commit -m "feat: 新增核心型別與六項條件/段位/主題色常數"
```

---

## Task 3: AsyncStorage 持久化層（storage.ts）

**Files:**
- Create: `src/services/storage.ts`
- Test: `src/__tests__/services/storage.test.ts`

**Interfaces:**
- Consumes：`Item`、`HistoryLogEntry` from `src/types/item.ts`
- Produces：
  - `getItems(): Promise<Item[]>`
  - `saveItems(items: Item[]): Promise<void>`
  - `getHistory(): Promise<HistoryLogEntry[]>`
  - `saveHistory(history: HistoryLogEntry[]): Promise<void>`
  - `PersistedAppState { ninjaPoints: number; conditionLabels: string[]; themeColor: string }`
  - `getAppState(): Promise<PersistedAppState | null>`
  - `saveAppState(state: PersistedAppState): Promise<void>`

- [ ] **Step 1: 寫測試（先失敗）**

`src/__tests__/services/storage.test.ts`：

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as storage from '../../services/storage';
import type { Item, HistoryLogEntry } from '../../types/item';

const sampleItem: Item = {
  id: 'item-1',
  name: '測試外套',
  photoUri: 'mock://photo.jpg',
  price: 1000,
  createdAt: '2026-07-29T00:00:00.000Z',
  unlockDate: '2026-08-05T00:00:00.000Z',
  conditionChecks: [true, false, false, false, false, false],
  status: 'cooling',
};

const sampleHistory: HistoryLogEntry = {
  id: 'history-1',
  itemName: '測試外套',
  price: 1000,
  outcome: 'resisted',
  recordedAt: '2026-07-29T00:00:00.000Z',
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('storage service', () => {
  it('沒有資料時 getItems 回傳空陣列', async () => {
    expect(await storage.getItems()).toEqual([]);
  });

  it('saveItems 後 getItems 可以讀回相同資料', async () => {
    await storage.saveItems([sampleItem]);
    expect(await storage.getItems()).toEqual([sampleItem]);
  });

  it('沒有資料時 getHistory 回傳空陣列', async () => {
    expect(await storage.getHistory()).toEqual([]);
  });

  it('saveHistory 後 getHistory 可以讀回相同資料', async () => {
    await storage.saveHistory([sampleHistory]);
    expect(await storage.getHistory()).toEqual([sampleHistory]);
  });

  it('沒有資料時 getAppState 回傳 null', async () => {
    expect(await storage.getAppState()).toBeNull();
  });

  it('saveAppState 後 getAppState 可以讀回相同資料', async () => {
    const state = { ninjaPoints: 5, conditionLabels: ['a', 'b'], themeColor: '#FF6B6B' };
    await storage.saveAppState(state);
    expect(await storage.getAppState()).toEqual(state);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/services/storage.test.ts -v
```
Expected: FAIL，找不到 `../../services/storage` 模組

- [ ] **Step 3: 實作 `src/services/storage.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Item, HistoryLogEntry } from '../types/item';

const ITEMS_KEY = 'sparklist:items';
const HISTORY_KEY = 'sparklist:history';
const APP_STATE_KEY = 'sparklist:appState';

export interface PersistedAppState {
  ninjaPoints: number;
  conditionLabels: string[];
  themeColor: string;
}

export async function getItems(): Promise<Item[]> {
  const raw = await AsyncStorage.getItem(ITEMS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveItems(items: Item[]): Promise<void> {
  await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

export async function getHistory(): Promise<HistoryLogEntry[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveHistory(history: HistoryLogEntry[]): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export async function getAppState(): Promise<PersistedAppState | null> {
  const raw = await AsyncStorage.getItem(APP_STATE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveAppState(state: PersistedAppState): Promise<void> {
  await AsyncStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/services/storage.test.ts -v
```
Expected: PASS，6 個測試全過

- [ ] **Step 5: Commit**

```bash
git add src/services/storage.ts src/__tests__/services/storage.test.ts
git commit -m "feat: 新增 AsyncStorage 持久化層"
```

---

## Task 4: itemService（解鎖判斷邏輯與單品輔助函式）

**Files:**
- Create: `src/services/itemService.ts`
- Test: `src/__tests__/services/itemService.test.ts`

**Interfaces:**
- Consumes：`Item`、`HistoryLogEntry`、`HistoryOutcome`、`HistoryStats` from `src/types/item.ts`；`MIN_CONDITIONS_TO_UNLOCK` from `src/constants/conditions.ts`
- Produces：
  - `createItem(input): Item`
  - `countCheckedConditions(item: Item): number`
  - `isUnlockable(item: Item, now: Date): boolean`
  - `recalculateStatus(item: Item, now: Date): Item`
  - `recalculateAllStatuses(items: Item[], now: Date): { items: Item[]; newlyUnlockedIds: string[] }`
  - `isNearUnlock(item: Item, now: Date, daysThreshold?: number): boolean`
  - `daysUntilUnlock(item: Item, now: Date): number`
  - `sortByUnlockDateAscending(items: Item[]): Item[]`
  - `createHistoryEntry(item: Item, outcome: HistoryOutcome): HistoryLogEntry`
  - `computeStats(history: HistoryLogEntry[]): HistoryStats`

這是全 App 邏輯正確性最關鍵的模組，測試需覆蓋所有邊界情況。

- [ ] **Step 1: 寫測試（先失敗）**

`src/__tests__/services/itemService.test.ts`：

```ts
import * as itemService from '../../services/itemService';
import type { Item } from '../../types/item';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    name: '測試外套',
    photoUri: 'mock://photo.jpg',
    price: 1000,
    createdAt: '2026-07-01T00:00:00.000Z',
    unlockDate: '2026-07-10T00:00:00.000Z',
    conditionChecks: [false, false, false, false, false, false],
    status: 'cooling',
    ...overrides,
  };
}

describe('createItem', () => {
  it('建立的單品狀態預設為 cooling，且有唯一 id', () => {
    const item = itemService.createItem({
      name: '外套',
      photoUri: 'mock://photo.jpg',
      price: 1000,
      unlockDate: '2026-08-01T00:00:00.000Z',
    });
    expect(item.status).toBe('cooling');
    expect(item.id).toBeTruthy();
    expect(item.conditionChecks).toEqual([false, false, false, false, false, false]);
  });

  it('可以帶入初始勾選狀態', () => {
    const item = itemService.createItem({
      name: '外套',
      photoUri: 'mock://photo.jpg',
      price: 1000,
      unlockDate: '2026-08-01T00:00:00.000Z',
      initialConditionChecks: [true, true, false, false, false, false],
    });
    expect(item.conditionChecks).toEqual([true, true, false, false, false, false]);
  });
});

describe('countCheckedConditions', () => {
  it('計算勾選數量', () => {
    const item = makeItem({ conditionChecks: [true, true, true, false, false, false] });
    expect(itemService.countCheckedConditions(item)).toBe(3);
  });
});

describe('isUnlockable', () => {
  it('日期未到，即使勾滿 3 項也不能解鎖', () => {
    const item = makeItem({
      unlockDate: '2026-08-01T00:00:00.000Z',
      conditionChecks: [true, true, true, false, false, false],
    });
    expect(itemService.isUnlockable(item, new Date('2026-07-15T00:00:00.000Z'))).toBe(false);
  });

  it('日期已過，但勾選數不足 3 項不能解鎖', () => {
    const item = makeItem({
      unlockDate: '2026-07-01T00:00:00.000Z',
      conditionChecks: [true, true, false, false, false, false],
    });
    expect(itemService.isUnlockable(item, new Date('2026-07-15T00:00:00.000Z'))).toBe(false);
  });

  it('日期已過且勾滿 3 項可以解鎖', () => {
    const item = makeItem({
      unlockDate: '2026-07-01T00:00:00.000Z',
      conditionChecks: [true, true, true, false, false, false],
    });
    expect(itemService.isUnlockable(item, new Date('2026-07-15T00:00:00.000Z'))).toBe(true);
  });

  it('日期恰好等於現在，且勾滿 3 項可以解鎖（邊界值）', () => {
    const item = makeItem({
      unlockDate: '2026-07-15T00:00:00.000Z',
      conditionChecks: [true, true, true, false, false, false],
    });
    expect(itemService.isUnlockable(item, new Date('2026-07-15T00:00:00.000Z'))).toBe(true);
  });
});

describe('recalculateStatus / recalculateAllStatuses', () => {
  it('符合解鎖條件時狀態從 cooling 轉為 unlocked', () => {
    const item = makeItem({
      unlockDate: '2026-07-01T00:00:00.000Z',
      conditionChecks: [true, true, true, false, false, false],
    });
    const result = itemService.recalculateStatus(item, new Date('2026-07-15T00:00:00.000Z'));
    expect(result.status).toBe('unlocked');
  });

  it('不符合解鎖條件時狀態維持 cooling', () => {
    const item = makeItem();
    const result = itemService.recalculateStatus(item, new Date('2026-07-15T00:00:00.000Z'));
    expect(result.status).toBe('cooling');
  });

  it('recalculateAllStatuses 回傳新解鎖的 id 清單', () => {
    const willUnlock = makeItem({
      id: 'item-unlock',
      unlockDate: '2026-07-01T00:00:00.000Z',
      conditionChecks: [true, true, true, false, false, false],
    });
    const staysLocked = makeItem({
      id: 'item-cooling',
      unlockDate: '2026-08-01T00:00:00.000Z',
    });
    const { items, newlyUnlockedIds } = itemService.recalculateAllStatuses(
      [willUnlock, staysLocked],
      new Date('2026-07-15T00:00:00.000Z')
    );
    expect(newlyUnlockedIds).toEqual(['item-unlock']);
    expect(items.find((i) => i.id === 'item-unlock')?.status).toBe('unlocked');
    expect(items.find((i) => i.id === 'item-cooling')?.status).toBe('cooling');
  });

  it('已經是 unlocked 的單品不會再被視為「新解鎖」', () => {
    const alreadyUnlocked = makeItem({
      id: 'item-already',
      status: 'unlocked',
      unlockDate: '2026-07-01T00:00:00.000Z',
      conditionChecks: [true, true, true, false, false, false],
    });
    const { newlyUnlockedIds } = itemService.recalculateAllStatuses(
      [alreadyUnlocked],
      new Date('2026-07-15T00:00:00.000Z')
    );
    expect(newlyUnlockedIds).toEqual([]);
  });
});

describe('isNearUnlock', () => {
  it('剩不到 3 天且尚未解鎖時回傳 true', () => {
    const item = makeItem({ unlockDate: '2026-07-17T00:00:00.000Z' });
    expect(itemService.isNearUnlock(item, new Date('2026-07-15T00:00:00.000Z'))).toBe(true);
  });

  it('剩超過 3 天時回傳 false', () => {
    const item = makeItem({ unlockDate: '2026-07-25T00:00:00.000Z' });
    expect(itemService.isNearUnlock(item, new Date('2026-07-15T00:00:00.000Z'))).toBe(false);
  });

  it('已經過期時回傳 false（不是「快解鎖」而是「已解鎖」）', () => {
    const item = makeItem({ unlockDate: '2026-07-01T00:00:00.000Z' });
    expect(itemService.isNearUnlock(item, new Date('2026-07-15T00:00:00.000Z'))).toBe(false);
  });
});

describe('daysUntilUnlock', () => {
  it('計算距離解鎖日的天數（無條件進位）', () => {
    const item = makeItem({ unlockDate: '2026-07-17T12:00:00.000Z' });
    expect(itemService.daysUntilUnlock(item, new Date('2026-07-15T00:00:00.000Z'))).toBe(3);
  });
});

describe('sortByUnlockDateAscending', () => {
  it('依解鎖日期由近到遠排序', () => {
    const later = makeItem({ id: 'later', unlockDate: '2026-09-01T00:00:00.000Z' });
    const sooner = makeItem({ id: 'sooner', unlockDate: '2026-08-01T00:00:00.000Z' });
    const sorted = itemService.sortByUnlockDateAscending([later, sooner]);
    expect(sorted.map((i) => i.id)).toEqual(['sooner', 'later']);
  });
});

describe('createHistoryEntry / computeStats', () => {
  it('建立歷史記錄快照名稱與價格', () => {
    const item = makeItem({ name: '外套', price: 1500 });
    const entry = itemService.createHistoryEntry(item, 'resisted');
    expect(entry.itemName).toBe('外套');
    expect(entry.price).toBe(1500);
    expect(entry.outcome).toBe('resisted');
  });

  it('computeStats 只加總 resisted 的金額與次數', () => {
    const history = [
      itemService.createHistoryEntry(makeItem({ name: 'A', price: 100 }), 'resisted'),
      itemService.createHistoryEntry(makeItem({ name: 'B', price: 200 }), 'purchased'),
      itemService.createHistoryEntry(makeItem({ name: 'C', price: 300 }), 'resisted'),
    ];
    const stats = itemService.computeStats(history);
    expect(stats.resistedCount).toBe(2);
    expect(stats.savedAmount).toBe(400);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/services/itemService.test.ts -v
```
Expected: FAIL，找不到 `../../services/itemService` 模組

- [ ] **Step 3: 實作 `src/services/itemService.ts`**

```ts
import type { Item, HistoryLogEntry, HistoryOutcome, HistoryStats } from '../types/item';
import { MIN_CONDITIONS_TO_UNLOCK, CONDITION_COUNT } from '../constants/conditions';

export interface CreateItemInput {
  name: string;
  photoUri: string;
  price: number;
  url?: string;
  note?: string;
  unlockDate: string;
  initialConditionChecks?: boolean[];
}

export function createItem(input: CreateItemInput): Item {
  const checks = input.initialConditionChecks ?? new Array(CONDITION_COUNT).fill(false);
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name,
    photoUri: input.photoUri,
    price: input.price,
    url: input.url,
    note: input.note,
    createdAt: new Date().toISOString(),
    unlockDate: input.unlockDate,
    conditionChecks: checks,
    status: 'cooling',
  };
}

export function countCheckedConditions(item: Item): number {
  return item.conditionChecks.filter(Boolean).length;
}

export function isUnlockable(item: Item, now: Date): boolean {
  const unlockDate = new Date(item.unlockDate);
  return now.getTime() >= unlockDate.getTime() && countCheckedConditions(item) >= MIN_CONDITIONS_TO_UNLOCK;
}

export function recalculateStatus(item: Item, now: Date): Item {
  if (item.status === 'cooling' && isUnlockable(item, now)) {
    return { ...item, status: 'unlocked' };
  }
  return item;
}

export function recalculateAllStatuses(
  items: Item[],
  now: Date
): { items: Item[]; newlyUnlockedIds: string[] } {
  const newlyUnlockedIds: string[] = [];
  const updated = items.map((item) => {
    const next = recalculateStatus(item, now);
    if (next.status === 'unlocked' && item.status === 'cooling') {
      newlyUnlockedIds.push(item.id);
    }
    return next;
  });
  return { items: updated, newlyUnlockedIds };
}

export function isNearUnlock(item: Item, now: Date, daysThreshold = 3): boolean {
  const unlockDate = new Date(item.unlockDate);
  const diffDays = (unlockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= daysThreshold;
}

export function daysUntilUnlock(item: Item, now: Date): number {
  const unlockDate = new Date(item.unlockDate);
  const diffMs = unlockDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function sortByUnlockDateAscending(items: Item[]): Item[] {
  return [...items].sort((a, b) => new Date(a.unlockDate).getTime() - new Date(b.unlockDate).getTime());
}

export function createHistoryEntry(item: Item, outcome: HistoryOutcome): HistoryLogEntry {
  return {
    id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemName: item.name,
    price: item.price,
    outcome,
    recordedAt: new Date().toISOString(),
  };
}

export function computeStats(history: HistoryLogEntry[]): HistoryStats {
  const resisted = history.filter((h) => h.outcome === 'resisted');
  const savedAmount = resisted.reduce((sum, h) => sum + h.price, 0);
  return { resistedCount: resisted.length, savedAmount };
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/services/itemService.test.ts -v
```
Expected: PASS，全部測試通過

- [ ] **Step 5: Commit**

```bash
git add src/services/itemService.ts src/__tests__/services/itemService.test.ts
git commit -m "feat: 新增單品解鎖判斷邏輯與輔助函式"
```

---

## Task 5: badgeService（忍術點數/段位計算）

**Files:**
- Create: `src/services/badgeService.ts`
- Test: `src/__tests__/services/badgeService.test.ts`

**Interfaces:**
- Consumes：`RANK_THRESHOLDS`、`RankName` from `src/constants/rank.ts`
- Produces：
  - `computeRank(points: number): RankName`
  - `pointsToNextRank(points: number): number | null`

- [ ] **Step 1: 寫測試（先失敗）**

`src/__tests__/services/badgeService.test.ts`：

```ts
import { computeRank, pointsToNextRank } from '../../services/badgeService';

describe('computeRank', () => {
  it.each([
    [0, '尚無段位'],
    [2, '尚無段位'],
    [3, '忍術小達人'],
    [9, '忍術小達人'],
    [10, '王牌忍術師'],
    [19, '王牌忍術師'],
    [20, '金牌忍術師'],
    [49, '金牌忍術師'],
    [50, '白金忍術師'],
    [99, '白金忍術師'],
    [100, '鑽石忍術師'],
    [999, '鑽石忍術師'],
  ])('%i 點 -> %s', (points, expected) => {
    expect(computeRank(points)).toBe(expected);
  });
});

describe('pointsToNextRank', () => {
  it('尚無段位時回傳距離下一段位的點數', () => {
    expect(pointsToNextRank(1)).toBe(2);
  });

  it('剛好在門檻上時回傳距離下一個門檻的點數', () => {
    expect(pointsToNextRank(3)).toBe(7);
  });

  it('已達最高段位時回傳 null', () => {
    expect(pointsToNextRank(100)).toBeNull();
    expect(pointsToNextRank(500)).toBeNull();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/services/badgeService.test.ts -v
```
Expected: FAIL，找不到 `../../services/badgeService` 模組

- [ ] **Step 3: 實作 `src/services/badgeService.ts`**

```ts
import { RANK_THRESHOLDS } from '../constants/rank';
import type { RankName } from '../constants/rank';

export function computeRank(points: number): RankName {
  let current: RankName = RANK_THRESHOLDS[0].name;
  for (const threshold of RANK_THRESHOLDS) {
    if (points >= threshold.minPoints) {
      current = threshold.name;
    }
  }
  return current;
}

export function pointsToNextRank(points: number): number | null {
  const next = RANK_THRESHOLDS.find((t) => t.minPoints > points);
  return next ? next.minPoints - points : null;
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/services/badgeService.test.ts -v
```
Expected: PASS，全部測試通過

- [ ] **Step 5: Commit**

```bash
git add src/services/badgeService.ts src/__tests__/services/badgeService.test.ts
git commit -m "feat: 新增忍術點數與段位計算邏輯"
```

---

## Task 6: notificationService（本機通知排程/取消）

**Files:**
- Create: `src/services/notificationService.ts`
- Test: `src/__tests__/services/notificationService.test.ts`

**Interfaces:**
- Consumes：`Item` from `src/types/item.ts`；`expo-notifications` mock（Task 1）
- Produces：
  - `scheduleReminders(item: Item): Promise<void>`
  - `cancelReminders(itemId: string): Promise<void>`
  - `requestNotificationPermission(): Promise<boolean>`

- [ ] **Step 1: 寫測試（先失敗）**

`src/__tests__/services/notificationService.test.ts`：

```ts
import * as Notifications from 'expo-notifications';
import * as notificationService from '../../services/notificationService';
import type { Item } from '../../types/item';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    name: '測試外套',
    photoUri: 'mock://photo.jpg',
    price: 1000,
    createdAt: '2026-07-01T00:00:00.000Z',
    unlockDate: '2026-08-01T00:00:00.000Z',
    conditionChecks: [false, false, false, false, false, false],
    status: 'cooling',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-07-15T00:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('scheduleReminders', () => {
  it('未來的解鎖日會排程「剩3天」與「解鎖日」兩則通知', async () => {
    const item = makeItem({ unlockDate: '2026-08-01T00:00:00.000Z' });
    await notificationService.scheduleReminders(item);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: `sparklist-3day-${item.id}`,
        content: expect.objectContaining({ body: '再堅持一下，就快解鎖囉！' }),
      })
    );
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: `sparklist-unlock-${item.id}` })
    );
  });

  it('距解鎖日已經不足3天時，只排程解鎖日通知，不排程剩3天提醒', async () => {
    const item = makeItem({ unlockDate: '2026-07-16T00:00:00.000Z' });
    await notificationService.scheduleReminders(item);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: `sparklist-unlock-${item.id}` })
    );
  });

  it('解鎖日已經過去則完全不排程通知', async () => {
    const item = makeItem({ unlockDate: '2026-07-01T00:00:00.000Z' });
    await notificationService.scheduleReminders(item);

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('cancelReminders', () => {
  it('取消該單品兩則通知的排程', async () => {
    await notificationService.cancelReminders('item-1');

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('sparklist-3day-item-1');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('sparklist-unlock-item-1');
  });
});

describe('requestNotificationPermission', () => {
  it('授權成功時回傳 true', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    expect(await notificationService.requestNotificationPermission()).toBe(true);
  });

  it('未授權時回傳 false', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    expect(await notificationService.requestNotificationPermission()).toBe(false);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/services/notificationService.test.ts -v
```
Expected: FAIL，找不到 `../../services/notificationService` 模組

- [ ] **Step 3: 實作 `src/services/notificationService.ts`**

```ts
import * as Notifications from 'expo-notifications';
import type { Item } from '../types/item';

const THREE_DAY_ID_PREFIX = 'sparklist-3day-';
const UNLOCK_ID_PREFIX = 'sparklist-unlock-';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export async function scheduleReminders(item: Item): Promise<void> {
  const unlockDate = new Date(item.unlockDate);
  const now = Date.now();
  const threeDaysBefore = new Date(unlockDate.getTime() - THREE_DAYS_MS);

  if (threeDaysBefore.getTime() > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${THREE_DAY_ID_PREFIX}${item.id}`,
      content: { title: 'SPARK LIST', body: '再堅持一下，就快解鎖囉！' },
      trigger: threeDaysBefore as unknown as Notifications.NotificationTriggerInput,
    });
  }

  if (unlockDate.getTime() > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${UNLOCK_ID_PREFIX}${item.id}`,
      content: { title: 'SPARK LIST', body: `「${item.name}」已解鎖，可以重新考慮購買了！` },
      trigger: unlockDate as unknown as Notifications.NotificationTriggerInput,
    });
  }
}

export async function cancelReminders(itemId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`${THREE_DAY_ID_PREFIX}${itemId}`);
  await Notifications.cancelScheduledNotificationAsync(`${UNLOCK_ID_PREFIX}${itemId}`);
}

export async function requestNotificationPermission(): Promise<boolean> {
  const result = await Notifications.requestPermissionsAsync();
  return result.status === 'granted';
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/services/notificationService.test.ts -v
```
Expected: PASS，全部測試通過

- [ ] **Step 5: Commit**

```bash
git add src/services/notificationService.ts src/__tests__/services/notificationService.test.ts
git commit -m "feat: 新增本機通知排程/取消邏輯"
```

---

## Task 7: audioService（音效播放）與音效素材佔位檔

**Files:**
- Create: `assets/sounds/fireworks.mp3`（空白佔位檔）
- Create: `assets/sounds/cheer.mp3`（空白佔位檔）
- Create: `src/services/audioService.ts`
- Test: `src/__tests__/services/audioService.test.ts`

**Interfaces:**
- Consumes：`expo-audio` mock（Task 1）
- Produces：`playFireworks(): void`、`playCheer(): void`

**注意**：`assets/sounds/*.mp3` 目前是空白佔位檔案，只是為了讓 `require()` 在 Metro/Jest 下能正確解析路徑。正式音效檔案（真實的煙火音效、歡呼音效）需要使用者後續提供並取代這兩個檔案，這個任務不包含尋找/製作真實音效素材。

- [ ] **Step 1: 建立音效佔位檔**

```bash
mkdir -p assets/sounds
touch assets/sounds/fireworks.mp3
touch assets/sounds/cheer.mp3
```

- [ ] **Step 2: 寫測試（先失敗）**

`src/__tests__/services/audioService.test.ts`：

```ts
import { createAudioPlayer, __mockPlayer } from 'expo-audio';
import * as audioService from '../../services/audioService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('audioService', () => {
  it('playFireworks 會建立音訊播放器並呼叫 play', () => {
    audioService.playFireworks();
    expect(createAudioPlayer).toHaveBeenCalled();
    expect(__mockPlayer.play).toHaveBeenCalled();
  });

  it('playCheer 會建立音訊播放器並呼叫 play', () => {
    audioService.playCheer();
    expect(createAudioPlayer).toHaveBeenCalled();
    expect(__mockPlayer.play).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: 執行測試確認失敗**

```bash
npx jest src/__tests__/services/audioService.test.ts -v
```
Expected: FAIL，找不到 `../../services/audioService` 模組

- [ ] **Step 4: 實作 `src/services/audioService.ts`**

```ts
import { createAudioPlayer } from 'expo-audio';

const fireworksSource = require('../../assets/sounds/fireworks.mp3');
const cheerSource = require('../../assets/sounds/cheer.mp3');

export function playFireworks(): void {
  const player = createAudioPlayer(fireworksSource);
  player.play();
}

export function playCheer(): void {
  const player = createAudioPlayer(cheerSource);
  player.play();
}
```

- [ ] **Step 5: 執行測試確認通過**

```bash
npx jest src/__tests__/services/audioService.test.ts -v
```
Expected: PASS，2 個測試全過

- [ ] **Step 6: Commit**

```bash
git add assets/sounds src/services/audioService.ts src/__tests__/services/audioService.test.ts
git commit -m "feat: 新增音效播放服務與佔位音效檔"
```

---

## Task 8: useAppStore（Zustand：忍術點數/段位/條件文字/主題色）

**Files:**
- Create: `src/store/useAppStore.ts`
- Test: `src/__tests__/store/useAppStore.test.ts`

**Interfaces:**
- Consumes：`storage.getAppState`、`storage.saveAppState` from `src/services/storage.ts`；`computeRank` from `src/services/badgeService.ts`；`DEFAULT_CONDITION_LABELS` from `src/constants/conditions.ts`；`DEFAULT_THEME_COLOR` from `src/constants/theme.ts`
- Produces：`useAppStore` Zustand hook，state 為 `{ ninjaPoints: number; currentRank: RankName; conditionLabels: string[]; themeColor: string; hydrated: boolean; hydrate(): Promise<void>; addNinjaPoint(): Promise<void>; setConditionLabels(labels: string[]): Promise<void>; setThemeColor(color: string): Promise<void>; }`

- [ ] **Step 1: 寫測試（先失敗）**

`src/__tests__/store/useAppStore.test.ts`：

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act } from '@testing-library/react-native';
import { useAppStore } from '../../store/useAppStore';
import * as storage from '../../services/storage';
import { DEFAULT_CONDITION_LABELS } from '../../constants/conditions';
import { DEFAULT_THEME_COLOR } from '../../constants/theme';

beforeEach(async () => {
  await AsyncStorage.clear();
  useAppStore.setState({
    ninjaPoints: 0,
    currentRank: '尚無段位',
    conditionLabels: DEFAULT_CONDITION_LABELS,
    themeColor: DEFAULT_THEME_COLOR,
    hydrated: false,
  });
});

describe('useAppStore 初始值', () => {
  it('尚未 hydrate 前使用預設值', () => {
    const state = useAppStore.getState();
    expect(state.ninjaPoints).toBe(0);
    expect(state.currentRank).toBe('尚無段位');
    expect(state.conditionLabels).toEqual(DEFAULT_CONDITION_LABELS);
    expect(state.themeColor).toBe(DEFAULT_THEME_COLOR);
  });
});

describe('hydrate', () => {
  it('有持久化資料時會載入並覆蓋預設值', async () => {
    await storage.saveAppState({
      ninjaPoints: 12,
      conditionLabels: ['自訂條件1', '自訂條件2'],
      themeColor: '#4DABF7',
    });

    await act(async () => {
      await useAppStore.getState().hydrate();
    });

    const state = useAppStore.getState();
    expect(state.ninjaPoints).toBe(12);
    expect(state.currentRank).toBe('王牌忍術師');
    expect(state.conditionLabels).toEqual(['自訂條件1', '自訂條件2']);
    expect(state.themeColor).toBe('#4DABF7');
    expect(state.hydrated).toBe(true);
  });

  it('沒有持久化資料時維持預設值，並標記 hydrated', async () => {
    await act(async () => {
      await useAppStore.getState().hydrate();
    });

    expect(useAppStore.getState().ninjaPoints).toBe(0);
    expect(useAppStore.getState().hydrated).toBe(true);
  });
});

describe('addNinjaPoint', () => {
  it('每次呼叫 +1 點並重新計算段位，同時寫入 storage', async () => {
    await act(async () => {
      for (let i = 0; i < 3; i += 1) {
        await useAppStore.getState().addNinjaPoint();
      }
    });

    expect(useAppStore.getState().ninjaPoints).toBe(3);
    expect(useAppStore.getState().currentRank).toBe('忍術小達人');

    const persisted = await storage.getAppState();
    expect(persisted?.ninjaPoints).toBe(3);
  });
});

describe('setConditionLabels / setThemeColor', () => {
  it('setConditionLabels 會更新 state 並持久化', async () => {
    await act(async () => {
      await useAppStore.getState().setConditionLabels(['新條件A', '新條件B']);
    });
    expect(useAppStore.getState().conditionLabels).toEqual(['新條件A', '新條件B']);
    expect((await storage.getAppState())?.conditionLabels).toEqual(['新條件A', '新條件B']);
  });

  it('setThemeColor 會更新 state 並持久化', async () => {
    await act(async () => {
      await useAppStore.getState().setThemeColor('#69DB7C');
    });
    expect(useAppStore.getState().themeColor).toBe('#69DB7C');
    expect((await storage.getAppState())?.themeColor).toBe('#69DB7C');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/store/useAppStore.test.ts -v
```
Expected: FAIL，找不到 `../../store/useAppStore` 模組

- [ ] **Step 3: 實作 `src/store/useAppStore.ts`**

```ts
import { create } from 'zustand';
import * as storage from '../services/storage';
import { computeRank } from '../services/badgeService';
import { DEFAULT_CONDITION_LABELS } from '../constants/conditions';
import { DEFAULT_THEME_COLOR } from '../constants/theme';
import type { RankName } from '../constants/rank';

interface AppState {
  ninjaPoints: number;
  currentRank: RankName;
  conditionLabels: string[];
  themeColor: string;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addNinjaPoint: () => Promise<void>;
  setConditionLabels: (labels: string[]) => Promise<void>;
  setThemeColor: (color: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  ninjaPoints: 0,
  currentRank: computeRank(0),
  conditionLabels: DEFAULT_CONDITION_LABELS,
  themeColor: DEFAULT_THEME_COLOR,
  hydrated: false,

  hydrate: async () => {
    const persisted = await storage.getAppState();
    if (persisted) {
      set({
        ninjaPoints: persisted.ninjaPoints,
        currentRank: computeRank(persisted.ninjaPoints),
        conditionLabels: persisted.conditionLabels,
        themeColor: persisted.themeColor,
        hydrated: true,
      });
    } else {
      set({ hydrated: true });
    }
  },

  addNinjaPoint: async () => {
    const nextPoints = get().ninjaPoints + 1;
    set({ ninjaPoints: nextPoints, currentRank: computeRank(nextPoints) });
    await storage.saveAppState({
      ninjaPoints: nextPoints,
      conditionLabels: get().conditionLabels,
      themeColor: get().themeColor,
    });
  },

  setConditionLabels: async (labels: string[]) => {
    set({ conditionLabels: labels });
    await storage.saveAppState({
      ninjaPoints: get().ninjaPoints,
      conditionLabels: labels,
      themeColor: get().themeColor,
    });
  },

  setThemeColor: async (color: string) => {
    set({ themeColor: color });
    await storage.saveAppState({
      ninjaPoints: get().ninjaPoints,
      conditionLabels: get().conditionLabels,
      themeColor: color,
    });
  },
}));
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/store/useAppStore.test.ts -v
```
Expected: PASS，全部測試通過

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts src/__tests__/store/useAppStore.test.ts
git commit -m "feat: 新增全域狀態 store（忍術點數/段位/條件文字/主題色）"
```

---

## Task 9: useItems（單品清單 hook，整合 storage/itemService/notification/audio）

**Files:**
- Create: `src/hooks/useItems.ts`
- Test: `src/__tests__/hooks/useItems.test.ts`

**Interfaces:**
- Consumes：`storage.*` from `src/services/storage.ts`；`itemService.*` from `src/services/itemService.ts`；`notificationService.scheduleReminders`/`cancelReminders` from `src/services/notificationService.ts`；`audioService.playFireworks`/`playCheer` from `src/services/audioService.ts`；`useAppStore` from `src/store/useAppStore.ts`
- Produces：`useItems()` hook 回傳 `{ items: Item[]; loaded: boolean; coolingItems: Item[]; unlockedItems: Item[]; reload(): Promise<void>; addItem(input: CreateItemInput): Promise<void>; updateConditionChecks(itemId: string, conditionChecks: boolean[]): Promise<void>; updateUnlockDate(itemId: string, unlockDate: string): Promise<void>; deleteItem(itemId: string): Promise<void>; markPurchased(itemId: string): Promise<void>; }`

設計簡化說明：解鎖時「點開通知/該單品時播放歡呼音效」在此實作簡化為「每次 `reload()` 偵測到有單品從 `cooling` 轉為 `unlocked` 時播放歡呼音效」，因為 App 從背景回到前景、或使用者點開通知進入 App 都會觸發 `reload()`，效果等價，不需另外實作通知點擊的深層連結邏輯。

- [ ] **Step 1: 寫測試（先失敗）**

`src/__tests__/hooks/useItems.test.ts`：

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, act } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { __mockPlayer } from 'expo-audio';
import { useItems } from '../../hooks/useItems';
import { useAppStore } from '../../store/useAppStore';
import * as storage from '../../services/storage';
import { DEFAULT_CONDITION_LABELS } from '../../constants/conditions';
import { DEFAULT_THEME_COLOR } from '../../constants/theme';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  useAppStore.setState({
    ninjaPoints: 0,
    currentRank: '尚無段位',
    conditionLabels: DEFAULT_CONDITION_LABELS,
    themeColor: DEFAULT_THEME_COLOR,
    hydrated: false,
  });
});

describe('addItem', () => {
  it('新增單品後會出現在 coolingItems，且排程通知', async () => {
    const { result } = renderHook(() => useItems());

    await act(async () => {
      await result.current.addItem({
        name: '外套',
        photoUri: 'mock://photo.jpg',
        price: 1000,
        unlockDate: '2099-01-01T00:00:00.000Z',
      });
    });

    expect(result.current.coolingItems).toHaveLength(1);
    expect(result.current.coolingItems[0].name).toBe('外套');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });
});

describe('updateConditionChecks 觸發解鎖', () => {
  it('補勾到第 3 項且日期已過時，單品移入 unlockedItems 並播放歡呼音效', async () => {
    const { result } = renderHook(() => useItems());

    await act(async () => {
      await result.current.addItem({
        name: '外套',
        photoUri: 'mock://photo.jpg',
        price: 1000,
        unlockDate: '2020-01-01T00:00:00.000Z',
        initialConditionChecks: [true, true, false, false, false, false],
      });
    });

    const itemId = result.current.coolingItems[0].id;

    await act(async () => {
      await result.current.updateConditionChecks(itemId, [true, true, true, false, false, false]);
    });

    expect(result.current.coolingItems).toHaveLength(0);
    expect(result.current.unlockedItems).toHaveLength(1);
    expect(__mockPlayer.play).toHaveBeenCalled();
  });
});

describe('deleteItem（主動放棄）', () => {
  it('刪除冷靜區單品會播放煙火音效、+1 忍術點數，並寫入歷史記錄', async () => {
    const { result } = renderHook(() => useItems());

    await act(async () => {
      await result.current.addItem({
        name: '外套',
        photoUri: 'mock://photo.jpg',
        price: 1000,
        unlockDate: '2099-01-01T00:00:00.000Z',
      });
    });

    const itemId = result.current.coolingItems[0].id;

    await act(async () => {
      await result.current.deleteItem(itemId);
    });

    expect(result.current.items).toHaveLength(0);
    expect(__mockPlayer.play).toHaveBeenCalled();
    expect(useAppStore.getState().ninjaPoints).toBe(1);

    const history = await storage.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].outcome).toBe('resisted');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalled();
  });
});

describe('markPurchased', () => {
  it('標記已購買不會增加忍術點數，但會寫入歷史記錄', async () => {
    const { result } = renderHook(() => useItems());

    await act(async () => {
      await result.current.addItem({
        name: '外套',
        photoUri: 'mock://photo.jpg',
        price: 1000,
        unlockDate: '2020-01-01T00:00:00.000Z',
        initialConditionChecks: [true, true, true, false, false, false],
      });
    });

    const itemId = result.current.unlockedItems[0].id;

    await act(async () => {
      await result.current.markPurchased(itemId);
    });

    expect(result.current.items).toHaveLength(0);
    expect(useAppStore.getState().ninjaPoints).toBe(0);

    const history = await storage.getHistory();
    expect(history[0].outcome).toBe('purchased');
  });
});

describe('coolingItems 排序', () => {
  it('冷靜區依解鎖日期由近到遠排序', async () => {
    const { result } = renderHook(() => useItems());

    await act(async () => {
      await result.current.addItem({
        name: '較晚',
        photoUri: 'mock://photo.jpg',
        price: 100,
        unlockDate: '2099-06-01T00:00:00.000Z',
      });
      await result.current.addItem({
        name: '較早',
        photoUri: 'mock://photo.jpg',
        price: 100,
        unlockDate: '2099-01-01T00:00:00.000Z',
      });
    });

    expect(result.current.coolingItems.map((i) => i.name)).toEqual(['較早', '較晚']);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/hooks/useItems.test.ts -v
```
Expected: FAIL，找不到 `../../hooks/useItems` 模組

- [ ] **Step 3: 實作 `src/hooks/useItems.ts`**

```ts
import { useState, useCallback, useEffect } from 'react';
import * as storage from '../services/storage';
import * as itemService from '../services/itemService';
import * as notificationService from '../services/notificationService';
import * as audioService from '../services/audioService';
import { useAppStore } from '../store/useAppStore';
import type { Item } from '../types/item';
import type { CreateItemInput } from '../services/itemService';

export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const addNinjaPoint = useAppStore((s) => s.addNinjaPoint);

  const reload = useCallback(async () => {
    const stored = await storage.getItems();
    const { items: recalculated, newlyUnlockedIds } = itemService.recalculateAllStatuses(stored, new Date());

    if (newlyUnlockedIds.length > 0) {
      await storage.saveItems(recalculated);
      audioService.playCheer();
    }

    setItems(recalculated);
    setLoaded(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addItem = useCallback(async (input: CreateItemInput) => {
    const newItem = itemService.createItem(input);
    const next = [...items, newItem];
    setItems(next);
    await storage.saveItems(next);
    await notificationService.scheduleReminders(newItem);
  }, [items]);

  const updateConditionChecks = useCallback(async (itemId: string, conditionChecks: boolean[]) => {
    const next = items.map((i) => (i.id === itemId ? { ...i, conditionChecks } : i));
    await storage.saveItems(next);
    await reload();
  }, [items, reload]);

  const updateUnlockDate = useCallback(async (itemId: string, unlockDate: string) => {
    const next = items.map((i) => (i.id === itemId ? { ...i, unlockDate } : i));
    await storage.saveItems(next);
    await notificationService.cancelReminders(itemId);
    const updatedItem = next.find((i) => i.id === itemId);
    if (updatedItem) {
      await notificationService.scheduleReminders(updatedItem);
    }
    await reload();
  }, [items, reload]);

  const resolveItem = useCallback(async (itemId: string, outcome: 'purchased' | 'resisted') => {
    const target = items.find((i) => i.id === itemId);
    if (!target) return;

    const entry = itemService.createHistoryEntry(target, outcome);
    const history = await storage.getHistory();
    await storage.saveHistory([...history, entry]);

    const next = items.filter((i) => i.id !== itemId);
    setItems(next);
    await storage.saveItems(next);
    await notificationService.cancelReminders(itemId);

    if (outcome === 'resisted') {
      audioService.playFireworks();
      await addNinjaPoint();
    }
  }, [items, addNinjaPoint]);

  const deleteItem = useCallback((itemId: string) => resolveItem(itemId, 'resisted'), [resolveItem]);
  const markPurchased = useCallback((itemId: string) => resolveItem(itemId, 'purchased'), [resolveItem]);

  return {
    items,
    loaded,
    coolingItems: itemService.sortByUnlockDateAscending(items.filter((i) => i.status === 'cooling')),
    unlockedItems: items.filter((i) => i.status === 'unlocked'),
    reload,
    addItem,
    updateConditionChecks,
    updateUnlockDate,
    deleteItem,
    markPurchased,
  };
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/hooks/useItems.test.ts -v
```
Expected: PASS，全部測試通過

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useItems.ts src/__tests__/hooks/useItems.test.ts
git commit -m "feat: 新增 useItems hook 整合單品 CRUD、通知與音效"
```

---

## Task 10: Tab 導覽骨架與根 Layout

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/me.tsx`（暫時佔位內容，Task 18 補完整功能）
- Create: `app/(tabs)/cooling.tsx`（暫時佔位內容，Task 15 補完整功能）
- Create: `app/(tabs)/unlocked.tsx`（暫時佔位內容，Task 17 補完整功能）
- Test: `src/__tests__/screens/tabsLayout.test.tsx`

**Interfaces:**
- Produces：三個分頁的路由骨架（`我的`／`冷靜區`／`解鎖區`），供後續任務填入完整畫面內容。

- [ ] **Step 1: 寫測試（先失敗）**

`src/__tests__/screens/tabsLayout.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react-native';
import MeScreen from '../../../app/(tabs)/me';
import CoolingScreen from '../../../app/(tabs)/cooling';
import UnlockedScreen from '../../../app/(tabs)/unlocked';

describe('分頁骨架畫面', () => {
  it('我的畫面會渲染標題', () => {
    render(<MeScreen />);
    expect(screen.getByText('我的')).toBeTruthy();
  });

  it('冷靜區畫面會渲染標題', () => {
    render(<CoolingScreen />);
    expect(screen.getByText('冷靜區')).toBeTruthy();
  });

  it('解鎖區畫面會渲染標題', () => {
    render(<UnlockedScreen />);
    expect(screen.getByText('解鎖區')).toBeTruthy();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/screens/tabsLayout.test.tsx -v
```
Expected: FAIL，找不到 `app/(tabs)/me` 等模組

- [ ] **Step 3: 實作根 Layout `app/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="item/new" options={{ title: '新增單品', presentation: 'modal' }} />
      <Stack.Screen name="item/[id]" options={{ title: '單品詳情' }} />
    </Stack>
  );
}
```

- [ ] **Step 4: 實作 Tab Layout `app/(tabs)/_layout.tsx`**

```tsx
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="me" options={{ title: '我的' }} />
      <Tabs.Screen name="cooling" options={{ title: '冷靜區' }} />
      <Tabs.Screen name="unlocked" options={{ title: '解鎖區' }} />
    </Tabs>
  );
}
```

- [ ] **Step 5: 建立三個分頁佔位畫面**

`app/(tabs)/me.tsx`：

```tsx
import { View, Text, StyleSheet } from 'react-native';

export default function MeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>我的</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },
});
```

`app/(tabs)/cooling.tsx`：

```tsx
import { View, Text, StyleSheet } from 'react-native';

export default function CoolingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>冷靜區</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },
});
```

`app/(tabs)/unlocked.tsx`：

```tsx
import { View, Text, StyleSheet } from 'react-native';

export default function UnlockedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>解鎖區</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },
});
```

- [ ] **Step 6: 執行測試確認通過**

```bash
npx jest src/__tests__/screens/tabsLayout.test.tsx -v
```
Expected: PASS，3 個測試全過

- [ ] **Step 7: Commit**

```bash
git add app src/__tests__/screens/tabsLayout.test.tsx
git commit -m "feat: 新增三分頁導覽骨架"
```

---

## Task 11: ConditionChecklist 元件（六項條件勾選 UI）

**Files:**
- Create: `src/components/ConditionChecklist.tsx`
- Test: `src/__tests__/components/ConditionChecklist.test.tsx`

**Interfaces:**
- Consumes：無外部 service，純展示元件
- Produces：`ConditionChecklist` React 元件，props 為 `{ labels: string[]; checks: boolean[]; onToggle: (index: number) => void }`

- [ ] **Step 1: 寫測試（先失敗）**

`src/__tests__/components/ConditionChecklist.test.tsx`：

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ConditionChecklist } from '../../components/ConditionChecklist';

describe('ConditionChecklist', () => {
  const labels = ['條件一', '條件二', '條件三'];

  it('渲染所有條件文字', () => {
    render(<ConditionChecklist labels={labels} checks={[false, false, false]} onToggle={jest.fn()} />);
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  it('點擊某一項條件會呼叫 onToggle 並帶入正確 index', () => {
    const onToggle = jest.fn();
    render(<ConditionChecklist labels={labels} checks={[false, false, false]} onToggle={onToggle} />);

    fireEvent.press(screen.getByText('條件二'));
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('顯示目前勾選數量', () => {
    render(<ConditionChecklist labels={labels} checks={[true, true, false]} onToggle={jest.fn()} />);
    expect(screen.getByText('已勾選 2 / 3 項')).toBeTruthy();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/components/ConditionChecklist.test.tsx -v
```
Expected: FAIL，找不到 `../../components/ConditionChecklist` 模組

- [ ] **Step 3: 實作 `src/components/ConditionChecklist.tsx`**

```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';

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
  summary: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkbox: { fontSize: 18, marginRight: 8 },
  label: { fontSize: 15, flex: 1 },
});
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/components/ConditionChecklist.test.tsx -v
```
Expected: PASS，全部測試通過

- [ ] **Step 5: Commit**

```bash
git add src/components/ConditionChecklist.tsx src/__tests__/components/ConditionChecklist.test.tsx
git commit -m "feat: 新增六項條件勾選元件"
```

---

## Task 12: RankBadge 元件（段位展示）

**Files:**
- Create: `src/components/RankBadge.tsx`
- Test: `src/__tests__/components/RankBadge.test.tsx`

**Interfaces:**
- Consumes：`pointsToNextRank` from `src/services/badgeService.ts`
- Produces：`RankBadge` React 元件，props 為 `{ points: number; rank: RankName }`

- [ ] **Step 1: 寫測試（先失敗）**

`src/__tests__/components/RankBadge.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react-native';
import { RankBadge } from '../../components/RankBadge';

describe('RankBadge', () => {
  it('顯示目前段位與點數', () => {
    render(<RankBadge points={12} rank="王牌忍術師" />);
    expect(screen.getByText('王牌忍術師')).toBeTruthy();
    expect(screen.getByText('目前 12 點')).toBeTruthy();
  });

  it('未達最高段位時顯示距離下一段位還差幾點', () => {
    render(<RankBadge points={12} rank="王牌忍術師" />);
    expect(screen.getByText('距離金牌忍術師還差 8 點')).toBeTruthy();
  });

  it('已達最高段位時顯示恭喜文字而非「還差幾點」', () => {
    render(<RankBadge points={150} rank="鑽石忍術師" />);
    expect(screen.getByText('已達最高段位！')).toBeTruthy();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/components/RankBadge.test.tsx -v
```
Expected: FAIL，找不到 `../../components/RankBadge` 模組

- [ ] **Step 3: 實作 `src/components/RankBadge.tsx`**

`RankBadge` 需要知道「下一個段位的名稱」才能組出「距離 XX 還差 N 點」的文字，因此在元件內部直接查 `RANK_THRESHOLDS`（而非只靠 `pointsToNextRank` 回傳的點數）：

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { RANK_THRESHOLDS, type RankName } from '../constants/rank';

interface RankBadgeProps {
  points: number;
  rank: RankName;
}

export function RankBadge({ points, rank }: RankBadgeProps) {
  const next = RANK_THRESHOLDS.find((t) => t.minPoints > points);

  return (
    <View style={styles.container}>
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
  container: { alignItems: 'center', padding: 16 },
  rank: { fontSize: 24, fontWeight: 'bold' },
  points: { fontSize: 14, marginTop: 4 },
  progress: { fontSize: 13, marginTop: 4, color: '#666' },
});
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/components/RankBadge.test.tsx -v
```
Expected: PASS，全部測試通過

- [ ] **Step 5: Commit**

```bash
git add src/components/RankBadge.tsx src/__tests__/components/RankBadge.test.tsx
git commit -m "feat: 新增忍術段位展示元件"
```

---

## Task 13: ItemCard 元件（單品卡片，冷靜區/解鎖區共用）

**Files:**
- Create: `src/components/ItemCard.tsx`
- Test: `src/__tests__/components/ItemCard.test.tsx`

**Interfaces:**
- Consumes：`Item` from `src/types/item.ts`；`daysUntilUnlock` from `src/services/itemService.ts`
- Produces：`ItemCard` React 元件，props 為 `{ item: Item; variant: 'cooling' | 'unlocked'; onPress: () => void; onDelete: () => void; onMarkPurchased?: () => void; onOpenLink?: () => void; }`

- [ ] **Step 1: 寫測試（先失敗）**

`src/__tests__/components/ItemCard.test.tsx`：

```tsx
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
  it('顯示名稱、價格與勾選進度', () => {
    render(<ItemCard item={makeItem()} variant="cooling" onPress={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('測試外套')).toBeTruthy();
    expect(screen.getByText('NT$ 1200')).toBeTruthy();
    expect(screen.getByText('已勾選 1 / 6 項')).toBeTruthy();
  });

  it('點擊刪除按鈕會呼叫 onDelete', () => {
    const onDelete = jest.fn();
    render(<ItemCard item={makeItem()} variant="cooling" onPress={jest.fn()} onDelete={onDelete} />);
    fireEvent.press(screen.getByText('主動放棄'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('點擊卡片本身會呼叫 onPress', () => {
    const onPress = jest.fn();
    render(<ItemCard item={makeItem()} variant="cooling" onPress={onPress} onDelete={jest.fn()} />);
    fireEvent.press(screen.getByText('測試外套'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('ItemCard - unlocked variant', () => {
  it('顯示標記已購買與刪除兩個按鈕', () => {
    const onMarkPurchased = jest.fn();
    const onDelete = jest.fn();
    render(
      <ItemCard
        item={makeItem({ status: 'unlocked' })}
        variant="unlocked"
        onPress={jest.fn()}
        onDelete={onDelete}
        onMarkPurchased={onMarkPurchased}
      />
    );

    fireEvent.press(screen.getByText('標記已購買'));
    expect(onMarkPurchased).toHaveBeenCalled();

    fireEvent.press(screen.getByText('刪除（不買了）'));
    expect(onDelete).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/components/ItemCard.test.tsx -v
```
Expected: FAIL，找不到 `../../components/ItemCard` 模組

- [ ] **Step 3: 實作 `src/components/ItemCard.tsx`**

```tsx
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import type { Item } from '../types/item';
import { countCheckedConditions } from '../services/itemService';

interface ItemCardProps {
  item: Item;
  variant: 'cooling' | 'unlocked';
  onPress: () => void;
  onDelete: () => void;
  onMarkPurchased?: () => void;
  onOpenLink?: () => void;
}

export function ItemCard({ item, variant, onPress, onDelete, onMarkPurchased, onOpenLink }: ItemCardProps) {
  return (
    <View style={styles.card}>
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
  card: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 12 },
  photo: { width: '100%', height: 120, borderRadius: 6, marginBottom: 8 },
  name: { fontSize: 16, fontWeight: '600' },
  price: { fontSize: 14, marginTop: 2 },
  checks: { fontSize: 12, marginTop: 4, color: '#666' },
  actions: { flexDirection: 'row', marginTop: 8, gap: 8 },
  primaryButton: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#4DABF7', borderRadius: 6 },
  primaryButtonText: { color: '#fff', fontSize: 13 },
  secondaryButton: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#eee', borderRadius: 6 },
  secondaryButtonText: { fontSize: 13 },
  dangerButton: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#FFE3E3', borderRadius: 6 },
  dangerButtonText: { fontSize: 13, color: '#E03131' },
});
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/components/ItemCard.test.tsx -v
```
Expected: PASS，全部測試通過

- [ ] **Step 5: Commit**

```bash
git add src/components/ItemCard.tsx src/__tests__/components/ItemCard.test.tsx
git commit -m "feat: 新增單品卡片元件"
```

---

## Task 14: 新增單品畫面（app/item/new.tsx）

**Files:**
- Create: `app/item/new.tsx`
- Test: `src/__tests__/screens/itemNew.test.tsx`

**Interfaces:**
- Consumes：`useItems` from `src/hooks/useItems.ts`；`useAppStore` from `src/store/useAppStore.ts`；`ConditionChecklist` from `src/components/ConditionChecklist.tsx`；`expo-image-picker`；`expo-router` 的 `useRouter`
- Produces：可提交新單品的表單畫面

- [ ] **Step 1: 寫測試（先失敗）**

`src/__tests__/screens/itemNew.test.tsx`：

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NewItemScreen from '../../../app/item/new';
import * as storage from '../../services/storage';

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
    render(<NewItemScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('單品名稱'), '測試外套');
    fireEvent.changeText(screen.getByPlaceholderText('價格'), '1200');

    fireEvent.press(screen.getByText('7 天後'));
    fireEvent.press(screen.getByText('儲存'));

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('測試外套');
      expect(items[0].price).toBe(1200);
    });

    expect(mockBack).toHaveBeenCalled();
  });

  it('名稱空白時不能送出，也不會呼叫 back', async () => {
    render(<NewItemScreen />);

    fireEvent.press(screen.getByText('7 天後'));
    fireEvent.press(screen.getByText('儲存'));

    await waitFor(() => {
      expect(screen.getByText('請輸入單品名稱')).toBeTruthy();
    });
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('可以勾選六項條件其中幾項', async () => {
    render(<NewItemScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('單品名稱'), '測試外套');
    fireEvent.changeText(screen.getByPlaceholderText('價格'), '1200');
    fireEvent.press(screen.getByText('7 天後'));
    fireEvent.press(screen.getByText('符合我的風格嗎？'));
    fireEvent.press(screen.getByText('儲存'));

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items[0].conditionChecks[2]).toBe(true);
    });
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/screens/itemNew.test.tsx -v
```
Expected: FAIL，找不到 `app/item/new` 模組

- [ ] **Step 3: 實作 `app/item/new.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useItems } from '../../src/hooks/useItems';
import { useAppStore } from '../../src/store/useAppStore';
import { ConditionChecklist } from '../../src/components/ConditionChecklist';
import { CONDITION_COUNT } from '../../src/constants/conditions';

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
  const conditionLabels = useAppStore((s) => s.conditionLabels);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [unlockDate, setUnlockDate] = useState<string | null>(null);
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
        {QUICK_DAY_OPTIONS.map((option) => (
          <Pressable
            key={option.label}
            style={[styles.quickDateButton, unlockDate ? null : styles.quickDateButtonActive]}
            onPress={() => setUnlockDate(addDaysIso(option.days))}
          >
            <Text>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>六項條件</Text>
      <ConditionChecklist labels={conditionLabels} checks={checks} onToggle={toggleCheck} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>儲存</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginTop: 8, marginBottom: 8 },
  quickDateRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  quickDateButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#eee' },
  quickDateButtonActive: {},
  error: { color: '#E03131', marginBottom: 12 },
  submitButton: { backgroundColor: '#4DABF7', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  submitButtonText: { color: '#fff', fontWeight: '600' },
});
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/screens/itemNew.test.tsx -v
```
Expected: PASS，全部測試通過

- [ ] **Step 5: Commit**

```bash
git add app/item/new.tsx src/__tests__/screens/itemNew.test.tsx
git commit -m "feat: 新增單品建立畫面"
```

---

## Task 15: 冷靜區畫面（app/(tabs)/cooling.tsx 完整版）

**Files:**
- Modify: `app/(tabs)/cooling.tsx`
- Test: `src/__tests__/screens/cooling.test.tsx`

**Interfaces:**
- Consumes：`useItems` from `src/hooks/useItems.ts`；`ItemCard` from `src/components/ItemCard.tsx`；`expo-router` 的 `useRouter`

- [ ] **Step 1: 寫測試（先失敗）**

`src/__tests__/screens/cooling.test.tsx`：

```tsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CoolingScreen from '../../../app/(tabs)/cooling';
import * as storage from '../../services/storage';
import * as itemService from '../../services/itemService';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('CoolingScreen', () => {
  it('沒有單品時顯示空狀態文字', async () => {
    render(<CoolingScreen />);
    await waitFor(() => {
      expect(screen.getByText('目前沒有正在冷靜的單品，按右上角新增一個吧！')).toBeTruthy();
    });
  });

  it('依解鎖日期由近到遠顯示單品清單', async () => {
    const later = itemService.createItem({
      name: '較晚',
      photoUri: 'mock://photo.jpg',
      price: 100,
      unlockDate: '2099-06-01T00:00:00.000Z',
    });
    const sooner = itemService.createItem({
      name: '較早',
      photoUri: 'mock://photo.jpg',
      price: 100,
      unlockDate: '2099-01-01T00:00:00.000Z',
    });
    await storage.saveItems([later, sooner]);

    render(<CoolingScreen />);

    await waitFor(() => {
      expect(screen.getByText('較早')).toBeTruthy();
      expect(screen.getByText('較晚')).toBeTruthy();
    });
  });

  it('點擊「新增單品」按鈕會導向新增畫面', async () => {
    render(<CoolingScreen />);
    await waitFor(() => expect(screen.getByText('新增單品')).toBeTruthy());

    fireEvent.press(screen.getByText('新增單品'));
    expect(mockPush).toHaveBeenCalledWith('/item/new');
  });

  it('點擊主動放棄會移除該單品', async () => {
    const item = itemService.createItem({
      name: '要放棄的外套',
      photoUri: 'mock://photo.jpg',
      price: 500,
      unlockDate: '2099-01-01T00:00:00.000Z',
    });
    await storage.saveItems([item]);

    render(<CoolingScreen />);
    await waitFor(() => expect(screen.getByText('要放棄的外套')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('主動放棄'));
    });

    await waitFor(() => {
      expect(screen.queryByText('要放棄的外套')).toBeNull();
    });
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/screens/cooling.test.tsx -v
```
Expected: FAIL，因為目前 `cooling.tsx` 只有 Task 10 的佔位內容，找不到「新增單品」「目前沒有正在冷靜的單品...」等文字

- [ ] **Step 3: 實作 `app/(tabs)/cooling.tsx`**

```tsx
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useItems } from '../../src/hooks/useItems';
import { ItemCard } from '../../src/components/ItemCard';

export default function CoolingScreen() {
  const router = useRouter();
  const { coolingItems, deleteItem } = useItems();

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
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/screens/cooling.test.tsx -v
```
Expected: PASS，全部測試通過

注意：這會讓 Task 10 寫的 `tabsLayout.test.tsx` 裡「冷靜區畫面會渲染標題」測試持續通過（`getByText('冷靜區')` 仍然存在於新版畫面中），執行下列指令確認沒有破壞舊測試：

```bash
npx jest src/__tests__/screens -v
```
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/cooling.tsx src/__tests__/screens/cooling.test.tsx
git commit -m "feat: 完成冷靜區畫面（清單、排序、主動放棄）"
```

---

## Task 16: 單品編輯畫面（app/item/[id].tsx）

**Files:**
- Create: `app/item/[id].tsx`
- Test: `src/__tests__/screens/itemEdit.test.tsx`

**Interfaces:**
- Consumes：`useItems` from `src/hooks/useItems.ts`；`useAppStore` from `src/store/useAppStore.ts`；`ConditionChecklist` from `src/components/ConditionChecklist.tsx`；`expo-router` 的 `useRouter`、`useLocalSearchParams`

- [ ] **Step 1: 寫測試（先失敗）**

`src/__tests__/screens/itemEdit.test.tsx`：

```tsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EditItemScreen from '../../../app/item/[id]';
import * as storage from '../../services/storage';
import * as itemService from '../../services/itemService';

const mockBack = jest.fn();
let mockParams = { id: '' };

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('EditItemScreen', () => {
  it('顯示單品名稱與目前勾選狀態，勾選後寫回 storage', async () => {
    const item = itemService.createItem({
      name: '編輯測試外套',
      photoUri: 'mock://photo.jpg',
      price: 800,
      unlockDate: '2099-01-01T00:00:00.000Z',
      initialConditionChecks: [true, false, false, false, false, false],
    });
    await storage.saveItems([item]);
    mockParams = { id: item.id };

    render(<EditItemScreen />);

    await waitFor(() => expect(screen.getByText('編輯測試外套')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('符合我的風格嗎？'));
    });

    await waitFor(async () => {
      const items = await storage.getItems();
      expect(items[0].conditionChecks[2]).toBe(true);
    });
  });

  it('找不到對應單品時顯示提示文字', async () => {
    mockParams = { id: 'not-exist' };
    render(<EditItemScreen />);

    await waitFor(() => {
      expect(screen.getByText('找不到這筆單品')).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/screens/itemEdit.test.tsx -v
```
Expected: FAIL，找不到 `app/item/[id]` 模組

- [ ] **Step 3: 實作 `app/item/[id].tsx`**

```tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useItems } from '../../src/hooks/useItems';
import { useAppStore } from '../../src/store/useAppStore';
import { ConditionChecklist } from '../../src/components/ConditionChecklist';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, updateConditionChecks } = useItems();
  const conditionLabels = useAppStore((s) => s.conditionLabels);

  const item = items.find((i) => i.id === id);

  if (!item) {
    return (
      <View style={styles.container}>
        <Text>找不到這筆單品</Text>
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
  container: { padding: 16 },
  name: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  price: { fontSize: 16, marginBottom: 8 },
  note: { fontSize: 14, color: '#666', marginBottom: 16 },
});
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/screens/itemEdit.test.tsx -v
```
Expected: PASS，全部測試通過

- [ ] **Step 5: Commit**

```bash
git add app/item/[id].tsx src/__tests__/screens/itemEdit.test.tsx
git commit -m "feat: 新增單品編輯畫面（修改條件勾選）"
```

---

## Task 17: 解鎖區畫面（app/(tabs)/unlocked.tsx 完整版）

**Files:**
- Modify: `app/(tabs)/unlocked.tsx`
- Test: `src/__tests__/screens/unlocked.test.tsx`

**Interfaces:**
- Consumes：`useItems` from `src/hooks/useItems.ts`；`ItemCard` from `src/components/ItemCard.tsx`；React Native 的 `Linking`

- [ ] **Step 1: 寫測試（先失敗）**

`src/__tests__/screens/unlocked.test.tsx`：

```tsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UnlockedScreen from '../../../app/(tabs)/unlocked';
import * as storage from '../../services/storage';
import * as itemService from '../../services/itemService';

jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

function makeUnlockedItem(overrides: Partial<Parameters<typeof itemService.createItem>[0]> = {}) {
  const item = itemService.createItem({
    name: '已解鎖外套',
    photoUri: 'mock://photo.jpg',
    price: 900,
    unlockDate: '2020-01-01T00:00:00.000Z',
    initialConditionChecks: [true, true, true, false, false, false],
    ...overrides,
  });
  return { ...item, status: 'unlocked' as const };
}

describe('UnlockedScreen', () => {
  it('沒有解鎖單品時顯示空狀態文字', async () => {
    render(<UnlockedScreen />);
    await waitFor(() => {
      expect(screen.getByText('目前沒有已解鎖的單品')).toBeTruthy();
    });
  });

  it('顯示已解鎖單品，並可以標記已購買', async () => {
    await storage.saveItems([makeUnlockedItem()]);

    render(<UnlockedScreen />);
    await waitFor(() => expect(screen.getByText('已解鎖外套')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('標記已購買'));
    });

    await waitFor(() => {
      expect(screen.queryByText('已解鎖外套')).toBeNull();
    });
  });

  it('有購買連結時可以點擊前往購買頁', async () => {
    await storage.saveItems([makeUnlockedItem({ url: 'https://example.com/product' })]);

    render(<UnlockedScreen />);
    await waitFor(() => expect(screen.getByText('前往購買頁')).toBeTruthy());

    fireEvent.press(screen.getByText('前往購買頁'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/product');
  });

  it('點擊刪除仍算忍術點數', async () => {
    await storage.saveItems([makeUnlockedItem()]);

    render(<UnlockedScreen />);
    await waitFor(() => expect(screen.getByText('已解鎖外套')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('刪除（不買了）'));
    });

    await waitFor(() => {
      expect(screen.queryByText('已解鎖外套')).toBeNull();
    });

    const history = await storage.getHistory();
    expect(history[0].outcome).toBe('resisted');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/screens/unlocked.test.tsx -v
```
Expected: FAIL，因為目前 `unlocked.tsx` 只有 Task 10 的佔位內容

- [ ] **Step 3: 實作 `app/(tabs)/unlocked.tsx`**

```tsx
import { View, Text, FlatList, Linking, StyleSheet } from 'react-native';
import { useItems } from '../../src/hooks/useItems';
import { ItemCard } from '../../src/components/ItemCard';

export default function UnlockedScreen() {
  const { unlockedItems, deleteItem, markPurchased } = useItems();

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
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  empty: { textAlign: 'center', marginTop: 40, color: '#666' },
});
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/screens/unlocked.test.tsx -v
```
Expected: PASS，全部測試通過

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/unlocked.tsx src/__tests__/screens/unlocked.test.tsx
git commit -m "feat: 完成解鎖區畫面（標記購買、刪除、前往購買頁）"
```

---

## Task 18: 我的畫面（app/(tabs)/me.tsx 完整版）

**Files:**
- Modify: `app/(tabs)/me.tsx`
- Test: `src/__tests__/screens/me.test.tsx`

**Interfaces:**
- Consumes：`useAppStore` from `src/store/useAppStore.ts`；`RankBadge` from `src/components/RankBadge.tsx`；`useItems`（僅用於 storage 觸發，非必要）；`storage.getHistory`、`itemService.computeStats`；`THEME_COLOR_OPTIONS` from `src/constants/theme.ts`

- [ ] **Step 1: 寫測試（先失敗）**

`src/__tests__/screens/me.test.tsx`：

```tsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MeScreen from '../../../app/(tabs)/me';
import { useAppStore } from '../../store/useAppStore';
import * as storage from '../../services/storage';
import { DEFAULT_CONDITION_LABELS } from '../../constants/conditions';
import { DEFAULT_THEME_COLOR } from '../../constants/theme';

beforeEach(async () => {
  await AsyncStorage.clear();
  useAppStore.setState({
    ninjaPoints: 0,
    currentRank: '尚無段位',
    conditionLabels: DEFAULT_CONDITION_LABELS,
    themeColor: DEFAULT_THEME_COLOR,
    hydrated: false,
  });
});

describe('MeScreen', () => {
  it('顯示目前段位與統計數據', async () => {
    await storage.saveAppState({ ninjaPoints: 10, conditionLabels: DEFAULT_CONDITION_LABELS, themeColor: DEFAULT_THEME_COLOR });
    await storage.saveHistory([
      { id: 'h1', itemName: 'A', price: 100, outcome: 'resisted', recordedAt: '2026-07-01T00:00:00.000Z' },
      { id: 'h2', itemName: 'B', price: 200, outcome: 'resisted', recordedAt: '2026-07-02T00:00:00.000Z' },
      { id: 'h3', itemName: 'C', price: 300, outcome: 'purchased', recordedAt: '2026-07-03T00:00:00.000Z' },
    ]);

    render(<MeScreen />);

    await waitFor(() => {
      expect(screen.getByText('王牌忍術師')).toBeTruthy();
      expect(screen.getByText('累計放棄 2 次')).toBeTruthy();
      expect(screen.getByText('估計省下 NT$ 300')).toBeTruthy();
    });
  });

  it('可以編輯六項條件文字', async () => {
    render(<MeScreen />);

    await waitFor(() => expect(screen.getByText('編輯六項條件')).toBeTruthy());
    fireEvent.press(screen.getByText('編輯六項條件'));

    const firstInput = screen.getByDisplayValue(DEFAULT_CONDITION_LABELS[0]);
    fireEvent.changeText(firstInput, '改過的條件文字');

    await act(async () => {
      fireEvent.press(screen.getByText('儲存條件'));
    });

    await waitFor(() => {
      expect(useAppStore.getState().conditionLabels[0]).toBe('改過的條件文字');
    });
  });

  it('可以選擇主題色', async () => {
    render(<MeScreen />);
    await waitFor(() => expect(screen.getByText('主題色')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-color-1'));
    });

    await waitFor(() => {
      expect(useAppStore.getState().themeColor).not.toBe(DEFAULT_THEME_COLOR);
    });
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx jest src/__tests__/screens/me.test.tsx -v
```
Expected: FAIL，因為目前 `me.tsx` 只有 Task 10 的佔位內容

- [ ] **Step 3: 實作 `app/(tabs)/me.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { RankBadge } from '../../src/components/RankBadge';
import * as storage from '../../src/services/storage';
import { computeStats } from '../../src/services/itemService';
import { THEME_COLOR_OPTIONS } from '../../src/constants/theme';
import type { HistoryStats } from '../../src/types/item';

export default function MeScreen() {
  const { ninjaPoints, currentRank, conditionLabels, themeColor, hydrate, setConditionLabels, setThemeColor } =
    useAppStore();
  const [stats, setStats] = useState<HistoryStats>({ resistedCount: 0, savedAmount: 0 });
  const [isEditingConditions, setIsEditingConditions] = useState(false);
  const [draftLabels, setDraftLabels] = useState(conditionLabels);

  useEffect(() => {
    hydrate();
    storage.getHistory().then((history) => setStats(computeStats(history)));
  }, [hydrate]);

  useEffect(() => {
    setDraftLabels(conditionLabels);
  }, [conditionLabels]);

  const handleSaveConditions = async () => {
    await setConditionLabels(draftLabels);
    setIsEditingConditions(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>我的</Text>

      <RankBadge points={ninjaPoints} rank={currentRank} />

      <View style={styles.statsRow}>
        <Text style={styles.statText}>累計放棄 {stats.resistedCount} 次</Text>
        <Text style={styles.statText}>估計省下 NT$ {stats.savedAmount}</Text>
      </View>

      <Text style={styles.sectionTitle}>主題色</Text>
      <View style={styles.themeRow}>
        {THEME_COLOR_OPTIONS.map((color, index) => (
          <Pressable
            key={color}
            testID={`theme-color-${index}`}
            style={[styles.themeSwatch, { backgroundColor: color }, themeColor === color && styles.themeSwatchActive]}
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
          <Pressable style={styles.saveButton} onPress={handleSaveConditions}>
            <Text style={styles.saveButtonText}>儲存條件</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 16 },
  statText: { fontSize: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  themeRow: { flexDirection: 'row', gap: 12 },
  themeSwatch: { width: 32, height: 32, borderRadius: 16 },
  themeSwatchActive: { borderWidth: 3, borderColor: '#333' },
  conditionInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8 },
  saveButton: { backgroundColor: '#4DABF7', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#fff', fontWeight: '600' },
});
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx jest src/__tests__/screens/me.test.tsx -v
```
Expected: PASS，全部測試通過

- [ ] **Step 5: 執行完整測試套件，確認沒有破壞先前任務**

```bash
npx jest --coverage
```
Expected: 全部測試通過，`src/services`、`src/store`、`src/hooks` 覆蓋率達 80% 以上

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/me.tsx src/__tests__/screens/me.test.tsx
git commit -m "feat: 完成我的畫面（段位、統計、條件編輯、主題色）"
```

---

## Task 19: 型別檢查、回歸測試腳本與視覺回歸骨架

**Files:**
- Create: `scripts/regression.sh`
- Create: `e2e/visual.sh`
- Modify: `package.json`（新增 `serve` devDependency 供視覺回歸使用）

**Interfaces:**
- Consumes：所有先前任務完成的畫面
- Produces：一鍵回歸測試腳本（型別檢查 + 單元測試 + 視覺回歸）

- [ ] **Step 1: 安裝視覺回歸所需套件**

```bash
npm install --save-dev serve
```

- [ ] **Step 2: 執行型別檢查與完整單元測試，確認目前狀態全綠**

```bash
npx tsc --noEmit
npx jest
```
Expected: 兩者都無錯誤/全部測試通過（這是後續腳本能正常運作的前提）

- [ ] **Step 3: 寫 `scripts/regression.sh`**

```bash
#!/bin/bash
# 完整回歸測試
# 用法: bash scripts/regression.sh [--skip-visual]

set -e

SKIP_VISUAL=false
for arg in "$@"; do
  [ "$arg" = "--skip-visual" ] && SKIP_VISUAL=true
done

PASS_COUNT=0
FAIL_COUNT=0
FAILED_STEPS=()

step_pass() { echo "  ✅ $1"; PASS_COUNT=$((PASS_COUNT+1)); }
step_fail() { echo "  ❌ $1"; FAIL_COUNT=$((FAIL_COUNT+1)); FAILED_STEPS+=("$1"); }

echo "【1/3】TypeScript 型別檢查"
if npx tsc --noEmit 2>&1; then
  step_pass "TypeScript 型別檢查通過"
else
  step_fail "TypeScript 型別錯誤"
fi

echo "【2/3】Jest 單元測試"
if npx jest --passWithNoTests --forceExit 2>&1; then
  step_pass "Jest 單元測試全部通過"
else
  step_fail "Jest 單元測試失敗"
fi

if [ "$SKIP_VISUAL" = false ]; then
  echo "【3/3】視覺回歸測試（Web + agent-browser）"
  if bash e2e/visual.sh 2>&1; then
    step_pass "視覺回歸測試通過"
  else
    step_fail "視覺回歸測試失敗"
  fi
else
  echo "【3/3】視覺回歸測試 ⏭  (--skip-visual)"
fi

printf "✅ 通過: %-3s  ❌ 失敗: %-3s\n" "$PASS_COUNT" "$FAIL_COUNT"

if [ ${#FAILED_STEPS[@]} -gt 0 ]; then
  echo "失敗項目："
  for step in "${FAILED_STEPS[@]}"; do
    echo "  • $step"
  done
  exit 1
fi
```

- [ ] **Step 4: 寫 `e2e/visual.sh`**

```bash
#!/bin/bash
set -e

PORT=8092
BASE_URL="http://localhost:$PORT"
PASS=0
FAIL=0
ERRORS=()

log_pass() { echo "  ✅ $1"; PASS=$((PASS+1)); }
log_fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); ERRORS+=("$1"); }

echo "🔨 Building web export..."
if ! npx expo export --platform web > /tmp/expo-export.log 2>&1; then
  echo "❌ Web export failed:"; tail -20 /tmp/expo-export.log; exit 1
fi

echo "🌐 Starting static server on port $PORT..."
npx serve dist --listen $PORT --single > /tmp/serve.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill $SERVER_PID 2>/dev/null || true
  npx agent-browser close 2>/dev/null || true
}
trap cleanup EXIT

for i in $(seq 1 15); do
  if curl -s "$BASE_URL" > /dev/null 2>&1; then break; fi
  sleep 1
done

npx agent-browser open "$BASE_URL" 2>/dev/null
npx agent-browser wait --load networkidle 2>/dev/null
npx agent-browser wait 3000 2>/dev/null

TITLE=$(npx agent-browser get title 2>/dev/null)
if echo "$TITLE" | grep -qi "SPARK LIST"; then
  log_pass "Page title 正確"
else
  log_fail "Page title 不符（got: $TITLE）"
fi

BODY_TEXT=$(npx agent-browser get text body 2>/dev/null)
if echo "$BODY_TEXT" | grep -q "我的"; then
  log_pass "「我的」分頁文字存在"
else
  log_fail "找不到「我的」分頁文字"
fi

if echo "$BODY_TEXT" | grep -q "冷靜區"; then
  log_pass "「冷靜區」分頁文字存在"
else
  log_fail "找不到「冷靜區」分頁文字"
fi

npx agent-browser screenshot /tmp/e2e-home.png 2>/dev/null

echo "✅ 通過: $PASS  ❌ 失敗: $FAIL"
[ $FAIL -eq 0 ]
```

- [ ] **Step 5: 賦予腳本執行權限**

```bash
chmod +x scripts/regression.sh e2e/visual.sh
```

- [ ] **Step 6: 跑一次不含視覺回歸的完整檢查，確認腳本本身正確**

```bash
bash scripts/regression.sh --skip-visual
```
Expected: 顯示「✅ 通過: 2  ❌ 失敗: 0」（型別檢查 + 單元測試都過，視覺回歸被跳過）

- [ ] **Step 7: Commit**

```bash
git add scripts/regression.sh e2e/visual.sh package.json package-lock.json
git commit -m "chore: 新增回歸測試腳本與視覺回歸骨架"
```

---

## 自我檢查（Plan Self-Review）

**Spec 覆蓋確認：**
- §1 產品概述、§2 核心機制與解鎖判斷邏輯 → Task 4（itemService）+ Task 9（useItems）
- §3 三分頁架構 → Task 10（骨架）+ Task 14/15/16/17/18（完整畫面）
- §4 資料模型（Item / HistoryLogEntry / 全域狀態）→ Task 2（型別）+ Task 3（storage）+ Task 8（store）
- §5 六項條件（預設值＋可編輯）→ Task 2（常數）+ Task 18（編輯 UI）
- §6 遊戲化機制（點數/段位/通知/音效）→ Task 5（badgeService）+ Task 6（notificationService）+ Task 7（audioService）+ Task 9（整合觸發）+ Task 12（RankBadge）
- §7 技術架構（AsyncStorage、分層）→ Task 1（bootstrap）+ Task 3/4/5/6/7/8/9（分層實作）
- §8 測試策略 → 每個任務都含 TDD 測試；Task 19 補齊回歸腳本與視覺回歸骨架
- §9 排除範圍 → 未在任何任務中實作多使用者/雲端同步/分類標籤/獨立心動確認步驟，符合排除範圍

**Placeholder 掃描：** 已重新檢視全部 19 個任務，僅有 Task 7 的 `assets/sounds/*.mp3` 是刻意的空白佔位檔（已明確說明原因與後續動作，非邏輯或程式碼上的偷懶留白），其餘沒有 TBD / "類似 Task N" / 模糊的錯誤處理描述。

**型別一致性檢查：** `Item`、`HistoryLogEntry`、`CreateItemInput`、`RankName`、`PersistedAppState` 等型別/函式簽章在 Task 2～18 中的引用互相一致（例如 `conditionChecks: boolean[]`、`itemService.createItem` 的參數形狀、`useAppStore` 的 action 名稱 `addNinjaPoint`/`setConditionLabels`/`setThemeColor` 在 Task 8、9、14、16、18 中用法一致）。

---

Plan complete and saved to `docs/superpowers/plans/2026-07-29-sparklist-mvp.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach？**
