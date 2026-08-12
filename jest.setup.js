// Re-register our custom expo-file-system mock after jest-expo's setupFiles runs.
// jest-expo's setupFiles explicitly calls jest.mock('expo-file-system', {...})
// with a partial mock, and explicit jest.mock() calls take precedence over moduleNameMapper.
// This setupFilesAfterEnv hook runs after setupFiles, allowing us to override with our complete mock.
jest.mock('expo-file-system/legacy', () => jest.requireActual('./src/__mocks__/expo-file-system'));
