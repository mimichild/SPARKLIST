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
