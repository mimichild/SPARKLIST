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
  it('使用者選擇檔案後回傳檔案內容字串，且用寬鬆的 MIME 篩選（涵蓋雲端同步常見的誤判類型）並複製到快取目錄', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'mock://picked/backup.json', name: 'backup.json' }],
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce('{"a":1}');

    const content = await pickBackupFile();

    expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith({
      type: ['application/json', 'text/plain', 'application/octet-stream'],
      copyToCacheDirectory: true,
    });
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
