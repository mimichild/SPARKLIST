// Re-register our custom expo-file-system mock after jest-expo's setupFiles runs.
// jest-expo's setupFiles explicitly calls jest.mock('expo-file-system', {...})
// with a partial mock, and explicit jest.mock() calls take precedence over moduleNameMapper.
// This setupFilesAfterEnv hook runs after setupFiles, allowing us to override with our complete mock.
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
