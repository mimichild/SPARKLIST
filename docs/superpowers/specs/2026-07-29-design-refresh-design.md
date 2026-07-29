# SPARK LIST 視覺設計套用 設計文件

日期：2026-07-29
狀態：已通過使用者確認，待寫入實作計畫

## 1. 產品概述

SPARKLIST 的五個畫面（我的、冷靜區、解鎖區、新增單品、單品詳情）目前是功能優先完成的，配色、間距、圓角、陰影都是各自寫死、未經統一設計。本次工作是把 `~/Documents/design-spec.md`（從 SPARK 系列既有 App 萃取出的共同視覺語言）套用到 SPARKLIST，讓視覺風格與系列其他 App 一致。

本次**只調整視覺樣式**（顏色、間距、圓角、陰影、字級、Tab bar 樣式），不新增功能、不改動任何業務邏輯或資料流。

## 2. 套用架構

擴充現有的 `src/constants/theme.ts`，新增／調整以下常數，所有畫面與共用元件改為引用這些常數，取代目前散落在各檔案裡的寫死數值：

- `THEME_COLOR_OPTIONS` / `DEFAULT_THEME_COLOR`（既有，本次改色票內容）
- `getContrastColor(hex)`（新增）：依亮度公式回傳 `#FFFFFF` 或 `#2D2D2D`，供文字疊在主題色色塊上時使用
- `COLORS`（新增）：背景、卡片背景、主文字、次要文字、邊框等固定色
- `SPACING`（新增）：常用 `paddingHorizontal`/`paddingVertical` 數值
- `RADIUS`（新增）：卡片、按鈕、大卡片、圓形/膠囊四種圓角級距
- `SHADOW`（新增）：一般卡片的陰影組合（iOS shadow + Android elevation）
- `TYPE_SCALE`（新增）：五級字級

不引入 ThemeProvider/Context——現有的 `useAppStore`（zustand）已經管理主題色狀態，維持現況即可。

## 3. Design Tokens

### 3.1 顏色

**主題色（使用者可於「我的」頁面切換，既有功能不變，本次只換色票內容）**

```ts
export const THEME_COLOR_OPTIONS: string[] = [
  '#EAAFB3', // 珊瑚粉（預設）
  '#f1aba7', // 櫻花粉
  '#A8D5C2', // 薄荷綠
  '#a7c7e7', // 霧藍
  '#d9b8a7', // 奶茶棕
  '#8B3A42', // 酒紅
  '#111111', // 黑
  '#495057', // 質感灰
];
export const DEFAULT_THEME_COLOR = THEME_COLOR_OPTIONS[0];
```

**固定色**

| 用途 | 數值 |
|---|---|
| 畫面背景 | `#faf9f7`（暖白） |
| 卡片背景 | `#FFFFFF` |
| 主文字 | `#2D2D2D` |
| 次要文字 | `#9A9A9A` |
| 邊框/分隔線 | `#F0E2E3` |

**對比色函式**

```ts
export function getContrastColor(hex: string): '#FFFFFF' | '#2D2D2D' {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#2D2D2D' : '#FFFFFF';
}
```

本次設計文件後續所有畫面說明，均以**預設珊瑚粉 `#EAAFB3`** 為基準描述視覺效果；使用者切換其他主題色後，畫面透過 `getContrastColor` 等既有機制自動適配，不需要為每個色票另外設計。

### 3.2 間距／圓角／陰影／字級

| Token | 值 |
|---|---|
| `SPACING.horizontal` | `16` |
| `SPACING.vertical` (small/medium/large) | `10` / `12` / `16` |
| `RADIUS.card` | `12` |
| `RADIUS.large`（大卡片/Modal） | `18` |
| `RADIUS.pill`（圓形頭像/膠囊按鈕） | `24`+ |
| `SHADOW.card` | `shadowOpacity: 0.15, shadowRadius: 6, elevation: 3`，`shadowColor` 用當前主題色（不是純黑） |
| `TYPE_SCALE.caption` | `12` |
| `TYPE_SCALE.small` | `14` |
| `TYPE_SCALE.body` | `16` |
| `TYPE_SCALE.subtitle` | `20` |
| `TYPE_SCALE.title` | `24` |

