export const MediaTypeOptions = { Images: 'Images' };

export const requestMediaLibraryPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const requestCameraPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
// Distinct non-square dimensions per source so tests can verify the picked
// photo's own aspect ratio (not a hardcoded 1:1) flows through to the UI.
export const launchImageLibraryAsync = jest.fn().mockResolvedValue({
  canceled: false,
  assets: [{ uri: 'mock://photo.jpg', width: 900, height: 1200 }],
});
export const launchCameraAsync = jest.fn().mockResolvedValue({
  canceled: false,
  assets: [{ uri: 'mock://photo.jpg', width: 1200, height: 900 }],
});
