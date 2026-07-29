export const MediaTypeOptions = { Images: 'Images' };

export const requestMediaLibraryPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const requestCameraPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const launchImageLibraryAsync = jest.fn().mockResolvedValue({
  canceled: false,
  assets: [{ uri: 'mock://photo.jpg' }],
});
export const launchCameraAsync = jest.fn().mockResolvedValue({
  canceled: false,
  assets: [{ uri: 'mock://photo.jpg' }],
});
