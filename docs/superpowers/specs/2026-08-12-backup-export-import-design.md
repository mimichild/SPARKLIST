# SPARK LIST 資料匯出／匯入 設計文件

日期：2026-08-12
狀態：實作計畫已完成，見 `docs/superpowers/plans/2026-08-12-backup-export-import.md`

## 1. 產品概述

SPARKLIST 目前所有資料（單品、歷史紀錄、App 設定）只存在裝置本機的 AsyncStorage，照片存在 App 文件目錄。沒有雲端同步機制，換手機、重灌、誤刪都會整批資料遺失。

本次新增「匯出資料」「匯入資料」功能，解決三個情境：
- 換手機／重灌時備份還原
- 手動備份存雲端硬碟（Google Drive 等）
- 跨裝置或分享單品清單給別人

目前 App 只設定了 Android 平台（`app.json` 無 `ios` 區塊，無 `ios/` 原生專案），本設計只涵蓋 Android。

## 2. 架構

新增 `src/services/backupService.ts`，封裝匯出／匯入的核心邏輯，不碰 UI，維持與現有 `storage.ts`／`photoStorageService.ts` 一致的分層方式，方便獨立測試。

「我的」頁（`app/(tabs)/me.tsx`）新增「匯出資料」「匯入資料」兩個按鈕（手動觸發，不做自動排程備份），呼叫 `backupService`，並負責顯示選單、進度條 modal、結果 Alert。

新增一個共用的進度條 modal 元件（例如 `src/components/ProgressModal.tsx`），顯示「處理中 x / y」，供匯出／匯入共用。

## 3. 匯出檔資料格式

