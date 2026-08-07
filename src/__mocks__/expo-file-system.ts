export const documentDirectory = 'mock://document/';

export const getInfoAsync = jest.fn().mockResolvedValue({ exists: true });
export const makeDirectoryAsync = jest.fn().mockResolvedValue(undefined);
export const copyAsync = jest.fn().mockResolvedValue(undefined);
