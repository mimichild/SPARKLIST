# 資料匯出／匯入功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓使用者在「我的」頁把單品、歷史紀錄、App 設定（含照片）匯出成單一 JSON 檔（可分享或存到本機自選資料夾），並能從這種檔案匯入回本機（覆蓋或合併），解決換機/重灌/雲端備份/跨裝置分享的資料遺失風險。

**Architecture:** 新增 `src/services/backupService.ts`（純資料轉換：組 JSON、解析、覆蓋/合併邏輯，不碰任何 OS API）與 `src/services/backupFileService.ts`（OS 整合：分享面板、Android 資料夾選擇器、選檔器），加上共用的 `src/components/ProgressModal.tsx`。「我的」頁只負責串接這些 service 並顯示 UI/進度/結果。

**Tech Stack:** Expo 54 / React Native 0.81 / TypeScript，`expo-file-system/legacy`（新增 `readAsStringAsync`/`writeAsStringAsync`/`deleteAsync`/`StorageAccessFramework`），新增 `expo-sharing`、`expo-document-picker`，Jest + `@testing-library/react-native`。

## Global Constraints

- 只支援 Android（`app.json` 無 `ios` 設定區塊，`/android` 已在 `.gitignore` 中、屬於 Continuous Native Generation，不需手動改原生檔案）。
- 匯出檔格式：單一自包含 JSON，照片以 base64 內嵌，不做 zip 壓縮。
- 只做手動觸發（「我的」頁兩個按鈕），不做自動排程備份。
- 檔名格式固定為 `SPARKLIST-備份-{yyyyMMdd}-{HHmm}.json`。
- `schemaVersion` 不相容或格式錯誤時要擋下並丟出清楚的錯誤訊息，不可靜默寫入壞資料；匯入失敗時不得更動任何現有本機資料。
- 合併模式：`items`／`history` 依 `id` 合併，匯入檔裡有的 `id` 一律覆蓋本機同 `id` 那筆，本機獨有的 `id` 保留；`appState`（主題色／音效／條件文字等單一設定值）在合併模式下維持本機現有設定不變。
- 完成通知一律用 App 內 `Alert.alert` 彈窗，不用系統通知（`expo-notifications`）。
- 分享模式無法取得使用者實際存檔位置（系統分享面板不回傳結果），完成後只能提示「已透過分享完成匯出」；存到本機模式因為是 App 自己寫入使用者選定的資料夾，完成後要顯示確切資料夾／檔名。
- 匯出、匯入都要顯示進度條 modal（處理中 x / y），完成後都要有結果提示。
- 新增依賴 `expo-sharing`、`expo-document-picker`，一律用 `npx expo install` 安裝（確保版本與目前 Expo SDK 相容）。
- 遵循現有程式碼風格：相對路徑 import（不用 `@/` alias）、Jest 測試放在 `src/__tests__/` 對應子目錄、mock 放在 `src/__mocks__/` 並在 `package.json` 的 `jest.moduleNameMapper` 註冊。

---

## Task 1: 安裝依賴套件、擴充測試 mock 骨架

**Files:**
- Modify: `package.json`（新增依賴、`jest.moduleNameMapper`）
- Modify: `src/__mocks__/expo-file-system.ts`
- Create: `src/__mocks__/expo-sharing.ts`
- Create: `src/__mocks__/expo-document-picker.ts`

**Interfaces:**
- Produces：往後所有 task 會用到的 mock 行為——
  - `FileSystem.cacheDirectory` = `'mock://cache/'`
  - `FileSystem.EncodingType` = `{ UTF8: 'utf8', Base64: 'base64' }`
  - `FileSystem.readAsStringAsync(uri, opts)` → 預設 resolve `''`
  - `FileSystem.writeAsStringAsync(uri, content, opts)` → 預設 resolve `undefined`
  - `FileSystem.deleteAsync(uri, opts)` → 預設 resolve `undefined`
  - `FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync()` → 預設 resolve `{ granted: true, directoryUri: 'mock://tree/primary:Download' }`
  - `FileSystem.StorageAccessFramework.createFileAsync(directoryUri, filename, mimeType)` → 預設 resolve `'mock://tree/primary:Download/<filename>'`
  - `Sharing.shareAsync(uri, options)` → 預設 resolve `undefined`
  - `DocumentPicker.getDocumentAsync(options)` → 預設 resolve `{ canceled: true, assets: null }`

這個 task 是純腳手架設定，沒有「先寫失敗測試」的循環，驗收標準是結束時 `npx jest --passWithNoTests` 與既有全部測試都能正常跑過（確認新增的 mock 沒有破壞任何現有測試）。

- [ ] **Step 1: 安裝 expo-sharing、expo-document-picker**

Run: `npx expo install expo-sharing expo-document-picker`

Expected: `package.json` 的 `dependencies` 新增這兩個套件，版本號由 Expo 自動選定（與目前 SDK 54 相容）。

- [ ] **Step 2: 擴充 `src/__mocks__/expo-file-system.ts`**

把檔案內容改成：

```ts
export const documentDirectory = 'mock://document/';
export const cacheDirectory = 'mock://cache/';

export const EncodingType = {
  UTF8: 'utf8',
  Base64: 'base64',
};

export const getInfoAsync = jest.fn().mockResolvedValue({ exists: true });
export const makeDirectoryAsync = jest.fn().mockResolvedValue(undefined);
export const copyAsync = jest.fn().mockResolvedValue(undefined);
export const readAsStringAsync = jest.fn().mockResolvedValue('');
export const writeAsStringAsync = jest.fn().mockResolvedValue(undefined);
export const deleteAsync = jest.fn().mockResolvedValue(undefined);

export const StorageAccessFramework = {
  requestDirectoryPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ granted: true, directoryUri: 'mock://tree/primary:Download' }),
  createFileAsync: jest.fn((directoryUri: string, filename: string) =>
    Promise.resolve(`${directoryUri}/${filename}`)
  ),
};
```

- [ ] **Step 3: 新增 `src/__mocks__/expo-sharing.ts`**

```ts
export const isAvailableAsync = jest.fn().mockResolvedValue(true);
export const shareAsync = jest.fn().mockResolvedValue(undefined);
```

- [ ] **Step 4: 新增 `src/__mocks__/expo-document-picker.ts`**

```ts
export const getDocumentAsync = jest.fn().mockResolvedValue({ canceled: true, assets: null });
```

- [ ] **Step 5: 在 `package.json` 的 `jest.moduleNameMapper` 註冊新 mock**

