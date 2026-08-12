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