## 4. Tab Bar（`app/(tabs)/_layout.tsx`）

- 維持純文字分頁，不引入 icon 套件（`tabBarIcon: () => null`）
- `tabBarActiveTintColor` 綁定 `useAppStore` 的 `themeColor`（目前未綁定，選中分頁沿用系統預設藍色，本次修正）
- `tabBarInactiveTintColor` 固定 `#999`
- 分頁列背景 `#FFFFFF`，上緣加一條 `#F0E2E3` 分隔線
- 高度：base `50` + 底部安全區（`useSafeAreaInsets().bottom`）。目前 Android／iOS 皆無廣告列，安全區永遠補滿，不做條件判斷

## 5. 各畫面調整

**我的**：段位卡片（`RankBadge` 外層）改為白底、`RADIUS.card`、`SHADOW.card`；主題色選色從方形色塊改為圓形（直徑 `32`），選中狀態外圈套用 `getContrastColor` 反推的框線色；統計數字（累計放棄次數／估計省下金額）包成同樣風格的卡片；條件編輯的六個 `TextInput` 加上 `RADIUS.card` 圓角邊框與 `SPACING.vertical` 間距

**冷靜區／解鎖區**：`ItemCard` 改為白底、`RADIUS.card`、`SHADOW.card`（陰影色用主題色），內部 padding 統一用 `SPACING.horizontal`/`SPACING.vertical`；空狀態文字置中、套用次要文字色、上下留白加大；「新增單品」按鈕改為主題色底的膠囊按鈕（`RADIUS.pill`），文字色用 `getContrastColor(themeColor)` 決定

**新增單品／單品詳情**：所有 `TextInput` 統一 `RADIUS.card` 圓角邊框、`SPACING` 間距；`ConditionChecklist` 每列間距加大、勾選數量摘要文字改用 `TYPE_SCALE.caption` + 次要文字色；送出按鈕比照「新增單品」按鈕改為主題色膠囊按鈕

## 6. 排除範圍（此版本不做）

- 不加入 `@expo/vector-icons` 或任何 icon 套件（沿用 SPARKLIST/SPARKPLATE/SPARKWEAR 的純文字分頁慣例）
- 不加入使用者可切換字型功能（SPARKWEAR 的進階功能，本次僅專注視覺風格套用）
- 不實作深色模式（規範明確指出全系列皆為 Light Mode Only）
- **不處理廣告列與 Tab bar 安全區的耦合邏輯**：目前 Android／iOS 皆無廣告，安全區固定補滿。日後 iOS 版加入廣告列時，需要依照 `design-spec.md` 第 7 節的邏輯（有廣告時不補安全區、讓廣告列頂著；無廣告時才補）重新調整這裡的 tab bar 高度計算，屆時需要另外排入計畫，不在本次範圍內
- 不改動任何業務邏輯、資料流、Zustand store 的資料結構（`themeColor` 欄位型別不變，只有色票的內容值改變）

## 7. 測試策略

視覺樣式調整以現有的元件/畫面測試為基礎，重點驗證：

- 各畫面在替換 tokens 後仍正確渲染既有文字內容（既有測試斷言文字內容的部分應維持通過）
- `getContrastColor` 為純函式，需要獨立單元測試涵蓋亮／暗兩種輸入的邊界情況
- Tab bar 的 `tabBarActiveTintColor` 綁定主題色需要驗證會隨 `useAppStore` 的 `themeColor` 變化
- 不需要新增視覺回歸快照測試（專案目前未採用 snapshot testing 慣例），以現有的「文字內容/樣式屬性斷言」測試風格為主
