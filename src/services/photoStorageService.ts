import * as FileSystem from 'expo-file-system/legacy';

const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;

async function ensurePhotosDirAsync(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
}

// expo-image-picker and expo-image-manipulator both write their output into
// the OS-managed cache directory, which iOS/Android are free to purge under
// storage pressure — that's why photos vanish days after an item is added.
// Copying the file into the app's document directory (never auto-purged)
// right after it's picked/cropped is what makes the photo stick around.
export async function persistPhotoAsync(sourceUri: string): Promise<string> {
  await ensurePhotosDirAsync();

  const extensionMatch = sourceUri.match(/\.[a-zA-Z0-9]+($|\?)/);
  const extension = extensionMatch ? extensionMatch[0].replace(/\?$/, '') : '.jpg';
  const fileName = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;
  const destination = `${PHOTOS_DIR}${fileName}`;

  await FileSystem.copyAsync({ from: sourceUri, to: destination });

  return destination;
}
