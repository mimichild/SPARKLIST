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