在現有 `moduleNameMapper` 物件裡新增兩行（放在 `"^expo-notifications$"` 那行附近即可）：

```json
"^expo-sharing$": "<rootDir>/src/__mocks__/expo-sharing.ts",
"^expo-document-picker$": "<rootDir>/src/__mocks__/expo-document-picker.ts",
```

- [ ] **Step 6: 確認沒有破壞既有測試**

Run: `npx jest`
Expected: 全部既有測試維持 PASS（新增的 mock exports 是新增欄位，不影響既有呼叫）。

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/__mocks__/expo-file-system.ts src/__mocks__/expo-sharing.ts src/__mocks__/expo-document-picker.ts
git commit -m "chore: 安裝 expo-sharing/expo-document-picker，擴充測試 mock"
```

---

## Task 2: `photoStorageService` 新增 `persistPhotoFromBase64Async`

**Files:**
- Modify: `src/services/photoStorageService.ts`
- Create: `src/__tests__/services/photoStorageService.test.ts`

**Interfaces:**
- Consumes：`FileSystem.EncodingType.Base64`（Task 1 mock）
- Produces：`persistPhotoFromBase64Async(base64: string, extension?: string): Promise<string>` —— 匯入流程（Task 5）會用這個把 `photoBase64` 寫回本機 `photos/` 目錄、換回 `photoUri`。

- [ ] **Step 1: 寫失敗測試**

建立 `src/__tests__/services/photoStorageService.test.ts`：

```ts
import * as FileSystem from 'expo-file-system/legacy';
import { persistPhotoFromBase64Async } from '../../services/photoStorageService';