單一自包含 JSON 檔（不用 zip，照片以 base64 內嵌）：

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-08-12T10:00:00.000Z",
  "appState": {
    "ninjaPoints": 12,
    "conditionLabels": ["...", "..."],
    "themeColor": "#EAAFB3",
    "soundEnabled": true
  },
  "items": [
    {
      "id": "...",
      "name": "...",
      "photoBase64": "...",
      "photoAspectRatio": 0.75,
      "price": 990,
      "url": "...",
      "note": "...",
      "createdAt": "...",
      "unlockDate": "...",
      "conditionChecks": [true, false],
      "status": "cooling"
    }
  ],
  "history": [
    { "id": "...", "itemName": "...", "price": 990, "outcome": "resisted", "recordedAt": "..." }
  ]
}
```

- `photoUri` 不匯出（裝置間路徑不通用），改用 `photoBase64`，匯入時重新寫檔、產生新的本機 `photoUri`。
- `schemaVersion` 供未來格式變動時判斷相容性，不認得的版本要擋下並提示錯誤，不可靜默處理成壞資料。
- 檔名格式：`SPARKLIST-備份-{yyyyMMdd}-{HHmm}.json`。用 `.json` 副檔名（相容性最好，各 App 的分享/選檔功能都認得）。

**技術限制（已與使用者確認）**：透過系統分享面板（`expo-sharing`）匯出時，使用者實際選了存到哪裡，系統不會回傳給 App，因此無法在完成通知裡顯示確切路徑；只有「存到本機（自行選資料夾）」模式，因為是 App 自己寫入使用者選定的資料夾，才能在完成通知裡顯示確切路徑。

## 4. 匯出流程

1. 使用者在「我的」頁按「匯出資料」，跳出選單：「分享」／「存到本機」。
2. **存到本機**：呼叫 Android Storage Access Framework（`expo-file-system` legacy API 的 `StorageAccessFramework.requestDirectoryPermissionsAsync()`）叫出系統資料夾選擇器，使用者選定資料夾並確認後，才開始下一步。
   **分享**：不需先選位置，直接進入下一步。
3. 顯示進度條 modal。`backupService.exportBackup(onProgress)` 依序：
   - 讀 `storage.getItems()` / `getHistory()` / `getAppState()`
   - 逐筆處理 item：用 `FileSystem.readAsStringAsync(photoUri, { encoding: 'base64' })` 讀取照片轉 base64，每處理完一筆呼叫 `onProgress(當前筆數, 總筆數)` 更新進度條
   - 組成第 3 節的 JSON 物件
4. 寫入檔案：
   - **存到本機**：用 `StorageAccessFramework.createFileAsync()` 在使用者選定的資料夾建立檔案並寫入 JSON 內容，寫完後關閉進度條，Alert 顯示「已匯出，存於：{資料夾顯示名稱}/{檔名}」
   - **分享**：先寫入 `FileSystem.cacheDirectory` 下的暫存檔，關閉進度條，呼叫 `expo-sharing` 的 `shareAsync()` 叫出分享面板；分享面板關閉後刪除暫存檔（`deleteAsync`），Alert 顯示「已透過分享完成匯出」

## 5. 匯入流程

1. 使用者按「匯入資料」，用 `expo-document-picker` 選一個 `.json` 檔（系統選檔器本身可存取本機檔案與雲端同步資料夾，不需額外做本機/分享的選擇）。
2. 讀檔、`JSON.parse`。檢查 `schemaVersion` 是否認得，格式不符就跳錯誤 Alert 中止，不動任何現有資料。
3. 若本機目前已有資料（`items` 或 `history` 非空），跳出 Alert 讓使用者選「覆蓋」或「合併」；本機沒有任何資料時直接視為覆蓋，不額外詢問。
4. 顯示進度條 modal。`backupService.importBackup(parsed, mode, onProgress)` 依序：
   - 逐筆處理匯入檔中的 item：把 `photoBase64` 解碼寫回本機 `photos/` 目錄（沿用 `photoStorageService` 的檔名規則），重建 `photoUri`，每處理完一筆呼叫 `onProgress`
5. 套用結果：
   - **覆蓋模式**：`items`／`history`／`appState` 全部用匯入檔內容整批取代
   - **合併模式**：`items`／`history` 依 `id` 合併——匯入檔裡有的 `id`，一律以匯入檔內容覆蓋本機同 `id` 那筆；本機獨有的 `id` 保留。`appState`（主題色、音效、條件文字等單一設定值）維持本機現有設定不變，不參與合併
6. 寫回 `storage.saveItems()` / `saveHistory()` /（覆蓋模式才）`saveAppState()`，關閉進度條，Alert 顯示「已匯入 {N} 筆單品」，並重新載入畫面資料。

## 6. 錯誤處理

- 讀寫檔案、Storage Access Framework 授權被拒、JSON 格式錯誤、`schemaVersion` 不相容：一律 `try/catch` 攔截，跳 Alert 顯示明確錯誤訊息，不讓例外往外拋、不留下部分寫入的髒資料（匯入時，只有整批解析與轉換都成功後才呼叫 `storage.saveItems`/`saveHistory`/`saveAppState` 寫入，不會發生寫到一半失敗的情況）。
- 使用者在分享面板或資料夾選擇器中途取消：視為正常取消操作，不顯示錯誤 Alert，直接關閉進度條、恢復原狀。

## 7. 依賴套件

新增兩個標準 Expo 套件（需 `npx expo install` 並重新本機 build）：
- `expo-sharing`（分享面板）
- `expo-document-picker`（匯入選檔）

`Storage Access Framework` 是既有 `expo-file-system` 套件內建的 API，不需額外安裝。

## 8. 測試計畫

延續專案現有的 Jest + Testing Library 慣例（參照 `src/__tests__/`）：

- `backupService.test.ts`：
  - 匯出：組出的 JSON 結構正確、照片正確轉 base64、`schemaVersion`/`exportedAt` 存在
  - 匯入覆蓋模式：整批取代 items/history/appState
  - 匯入合併模式：id 相同以匯入檔為準覆蓋、本機獨有 id 保留、appState 維持本機原值不變
  - `schemaVersion` 不相容時擋下並回傳/拋出明確錯誤，不寫入任何資料
  - 進度回呼（`onProgress`）在處理過程中被正確呼叫
- `me.test.tsx`：新增「匯出資料」「匯入資料」按鈕的互動測試（呼叫對應 service、進度條顯示/關閉、結果 Alert 內容），比照現有 `me.test.tsx` 對其他設定項目的測試寫法
- 檔案系統相關（`expo-file-system`、`expo-sharing`、`expo-document-picker`）沿用專案既有的 `src/__mocks__/` mock 模式，新增對應 mock 檔

## 9. 範圍外（本次不做）

- iOS 支援（目前專案未設定 iOS 平台）
- 自動定期備份／排程
- zip 壓縮打包（改用 base64 內嵌 JSON，理由見前次技術討論：資料規模是個人使用等級，避免引入原生壓縮依賴）
