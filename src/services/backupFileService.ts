import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

export async function shareBackupFile(content: string, filename: string): Promise<void> {
  const tempUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(tempUri, content, { encoding: FileSystem.EncodingType.UTF8 });
  // 不在這裡刪除暫存檔：Android 上有些接收端 App（例如 Gmail、雲端硬碟）是在
  // 分享面板關閉、這個函式已經 resolve 之後才延遲讀取附件內容，這裡若立刻刪檔
  // 會把使用者剛剛看到「已完成」的檔案截斷成空檔。改由 cleanupStaleBackupTempFiles()
  // 在下一次匯出開始時清掉，確保刪除發生在檔案不可能還在被使用的時候。
  await Sharing.shareAsync(tempUri, { mimeType: 'application/json' });
}

// 比對 backupService.buildBackupFilename 產生的檔名格式：
// SPARKLIST-備份-{yyyyMMdd}-{HHmm}.json
const STALE_BACKUP_FILENAME_PATTERN = /^SPARKLIST-備份-\d{8}-\d{4}\.json$/;

// 清掉快取目錄裡殘留的舊備份暫存檔（shareBackupFile 寫入但不再自己刪除的檔案）。
// 在下一次匯出「開始」時呼叫——此時前一次的分享/寫入流程必然早已結束，刪除是安全的。
// 讀目錄或刪檔失敗都吞掉，清理只是盡力而為，不該擋住正在進行的匯出。
export async function cleanupStaleBackupTempFiles(): Promise<void> {
  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) {
    return;
  }

  let filenames: string[];
  try {
    filenames = await FileSystem.readDirectoryAsync(cacheDirectory);
  } catch {
    return;
  }

  const staleFilenames = filenames.filter((name) => STALE_BACKUP_FILENAME_PATTERN.test(name));

  await Promise.all(
    staleFilenames.map((name) =>
      FileSystem.deleteAsync(`${cacheDirectory}${name}`, { idempotent: true }).catch(() => undefined)
    )
  );
}

export interface RequestBackupFolderResult {
  directoryUri: string;
  folderDisplayName: string;
}

// 只負責叫出資料夾選擇器並取得授權，不做任何寫入。讓呼叫端可以先確認使用者
// 選好資料夾（或取消），再開始耗時的備份資料組裝，符合「先選位置，才開始
// 顯示進度條做事」的匯出流程設計。
export async function requestBackupFolder(): Promise<RequestBackupFolderResult | null> {
  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  return {
    directoryUri: permission.directoryUri,
    folderDisplayName: extractFolderDisplayName(permission.directoryUri),
  };
}

// 把內容寫入一個「已經取得授權」的資料夾（directoryUri 來自 requestBackupFolder）。
// 不重複做授權請求。
export async function writeBackupToFolder(directoryUri: string, content: string, filename: string): Promise<void> {
  const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(directoryUri, filename, 'application/json');
  await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
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
  // MIME 篩選刻意放寬：雲端硬碟同步回來的檔案常被系統誤判成
  // application/octet-stream 或 text/plain，篩選太嚴會讓使用者自己匯出的
  // 備份檔在選檔器裡直接「看不到」。parseBackupPayload 對非備份檔已經有
  // 清楚的中文錯誤訊息，放寬篩選是安全的，壞檔案還是會在下一步被擋下。
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }
  return FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
}
