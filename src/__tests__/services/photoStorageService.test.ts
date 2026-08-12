import * as FileSystem from 'expo-file-system/legacy';
import { persistPhotoFromBase64Async } from '../../services/photoStorageService';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'mock://document/',
  cacheDirectory: 'mock://cache/',
  EncodingType: {
    UTF8: 'utf8',
    Base64: 'base64',
  },
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  StorageAccessFramework: {
    requestDirectoryPermissionsAsync: jest
      .fn()
      .mockResolvedValue({ granted: true, directoryUri: 'mock://tree/primary:Download' }),
    createFileAsync: jest.fn((directoryUri: string, filename: string) =>
      Promise.resolve(`${directoryUri}/${filename}`)
    ),
  },
}));

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
