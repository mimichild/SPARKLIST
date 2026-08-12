import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  shareBackupFile,
  requestBackupFolder,
  writeBackupToFolder,
  cleanupStaleBackupTempFiles,
  pickBackupFile,
  extractFolderDisplayName,
} from '../../services/backupFileService';

beforeEach(() => {
  jest.clearAllMocks();
  (FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: true,
    directoryUri: 'mock://tree/primary:Download',
  });
  (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([]);
});

describe('backupFileService.shareBackupFile', () => {
  it('把內容寫入暫存檔、叫出分享面板；不會在函式內刪除暫存檔（避免分享中途被刪除）', async () => {
    await shareBackupFile('{"a":1}', 'backup.json');

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith('mock://cache/backup.json', '{"a":1}', {
      encoding: FileSystem.EncodingType.UTF8,
    });
    expect(Sharing.shareAsync).toHaveBeenCalledWith('mock://cache/backup.json', { mimeType: 'application/json' });
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });

  it('分享失敗時往外拋出錯誤，且同樣不刪除暫存檔', async () => {
    (Sharing.shareAsync as jest.Mock).mockRejectedValueOnce(new Error('分享失敗'));

    await expect(shareBackupFile('{}', 'backup.json')).rejects.toThrow('分享失敗');
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });
});

describe('backupFileService.cleanupStaleBackupTempFiles', () => {
  it('刪除快取目錄下符合備份檔命名格式的殘留暫存檔', async () => {
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValueOnce([
      'SPARKLIST-備份-20260101-0000.json',
      'SPARKLIST-備份-20260812-1530.json',
      'not-a-backup-file.json',
      'random.txt',
    ]);

    await cleanupStaleBackupTempFiles();

    expect(FileSystem.readDirectoryAsync).toHaveBeenCalledWith(FileSystem.cacheDirectory);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('mock://cache/SPARKLIST-備份-20260101-0000.json', {
      idempotent: true,
    });
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('mock://cache/SPARKLIST-備份-20260812-1530.json', {
      idempotent: true,
    });
    expect(FileSystem.deleteAsync).not.toHaveBeenCalledWith(
      expect.stringContaining('not-a-backup-file'),
      expect.anything()
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(2);
  });

  it('目錄底下沒有任何檔案時不做任何事、不拋出錯誤', async () => {
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValueOnce([]);

    await expect(cleanupStaleBackupTempFiles()).resolves.toBeUndefined();
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });

  it('讀取目錄失敗時吞掉錯誤，不往外拋出（清理是盡力而為，不該擋住匯出流程）', async () => {
    (FileSystem.readDirectoryAsync as jest.Mock).mockRejectedValueOnce(new Error('讀取目錄失敗'));

    await expect(cleanupStaleBackupTempFiles()).resolves.toBeUndefined();
  });
});

describe('backupFileService.requestBackupFolder', () => {
  it('使用者選定資料夾後，回傳 directoryUri 與資料夾顯示名稱', async () => {
    const result = await requestBackupFolder();

    expect(FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync).toHaveBeenCalled();
    expect(result).toEqual({ directoryUri: 'mock://tree/primary:Download', folderDisplayName: 'Download' });
  });

  it('使用者取消資料夾選擇時回傳 null', async () => {
    (FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
    });

    const result = await requestBackupFolder();

    expect(result).toBeNull();
  });
});

describe('backupFileService.writeBackupToFolder', () => {
  it('把內容寫入指定的（已授權）資料夾', async () => {
    await writeBackupToFolder('mock://tree/primary:Download', '{"a":1}', 'backup.json');

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
  });

  it('不會再自己呼叫資料夾授權（授權已經是呼叫端先做好的事）', async () => {
    await writeBackupToFolder('mock://tree/primary:Download', '{}', 'backup.json');

    expect(FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync).not.toHaveBeenCalled();
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