beforeEach(() => {
  jest.clearAllMocks();
  (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
});

describe('photoStorageService.persistPhotoFromBase64Async', () => {
  it('把 base64 字串寫入 photos 目錄並回傳新的檔案路徑', async () => {
    const uri = await persistPhotoFromBase64Async('ZmFrZS1iYXNlNjQ=');

    expect(uri).toMatch(/^mock:\/\/document\/photos\/photo-.+\.jpg$/);
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(uri, 'ZmFrZS1iYXNlNjQ=', {
      encoding: FileSystem.EncodingType.Base64,
    });
  });

  it('目錄不存在時會先建立 photos 目錄', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });

    await persistPhotoFromBase64Async('ZmFrZS1iYXNlNjQ=');

    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith('mock://document/photos/', {
      intermediates: true,
    });
  });

  it('可以指定副檔名', async () => {
    const uri = await persistPhotoFromBase64Async('ZmFrZQ==', '.png');
    expect(uri).toMatch(/\.png$/);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx jest src/__tests__/services/photoStorageService.test.ts`
Expected: FAIL，`persistPhotoFromBase64Async is not a function` / `not exported`

- [ ] **Step 3: 實作**

在 `src/services/photoStorageService.ts` 的 `persistPhotoAsync` 函式後面新增：

```ts
// 匯入流程用：把備份檔裡的 base64 照片內容寫回本機的永久儲存目錄，
// 產生一個新的 photoUri（不能沿用匯出檔裡的路徑，裝置間路徑不通用）。
export async function persistPhotoFromBase64Async(base64: string, extension = '.jpg'): Promise<string> {
  await ensurePhotosDirAsync();

  const fileName = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;
  const destination = `${PHOTOS_DIR}${fileName}`;

  await FileSystem.writeAsStringAsync(destination, base64, { encoding: FileSystem.EncodingType.Base64 });

  return destination;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx jest src/__tests__/services/photoStorageService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/photoStorageService.ts src/__tests__/services/photoStorageService.test.ts
git commit -m "feat: photoStorageService 新增從 base64 還原照片檔案的功能"
```

---

## Task 3: `backupService` — 組出匯出用的備份物件（`buildBackupPayload` / `buildBackupFilename`）

**Files:**
- Create: `src/services/backupService.ts`
- Create: `src/__tests__/services/backupService.test.ts`

**Interfaces:**
- Consumes：`storage.getItems()` / `storage.getHistory()` / `storage.getAppState()`（`src/services/storage.ts`，已存在）、`storage.PersistedAppState` 型別、`FileSystem.readAsStringAsync` + `FileSystem.EncodingType.Base64`（Task 1 mock）
- Produces（後續 task 會用到）：
  - `export const BACKUP_SCHEMA_VERSION = 1;`
  - `export type BackupItem = Omit<Item, 'photoUri'> & { photoBase64: string };`
  - `export interface BackupPayload { schemaVersion: number; exportedAt: string; appState: PersistedAppState | null; items: BackupItem[]; history: HistoryLogEntry[]; }`
  - `export async function buildBackupPayload(onProgress?: (current: number, total: number) => void): Promise<BackupPayload>`
  - `export function buildBackupFilename(date: Date): string`

- [ ] **Step 1: 寫失敗測試**

建立 `src/__tests__/services/backupService.test.ts`：

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as storage from '../../services/storage';
import { buildBackupPayload, buildBackupFilename, BACKUP_SCHEMA_VERSION } from '../../services/backupService';
import type { Item } from '../../types/item';

const sampleItem: Item = {
  id: 'item-1',
  name: '測試外套',
  photoUri: 'mock://document/photos/photo-1.jpg',
  photoAspectRatio: 0.75,
  price: 1000,
  createdAt: '2026-07-29T00:00:00.000Z',
  unlockDate: '2026-08-05T00:00:00.000Z',
  conditionChecks: [true, false, false, false, false, false],
  status: 'cooling',
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64-photo-content');
});

describe('backupService.buildBackupPayload', () => {
  it('組出包含 schemaVersion、items（含 photoBase64）、history、appState 的備份物件', async () => {
    await storage.saveItems([sampleItem]);
    await storage.saveHistory([
      { id: 'h1', itemName: '測試外套', price: 1000, outcome: 'resisted', recordedAt: '2026-07-29T00:00:00.000Z' },
    ]);
    await storage.saveAppState({
      ninjaPoints: 3,
      conditionLabels: ['a'],
      themeColor: '#EAAFB3',
      soundEnabled: true,
    });

    const payload = await buildBackupPayload();

    expect(payload.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(payload.items).toEqual([
      {
        id: 'item-1',
        name: '測試外套',
        photoBase64: 'base64-photo-content',
        photoAspectRatio: 0.75,
        price: 1000,
        createdAt: '2026-07-29T00:00:00.000Z',
        unlockDate: '2026-08-05T00:00:00.000Z',
        conditionChecks: [true, false, false, false, false, false],
        status: 'cooling',
      },
    ]);
    expect(payload.history).toHaveLength(1);
    expect(payload.appState).toEqual({
      ninjaPoints: 3,
      conditionLabels: ['a'],
      themeColor: '#EAAFB3',
      soundEnabled: true,
    });
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(sampleItem.photoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  });

  it('沒有單品時 items 為空陣列，appState 為 null', async () => {
    const payload = await buildBackupPayload();

    expect(payload.items).toEqual([]);
    expect(payload.appState).toBeNull();
  });

  it('處理每筆單品時會呼叫 onProgress 回報進度', async () => {
    await storage.saveItems([sampleItem, { ...sampleItem, id: 'item-2' }]);

    const onProgress = jest.fn();
    await buildBackupPayload(onProgress);

    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
  });
});

describe('backupService.buildBackupFilename', () => {
  it('產生 SPARKLIST-備份-yyyyMMdd-HHmm.json 格式的檔名', () => {
    const filename = buildBackupFilename(new Date('2026-08-12T15:30:00'));
    expect(filename).toBe('SPARKLIST-備份-20260812-1530.json');
  });

  it('個位數的月/日/時/分會補零', () => {
    const filename = buildBackupFilename(new Date('2026-01-05T03:07:00'));
    expect(filename).toBe('SPARKLIST-備份-20260105-0307.json');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx jest src/__tests__/services/backupService.test.ts`
Expected: FAIL，找不到 `src/services/backupService.ts` 模組

- [ ] **Step 3: 實作**

建立 `src/services/backupService.ts`：

```ts
import * as FileSystem from 'expo-file-system/legacy';
import * as storage from './storage';
import type { PersistedAppState } from './storage';
import type { Item, HistoryLogEntry } from '../types/item';

export const BACKUP_SCHEMA_VERSION = 1;

export type BackupItem = Omit<Item, 'photoUri'> & { photoBase64: string };

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  appState: PersistedAppState | null;
  items: BackupItem[];
  history: HistoryLogEntry[];
}

export async function buildBackupPayload(
  onProgress?: (current: number, total: number) => void
): Promise<BackupPayload> {
  const [items, history, appState] = await Promise.all([
    storage.getItems(),
    storage.getHistory(),
    storage.getAppState(),
  ]);

  const total = items.length;
  const backupItems: BackupItem[] = [];

  for (let i = 0; i < items.length; i += 1) {
    const { photoUri, ...rest } = items[i];
    const photoBase64 = await FileSystem.readAsStringAsync(photoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    backupItems.push({ ...rest, photoBase64 });
    onProgress?.(i + 1, total);
  }

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appState,
    items: backupItems,
    history,
  };
}

export function buildBackupFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `SPARKLIST-備份-${y}${m}${d}-${hh}${mm}.json`;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx jest src/__tests__/services/backupService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/backupService.ts src/__tests__/services/backupService.test.ts
git commit -m "feat: backupService 新增組出匯出備份物件的功能"
```

---

## Task 4: `backupService` — 解析並驗證匯入檔（`parseBackupPayload`）

**Files:**
- Modify: `src/services/backupService.ts`
- Modify: `src/__tests__/services/backupService.test.ts`

**Interfaces:**
- Consumes：Task 3 的 `BACKUP_SCHEMA_VERSION`、`BackupPayload`
- Produces：`export function parseBackupPayload(raw: string): BackupPayload`（格式不符或版本不相容時 `throw new Error(message)`，訊息會直接顯示在 UI 的 Alert 上，見 Task 8）

- [ ] **Step 1: 寫失敗測試**

先把檔案最上方的 import 改成同時匯入 `buildBackupPayload, buildBackupFilename, parseBackupPayload, BACKUP_SCHEMA_VERSION`：

```ts
import { buildBackupPayload, buildBackupFilename, parseBackupPayload, BACKUP_SCHEMA_VERSION } from '../../services/backupService';
```

然後在 `src/__tests__/services/backupService.test.ts` 檔案最後新增：

```ts
describe('backupService.parseBackupPayload', () => {
  const validPayload = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: '2026-08-12T10:00:00.000Z',
    appState: null,
    items: [],
    history: [],
  };

  it('解析格式正確的備份 JSON', () => {
    const payload = parseBackupPayload(JSON.stringify(validPayload));
    expect(payload).toEqual(validPayload);
  });

  it('不是合法 JSON 時拋出錯誤', () => {
    expect(() => parseBackupPayload('not valid json')).toThrow('匯入檔案不是有效的 JSON 格式');
  });

  it('缺少必要欄位時拋出錯誤', () => {
    expect(() => parseBackupPayload(JSON.stringify({ foo: 'bar' }))).toThrow('匯入檔案格式不正確');
  });

  it('schemaVersion 不相容時拋出錯誤', () => {
    const incompatible = { ...validPayload, schemaVersion: 999 };
    expect(() => parseBackupPayload(JSON.stringify(incompatible))).toThrow('不支援的備份檔版本');
  });

  it('items 或 history 不是陣列時拋出錯誤', () => {
    const invalid = { ...validPayload, items: 'not-an-array' };
    expect(() => parseBackupPayload(JSON.stringify(invalid))).toThrow('匯入檔案格式不正確');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx jest src/__tests__/services/backupService.test.ts`
Expected: FAIL，`parseBackupPayload is not a function`

- [ ] **Step 3: 實作**

在 `src/services/backupService.ts` 的 `buildBackupFilename` 函式後面新增：

```ts
export function parseBackupPayload(raw: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('匯入檔案不是有效的 JSON 格式');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('schemaVersion' in parsed) ||
    !('items' in parsed) ||
    !('history' in parsed)
  ) {
    throw new Error('匯入檔案格式不正確');
  }

  const payload = parsed as BackupPayload;

  if (!Array.isArray(payload.items) || !Array.isArray(payload.history)) {
    throw new Error('匯入檔案格式不正確');
  }

  if (payload.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error(`不支援的備份檔版本（schemaVersion: ${payload.schemaVersion}）`);
  }

  return payload;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx jest src/__tests__/services/backupService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/backupService.ts src/__tests__/services/backupService.test.ts
git commit -m "feat: backupService 新增解析與驗證匯入檔的功能"
```

---

## Task 5: `backupService` — 套用匯入資料（`applyBackupPayload`，覆蓋／合併）

**Files:**
- Modify: `src/services/backupService.ts`
- Modify: `src/__tests__/services/backupService.test.ts`

**Interfaces:**
- Consumes：Task 2 的 `persistPhotoFromBase64Async`、Task 3/4 的型別、`storage.saveItems` / `saveHistory` / `saveAppState`（已存在）
- Produces：
  - `export type ImportMode = 'overwrite' | 'merge';`
  - `export interface ApplyBackupResult { importedItemCount: number; }`
  - `export async function applyBackupPayload(payload: BackupPayload, mode: ImportMode, onProgress?: (current: number, total: number) => void): Promise<ApplyBackupResult>`（Task 8 的 `me.tsx` 會呼叫這個）

- [ ] **Step 1: 寫失敗測試**

先把檔案最上方的 import 改成同時匯入 `applyBackupPayload, type BackupPayload`（測試只驗證 `applyBackupPayload` 對外的行為，不需要另外 import `persistPhotoFromBase64Async`）：

```ts
import {
  buildBackupPayload,
  buildBackupFilename,
  parseBackupPayload,
  applyBackupPayload,
  BACKUP_SCHEMA_VERSION,
  type BackupPayload,
} from '../../services/backupService';
```

然後在 `src/__tests__/services/backupService.test.ts` 檔案最後新增：

```ts
const existingItem: Item = {
  id: 'item-local',
  name: '本機單品',
  photoUri: 'mock://document/photos/local.jpg',
  price: 500,
  createdAt: '2026-07-01T00:00:00.000Z',
  unlockDate: '2026-07-10T00:00:00.000Z',
  conditionChecks: [false, false, false, false, false, false],
  status: 'cooling',
};

function buildTestPayload(overrides: Partial<BackupPayload> = {}): BackupPayload {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: '2026-08-12T10:00:00.000Z',
    appState: { ninjaPoints: 9, conditionLabels: ['x'], themeColor: '#111111', soundEnabled: false },
    items: [
      {
        id: 'item-local',
        name: '匯入版本的名稱',
        photoBase64: 'incoming-base64',
        price: 999,
        createdAt: '2026-08-01T00:00:00.000Z',
        unlockDate: '2026-08-08T00:00:00.000Z',
        conditionChecks: [true, true, false, false, false, false],
        status: 'cooling',
      },
    ],
    history: [
      { id: 'h-imported', itemName: '匯入版本的名稱', price: 999, outcome: 'resisted', recordedAt: '2026-08-01T00:00:00.000Z' },
    ],
    ...overrides,
  };
}

describe('backupService.applyBackupPayload - 覆蓋模式', () => {
  it('整批取代 items、history、appState', async () => {
    await storage.saveItems([existingItem]);
    await storage.saveHistory([
      { id: 'h-local', itemName: '本機單品', price: 500, outcome: 'resisted', recordedAt: '2026-07-01T00:00:00.000Z' },
    ]);

    const result = await applyBackupPayload(buildTestPayload(), 'overwrite');

    const savedItems = await storage.getItems();
    expect(savedItems).toHaveLength(1);
    expect(savedItems[0].name).toBe('匯入版本的名稱');
    expect(savedItems[0].photoUri).toMatch(/^mock:\/\/document\/photos\/photo-.+/);

    const savedHistory = await storage.getHistory();
    expect(savedHistory).toEqual([
      { id: 'h-imported', itemName: '匯入版本的名稱', price: 999, outcome: 'resisted', recordedAt: '2026-08-01T00:00:00.000Z' },
    ]);

    expect(await storage.getAppState()).toEqual({
      ninjaPoints: 9,
      conditionLabels: ['x'],
      themeColor: '#111111',
      soundEnabled: false,
    });
    expect(result.importedItemCount).toBe(1);
  });
});

describe('backupService.applyBackupPayload - 合併模式', () => {
  it('id 相同時以匯入檔為準覆蓋，本機獨有的 id 保留，appState 維持本機原值', async () => {
    await storage.saveAppState({
      ninjaPoints: 1,
      conditionLabels: ['本機'],
      themeColor: '#EAAFB3',
      soundEnabled: true,
    });
    await storage.saveItems([existingItem, { ...existingItem, id: 'item-local-only', name: '本機獨有' }]);
    await storage.saveHistory([
      { id: 'h-local-only', itemName: '本機獨有', price: 200, outcome: 'resisted', recordedAt: '2026-06-01T00:00:00.000Z' },
    ]);

    await applyBackupPayload(buildTestPayload(), 'merge');

    const savedItems = await storage.getItems();
    expect(savedItems.map((i) => i.id).sort()).toEqual(['item-local', 'item-local-only'].sort());
    expect(savedItems.find((i) => i.id === 'item-local')?.name).toBe('匯入版本的名稱');
    expect(savedItems.find((i) => i.id === 'item-local-only')?.name).toBe('本機獨有');

    const savedHistory = await storage.getHistory();
    expect(savedHistory.map((h) => h.id).sort()).toEqual(['h-imported', 'h-local-only'].sort());

    expect(await storage.getAppState()).toEqual({
      ninjaPoints: 1,
      conditionLabels: ['本機'],
      themeColor: '#EAAFB3',
      soundEnabled: true,
    });
  });
});

describe('backupService.applyBackupPayload - 進度回呼', () => {
  it('每寫回一筆照片就呼叫 onProgress', async () => {
    const payload = buildTestPayload({
      items: [
        {
          id: 'a',
          name: 'A',
          photoBase64: 'x',
          price: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          unlockDate: '2026-01-02T00:00:00.000Z',
          conditionChecks: [false, false, false, false, false, false],
          status: 'cooling',
        },
        {
          id: 'b',
          name: 'B',
          photoBase64: 'y',
          price: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          unlockDate: '2026-01-02T00:00:00.000Z',
          conditionChecks: [false, false, false, false, false, false],
          status: 'cooling',
        },
      ],
    });
    const onProgress = jest.fn();

    await applyBackupPayload(payload, 'overwrite', onProgress);

    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx jest src/__tests__/services/backupService.test.ts`
Expected: FAIL，`applyBackupPayload is not a function`

- [ ] **Step 3: 實作**

在 `src/services/backupService.ts` 檔案最上方的 import 區塊補上：

```ts
import { persistPhotoFromBase64Async } from './photoStorageService';
import type { Item, HistoryLogEntry } from '../types/item';
```

（`Item`、`HistoryLogEntry` 已經在 Task 3 匯入過，不要重複加；只新增 `persistPhotoFromBase64Async` 這一行。）

在檔案最後新增：

```ts
export type ImportMode = 'overwrite' | 'merge';

export interface ApplyBackupResult {
  importedItemCount: number;
}

export async function applyBackupPayload(
  payload: BackupPayload,
  mode: ImportMode,
  onProgress?: (current: number, total: number) => void
): Promise<ApplyBackupResult> {
  const total = payload.items.length;
  const restoredItems: Item[] = [];

  for (let i = 0; i < payload.items.length; i += 1) {
    const { photoBase64, ...rest } = payload.items[i];
    const photoUri = await persistPhotoFromBase64Async(photoBase64);
    restoredItems.push({ ...rest, photoUri });
    onProgress?.(i + 1, total);
  }

  let finalItems: Item[];
  let finalHistory: HistoryLogEntry[];

  if (mode === 'overwrite') {
    finalItems = restoredItems;
    finalHistory = payload.history;
  } else {
    const existingItems = await storage.getItems();
    const existingHistory = await storage.getHistory();
    finalItems = mergeById(existingItems, restoredItems);
    finalHistory = mergeById(existingHistory, payload.history);
  }

  await storage.saveItems(finalItems);
  await storage.saveHistory(finalHistory);

  if (mode === 'overwrite' && payload.appState) {
    await storage.saveAppState(payload.appState);
  }

  return { importedItemCount: restoredItems.length };
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const incomingIds = new Set(incoming.map((entry) => entry.id));
  const keptExisting = existing.filter((entry) => !incomingIds.has(entry.id));
  return [...keptExisting, ...incoming];
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx jest src/__tests__/services/backupService.test.ts`
Expected: PASS（全部 `backupService` 測試，含 Task 3/4 的）

- [ ] **Step 5: Commit**

```bash
git add src/services/backupService.ts src/__tests__/services/backupService.test.ts
git commit -m "feat: backupService 新增套用匯入資料（覆蓋/合併）的功能"
```

---

## Task 6: `backupFileService` — 分享、存到本機資料夾、選檔匯入

**Files:**
- Create: `src/services/backupFileService.ts`
- Create: `src/__tests__/services/backupFileService.test.ts`

**Interfaces:**
- Consumes：`FileSystem.cacheDirectory` / `writeAsStringAsync` / `deleteAsync` / `StorageAccessFramework.*`（Task 1 mock）、`Sharing.shareAsync`、`DocumentPicker.getDocumentAsync`
- Produces（Task 8 的 `me.tsx` 會用到）：
  - `export async function shareBackupFile(content: string, filename: string): Promise<void>`
  - `export interface SaveToFolderResult { folderDisplayName: string }`
  - `export async function saveBackupToFolder(content: string, filename: string): Promise<SaveToFolderResult | null>`（使用者取消資料夾選擇時回傳 `null`）
  - `export function extractFolderDisplayName(directoryUri: string): string`
  - `export async function pickBackupFile(): Promise<string | null>`（使用者取消選檔時回傳 `null`）

- [ ] **Step 1: 寫失敗測試**

建立 `src/__tests__/services/backupFileService.test.ts`：

```ts
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  shareBackupFile,
  saveBackupToFolder,
  pickBackupFile,
  extractFolderDisplayName,
} from '../../services/backupFileService';

beforeEach(() => {
  jest.clearAllMocks();
  (FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: true,
    directoryUri: 'mock://tree/primary:Download',
  });
});

describe('backupFileService.shareBackupFile', () => {
  it('把內容寫入暫存檔、叫出分享面板，完成後刪除暫存檔', async () => {
    await shareBackupFile('{"a":1}', 'backup.json');

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith('mock://cache/backup.json', '{"a":1}', {
      encoding: FileSystem.EncodingType.UTF8,
    });
    expect(Sharing.shareAsync).toHaveBeenCalledWith('mock://cache/backup.json', { mimeType: 'application/json' });
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('mock://cache/backup.json', { idempotent: true });
  });

  it('分享失敗時仍會刪除暫存檔並往外拋出錯誤', async () => {
    (Sharing.shareAsync as jest.Mock).mockRejectedValueOnce(new Error('分享失敗'));

    await expect(shareBackupFile('{}', 'backup.json')).rejects.toThrow('分享失敗');
    expect(FileSystem.deleteAsync).toHaveBeenCalled();
  });
});

describe('backupFileService.saveBackupToFolder', () => {
  it('使用者選定資料夾後，把內容寫入該資料夾並回傳資料夾顯示名稱', async () => {
    const result = await saveBackupToFolder('{"a":1}', 'backup.json');

    expect(FileSystem.StorageAccessFramework.createFileAsync).toHaveBeenCalledWith(
      'mock://tree/primary:Download',
      'backup.json',
      'application/json'
    );
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      'mock://tree/primary:Download/backup.json',
      '{"a":1}',
      { encoding: FileSystem.EncodingType.UTF8 }
    );
    expect(result).toEqual({ folderDisplayName: 'Download' });
  });

  it('使用者取消資料夾選擇時回傳 null', async () => {
    (FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
    });

    const result = await saveBackupToFolder('{}', 'backup.json');

    expect(result).toBeNull();
    expect(FileSystem.StorageAccessFramework.createFileAsync).not.toHaveBeenCalled();
  });
});

describe('backupFileService.extractFolderDisplayName', () => {
  it('從 SAF content URI 取出資料夾顯示名稱', () => {
    expect(
      extractFolderDisplayName('content://com.android.externalstorage.documents/tree/primary%3ADownload')
    ).toBe('Download');
  });

  it('沒有冒號分隔時直接取最後一段路徑', () => {
    expect(extractFolderDisplayName('content://com.example/tree/MyFolder')).toBe('MyFolder');
  });
});

describe('backupFileService.pickBackupFile', () => {
  it('使用者選擇檔案後回傳檔案內容字串', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'mock://picked/backup.json', name: 'backup.json' }],
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce('{"a":1}');

    const content = await pickBackupFile();

    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('mock://picked/backup.json', {
      encoding: FileSystem.EncodingType.UTF8,
    });
    expect(content).toBe('{"a":1}');
  });

  it('使用者取消選擇時回傳 null', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({ canceled: true, assets: null });

    const content = await pickBackupFile();

    expect(content).toBeNull();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx jest src/__tests__/services/backupFileService.test.ts`
Expected: FAIL，找不到 `src/services/backupFileService.ts` 模組

- [ ] **Step 3: 實作**

建立 `src/services/backupFileService.ts`：

```ts
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

export async function shareBackupFile(content: string, filename: string): Promise<void> {
  const tempUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(tempUri, content, { encoding: FileSystem.EncodingType.UTF8 });
  try {
    await Sharing.shareAsync(tempUri, { mimeType: 'application/json' });
  } finally {
    await FileSystem.deleteAsync(tempUri, { idempotent: true });
  }
}

export interface SaveToFolderResult {
  folderDisplayName: string;
}

export async function saveBackupToFolder(
  content: string,
  filename: string
): Promise<SaveToFolderResult | null> {
  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
    permission.directoryUri,
    filename,
    'application/json'
  );
  await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });

  return { folderDisplayName: extractFolderDisplayName(permission.directoryUri) };
}

// SAF 的 directoryUri 是 content:// 開頭的不透明字串（例如
// content://.../tree/primary%3ADownload），不是人類可讀的路徑。
// 這裡盡力解出最後一段當作顯示名稱，只用來給使用者看，不作其他用途。
export function extractFolderDisplayName(directoryUri: string): string {
  const decoded = decodeURIComponent(directoryUri);
  const lastSegment = decoded.split('/').filter(Boolean).pop() ?? decoded;
  const colonParts = lastSegment.split(':');
  return colonParts[colonParts.length - 1] || lastSegment;
}

export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }
  return FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx jest src/__tests__/services/backupFileService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/backupFileService.ts src/__tests__/services/backupFileService.test.ts
git commit -m "feat: 新增 backupFileService 處理分享/存到本機/選檔匯入"
```

---

## Task 7: `ProgressModal` 共用元件

**Files:**
- Create: `src/components/ProgressModal.tsx`
- Create: `src/__tests__/components/ProgressModal.test.tsx`

**Interfaces:**
- Consumes：`COLORS` / `RADIUS` / `SPACING` / `TYPE_SCALE`（`src/constants/theme.ts`，已存在）
- Produces：`ProgressModal({ visible, label, current, total, accentColor }: ProgressModalProps)`（Task 8 的 `me.tsx` 會渲染兩個，分別給匯出/匯入用）

- [ ] **Step 1: 寫失敗測試**

建立 `src/__tests__/components/ProgressModal.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ProgressModal } from '../../components/ProgressModal';

describe('ProgressModal', () => {
  it('visible 為 true 時顯示標籤與進度數字', () => {
    render(<ProgressModal visible label="匯出中" current={2} total={5} accentColor="#EAAFB3" />);

    expect(screen.getByText('匯出中')).toBeTruthy();
    expect(screen.getByTestId('progress-modal-count').props.children).toEqual([2, ' / ', 5]);
  });

  it('進度條寬度依 current/total 計算百分比', () => {
    render(<ProgressModal visible label="匯出中" current={2} total={4} accentColor="#EAAFB3" />);

    const bar = screen.getByTestId('progress-modal-bar');
    expect(StyleSheet.flatten(bar.props.style).width).toBe('50%');
  });

  it('total 為 0 時進度條寬度為 0%，不會噴錯', () => {
    render(<ProgressModal visible label="準備中" current={0} total={0} accentColor="#EAAFB3" />);

    const bar = screen.getByTestId('progress-modal-bar');
    expect(StyleSheet.flatten(bar.props.style).width).toBe('0%');
  });

  it('visible 為 false 時不顯示內容', () => {
    render(<ProgressModal visible={false} label="匯出中" current={0} total={0} accentColor="#EAAFB3" />);

    expect(screen.queryByText('匯出中')).toBeNull();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx jest src/__tests__/components/ProgressModal.test.tsx`
Expected: FAIL，找不到 `src/components/ProgressModal.tsx` 模組

- [ ] **Step 3: 實作**

建立 `src/components/ProgressModal.tsx`：

```tsx
import { Modal, View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPE_SCALE } from '../constants/theme';

interface ProgressModalProps {
  visible: boolean;
  label: string;
  current: number;
  total: number;
  accentColor: string;
}

export function ProgressModal({ visible, label, current, total, accentColor }: ProgressModalProps) {
  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.label}>{label}</Text>
          <Text testID="progress-modal-count" style={styles.count}>
            {current} / {total}
          </Text>
          <View style={styles.track}>
            <View
              testID="progress-modal-bar"
              style={[styles.bar, { width: `${percent}%`, backgroundColor: accentColor }]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  panel: {
    width: '80%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.large,
    padding: SPACING.horizontal,
    alignItems: 'center',
  },
  label: {
    fontSize: TYPE_SCALE.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.verticalSmall,
  },
  count: { fontSize: TYPE_SCALE.small, color: COLORS.textSecondary, marginBottom: SPACING.verticalMedium },
  track: { width: '100%', height: 8, borderRadius: 4, backgroundColor: COLORS.border, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4 },
});
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx jest src/__tests__/components/ProgressModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ProgressModal.tsx src/__tests__/components/ProgressModal.test.tsx
git commit -m "feat: 新增 ProgressModal 共用進度條元件"
```

---

## Task 8: 「我的」頁整合匯出／匯入按鈕

**Files:**
- Modify: `app/(tabs)/me.tsx`
- Modify: `src/__tests__/screens/me.test.tsx`

**Interfaces:**
- Consumes：`backupService.buildBackupPayload/buildBackupFilename/parseBackupPayload/applyBackupPayload`（Task 3/4/5）、`backupFileService.shareBackupFile/saveBackupToFolder/pickBackupFile`（Task 6）、`ProgressModal`（Task 7）、`storage.getItems/getHistory`（已存在）、`useAppStore` 的 `hydrate`（已存在）

- [ ] **Step 1: 寫失敗測試**

在 `src/__tests__/screens/me.test.tsx` 檔案最上方的 import 區塊新增：

```ts
import * as backupService from '../../services/backupService';
import * as backupFileService from '../../services/backupFileService';

jest.mock('../../services/backupService');
jest.mock('../../services/backupFileService');

const mockedBackupService = backupService as jest.Mocked<typeof backupService>;
const mockedBackupFileService = backupFileService as jest.Mocked<typeof backupFileService>;
```

在既有的 `beforeEach` 區塊裡（`jest.spyOn(Alert, 'alert')...` 那行之後）補上預設 mock 行為：

```ts
  mockedBackupService.buildBackupPayload.mockResolvedValue({
    schemaVersion: 1,
    exportedAt: '2026-08-12T00:00:00.000Z',
    appState: null,
    items: [],
    history: [],
  });
  mockedBackupService.buildBackupFilename.mockReturnValue('SPARKLIST-備份-20260812-0000.json');
  mockedBackupService.applyBackupPayload.mockResolvedValue({ importedItemCount: 0 });
  mockedBackupFileService.shareBackupFile.mockResolvedValue(undefined);
  mockedBackupFileService.saveBackupToFolder.mockResolvedValue({ folderDisplayName: 'Download' });
  mockedBackupFileService.pickBackupFile.mockResolvedValue(null);
```

在檔案最後（`describe('MeScreen', ...)` 區塊內、既有測試的最後）新增以下測試：

```ts
  it('按下匯出資料後選擇「分享」，會呼叫 shareBackupFile 並在完成後提示', async () => {
    await render(<MeScreen />);

    (Alert.alert as jest.Mock).mockImplementation((title, _message, buttons) => {
      if (title === '匯出資料') {
        buttons?.find((b: { text: string }) => b.text === '分享')?.onPress?.();
      }
    });

    await act(async () => {
      await fireEvent.press(screen.getByTestId('export-data-button'));
    });

    await waitFor(() => {
      expect(mockedBackupFileService.shareBackupFile).toHaveBeenCalledWith(
        expect.any(String),
        'SPARKLIST-備份-20260812-0000.json'
      );
    });
    expect(Alert.alert).toHaveBeenCalledWith('已透過分享完成匯出');
  });

  it('按下匯出資料後選擇「存到本機」，完成後提示儲存位置', async () => {
    await render(<MeScreen />);

    (Alert.alert as jest.Mock).mockImplementation((title, _message, buttons) => {
      if (title === '匯出資料') {
        buttons?.find((b: { text: string }) => b.text === '存到本機')?.onPress?.();
      }
    });

    await act(async () => {
      await fireEvent.press(screen.getByTestId('export-data-button'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('已匯出', expect.stringContaining('Download'));
    });
  });

  it('存到本機時使用者取消資料夾選擇，不顯示完成提示', async () => {
    mockedBackupFileService.saveBackupToFolder.mockResolvedValueOnce(null);
    await render(<MeScreen />);

    (Alert.alert as jest.Mock).mockImplementation((title, _message, buttons) => {
      if (title === '匯出資料') {
        buttons?.find((b: { text: string }) => b.text === '存到本機')?.onPress?.();
      }
    });

    await act(async () => {
      await fireEvent.press(screen.getByTestId('export-data-button'));
    });

    await waitFor(() => {
      expect(mockedBackupFileService.saveBackupToFolder).toHaveBeenCalled();
    });
    expect(Alert.alert).not.toHaveBeenCalledWith('已匯出', expect.anything());
  });

  it('本機沒有資料時，按下匯入資料不會詢問覆蓋或合併，直接匯入', async () => {
    mockedBackupFileService.pickBackupFile.mockResolvedValueOnce('{"valid":"json"}');
    mockedBackupService.parseBackupPayload.mockReturnValueOnce({
      schemaVersion: 1,
      exportedAt: '2026-08-12T00:00:00.000Z',
      appState: null,
      items: [],
      history: [],
    });
    mockedBackupService.applyBackupPayload.mockResolvedValueOnce({ importedItemCount: 3 });

    await render(<MeScreen />);

    await act(async () => {
      await fireEvent.press(screen.getByTestId('import-data-button'));
    });

    await waitFor(() => {
      expect(mockedBackupService.applyBackupPayload).toHaveBeenCalledWith(
        expect.anything(),
        'overwrite',
        expect.any(Function)
      );
    });
    expect(Alert.alert).toHaveBeenCalledWith('已匯入', '已匯入 3 筆單品');
  });

  it('本機已有資料時，按下匯入資料會詢問覆蓋或合併，選「合併」會以合併模式匯入', async () => {
    await storage.saveItems([
      {
        id: 'local-1',
        name: '本機單品',
        photoUri: 'mock://p.jpg',
        price: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        unlockDate: '2026-01-02T00:00:00.000Z',
        conditionChecks: [false, false, false, false, false, false],
        status: 'cooling',
      },
    ]);
    mockedBackupFileService.pickBackupFile.mockResolvedValueOnce('{"valid":"json"}');
    mockedBackupService.parseBackupPayload.mockReturnValueOnce({
      schemaVersion: 1,
      exportedAt: '2026-08-12T00:00:00.000Z',
      appState: null,
      items: [],
      history: [],
    });
    mockedBackupService.applyBackupPayload.mockResolvedValueOnce({ importedItemCount: 5 });

    await render(<MeScreen />);

    (Alert.alert as jest.Mock).mockImplementation((title, _message, buttons) => {
      if (title === '匯入資料') {
        buttons?.find((b: { text: string }) => b.text === '合併')?.onPress?.();
      }
    });

    await act(async () => {
      await fireEvent.press(screen.getByTestId('import-data-button'));
    });

    await waitFor(() => {
      expect(mockedBackupService.applyBackupPayload).toHaveBeenCalledWith(
        expect.anything(),
        'merge',
        expect.any(Function)
      );
    });
    expect(Alert.alert).toHaveBeenCalledWith('已匯入', '已匯入 5 筆單品');
  });

  it('匯入檔案格式錯誤時顯示錯誤提示，不會呼叫 applyBackupPayload', async () => {
    mockedBackupFileService.pickBackupFile.mockResolvedValueOnce('not valid json');
    mockedBackupService.parseBackupPayload.mockImplementationOnce(() => {
      throw new Error('匯入檔案不是有效的 JSON 格式');
    });

    await render(<MeScreen />);

    await act(async () => {
      await fireEvent.press(screen.getByTestId('import-data-button'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('匯入失敗', '匯入檔案不是有效的 JSON 格式');
    });
    expect(mockedBackupService.applyBackupPayload).not.toHaveBeenCalled();
  });

  it('使用者取消選擇匯入檔案時，不做任何事', async () => {
    mockedBackupFileService.pickBackupFile.mockResolvedValueOnce(null);

    await render(<MeScreen />);

    await act(async () => {
      await fireEvent.press(screen.getByTestId('import-data-button'));
    });

    expect(mockedBackupService.parseBackupPayload).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx jest src/__tests__/screens/me.test.tsx`
Expected: FAIL，找不到 `testID="export-data-button"` / `testID="import-data-button"`

- [ ] **Step 3: 實作**

在 `app/(tabs)/me.tsx` 檔案最上方的 import 區塊新增：

```ts
import { ProgressModal } from '../../src/components/ProgressModal';
import * as backupService from '../../src/services/backupService';
import * as backupFileService from '../../src/services/backupFileService';
```

在 `MeScreen` 函式內，`const [isDirty, setIsDirty] = useState(false);` 那行之後新增狀態：

```ts
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
```

在 `handleCancelConditions` 函式後面（`return (` 之前）新增以下處理函式：

```ts
  const runExport = async (destination: 'share' | 'local') => {
    try {
      setExportProgress({ current: 0, total: 0 });
      const payload = await backupService.buildBackupPayload((current, total) => {
        setExportProgress({ current, total });
      });
      const filename = backupService.buildBackupFilename(new Date());
      const content = JSON.stringify(payload);

      if (destination === 'share') {
        setExportProgress(null);
        await backupFileService.shareBackupFile(content, filename);
        Alert.alert('已透過分享完成匯出');
      } else {
        const result = await backupFileService.saveBackupToFolder(content, filename);
        setExportProgress(null);
        if (result) {
          Alert.alert('已匯出', `存於：${result.folderDisplayName}/${filename}`);
        }
      }
    } catch (error) {
      setExportProgress(null);
      Alert.alert('匯出失敗', error instanceof Error ? error.message : '發生未知錯誤');
    }
  };

  const handleExportPress = () => {
    Alert.alert('匯出資料', '請選擇匯出方式', [
      { text: '分享', onPress: () => runExport('share') },
      { text: '存到本機', onPress: () => runExport('local') },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const runImport = async (payload: backupService.BackupPayload, mode: backupService.ImportMode) => {
    try {
      setImportProgress({ current: 0, total: 0 });
      const result = await backupService.applyBackupPayload(payload, mode, (current, total) => {
        setImportProgress({ current, total });
      });
      setImportProgress(null);
      await hydrate();
      const history = await storage.getHistory();
      setStats(computeStats(history));
      Alert.alert('已匯入', `已匯入 ${result.importedItemCount} 筆單品`);
    } catch (error) {
      setImportProgress(null);
      Alert.alert('匯入失敗', error instanceof Error ? error.message : '發生未知錯誤');
    }
  };

  const handleImportPress = async () => {
    const content = await backupFileService.pickBackupFile();
    if (!content) {
      return;
    }

    let payload: backupService.BackupPayload;
    try {
      payload = backupService.parseBackupPayload(content);
    } catch (error) {
      Alert.alert('匯入失敗', error instanceof Error ? error.message : '發生未知錯誤');
      return;
    }

    const existingItems = await storage.getItems();
    const existingHistory = await storage.getHistory();

    if (existingItems.length > 0 || existingHistory.length > 0) {
      Alert.alert('匯入資料', '本機已有資料，請選擇匯入方式', [
        { text: '覆蓋', onPress: () => runImport(payload, 'overwrite') },
        { text: '合併', onPress: () => runImport(payload, 'merge') },
        { text: '取消', style: 'cancel' },
      ]);
    } else {
      runImport(payload, 'overwrite');
    }
  };
```

在 JSX 裡，把「編輯條件」區塊（`<Text style={styles.sectionTitle}>編輯條件</Text>`）前面加入新的「資料備份」區塊：

```tsx
      <Text style={styles.sectionTitle}>資料備份</Text>
      <View style={styles.backupRow}>
        <Pressable
          testID="export-data-button"
          style={[styles.backupButton, { backgroundColor: themeColor }]}
          onPress={handleExportPress}
        >
          <Text style={styles.backupButtonText}>匯出資料</Text>
        </Pressable>
        <Pressable testID="import-data-button" style={styles.backupButtonOutline} onPress={handleImportPress}>
          <Text style={styles.backupButtonOutlineText}>匯入資料</Text>
        </Pressable>
      </View>

      <ProgressModal
        visible={exportProgress !== null}
        label="匯出中"
        current={exportProgress?.current ?? 0}
        total={exportProgress?.total ?? 0}
        accentColor={themeColor}
      />
      <ProgressModal
        visible={importProgress !== null}
        label="匯入中"
        current={importProgress?.current ?? 0}
        total={importProgress?.total ?? 0}
        accentColor={themeColor}
      />

```

在 `styles` 物件（`StyleSheet.create({...})`）裡新增：

```ts
  backupRow: { flexDirection: 'row', gap: 8 },
  backupButton: { flex: 1, padding: SPACING.verticalMedium, borderRadius: RADIUS.pill, alignItems: 'center' },
  backupButtonText: { fontWeight: '600', fontSize: TYPE_SCALE.body, color: '#FFFFFF' },
  backupButtonOutline: {
    flex: 1,
    padding: SPACING.verticalMedium,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backupButtonOutlineText: { fontWeight: '600', fontSize: TYPE_SCALE.body, color: COLORS.textPrimary },
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx jest src/__tests__/screens/me.test.tsx`
Expected: PASS（全部 `MeScreen` 測試，含既有的與新增的）

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/me.tsx" src/__tests__/screens/me.test.tsx
git commit -m "feat: 我的頁新增匯出/匯入資料按鈕，串接 backupService/backupFileService"
```

---

## Task 9: 全專案驗證

**Files:** 無新檔案，只執行驗證指令。

- [ ] **Step 1: 跑完整測試套件**

Run: `npx jest`
Expected: 全部測試（既有 + Task 1-8 新增的）PASS，無 skip、無 console error。

- [ ] **Step 2: TypeScript 型別檢查**

Run: `npx tsc --noEmit`
Expected: 無型別錯誤。

- [ ] **Step 3: 實機/模擬器驗證（無法自動化，需人工操作）**

用 `/build-apk` 建置新的 APK（會自動跑 `expo prebuild` 重新產生 `android/`，把新加的 `expo-sharing`／`expo-document-picker` 原生模組正確 autolink 進去），安裝到實機或模擬器後手動走一次：
1. 「我的」頁按「匯出資料」→ 選「分享」→ 確認能叫出系統分享面板、分享完成後看到「已透過分享完成匯出」提示
2. 「我的」頁按「匯出資料」→ 選「存到本機」→ 選一個資料夾（例如下載）→ 確認完成後提示的資料夾名稱正確、檔案真的出現在該資料夾
3. 「我的」頁按「匯入資料」→ 選剛剛匯出的檔案 → （本機已有資料時）選「覆蓋」或「合併」→ 確認單品、照片、歷史紀錄、設定都正確還原
4. 匯入格式錯誤的檔案（例如隨便一個 `.json` 文字檔）→ 確認出現「匯入失敗」提示，且不影響原本資料

這一步無法在此工作階段自動完成，需要使用者在實機/模擬器上操作確認。

- [ ] **Step 4: 更新設計文件狀態**

把 `docs/superpowers/specs/2026-08-12-backup-export-import-design.md` 開頭的「狀態：已通過使用者確認，待寫入實作計畫」改成「狀態：實作計畫已完成，見 `docs/superpowers/plans/2026-08-12-backup-export-import.md`」。

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-08-12-backup-export-import-design.md
git commit -m "docs: 更新匯出/匯入設計文件狀態，連結到實作計畫"
```
