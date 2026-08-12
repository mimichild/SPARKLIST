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

// 匯入流程用：把備份檔裡的 base64 照片內容寫回本機的永久儲存目錄，
// 產生一個新的 photoUri（不能沿用匯出檔裡的路徑，裝置間路徑不通用）。
export async function persistPhotoFromBase64Async(base64: string, extension = '.jpg'): Promise<string> {
  await ensurePhotosDirAsync();

  const fileName = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;
  const destination = `${PHOTOS_DIR}${fileName}`;

  await FileSystem.writeAsStringAsync(destination, base64, { encoding: FileSystem.EncodingType.Base64 });

  return destination;
}
