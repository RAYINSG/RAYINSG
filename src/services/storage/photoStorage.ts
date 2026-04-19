import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

// App 專屬永久目錄，App 重裝前不會消失
const THUMB_DIR = (FileSystem.documentDirectory ?? '') + 'thumbnails/';

async function ensureThumbDir() {
  const info = await FileSystem.getInfoAsync(THUMB_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(THUMB_DIR, { intermediates: true });
  }
}

// 產生並永久儲存縮圖，回傳本機路徑
export async function saveThumbnail(sourceUri: string, itemId: string): Promise<string> {
  await ensureThumbDir();

  const compressed = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: 400 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
  );

  const destPath = THUMB_DIR + itemId + '.jpg';
  await FileSystem.copyAsync({ from: compressed.uri, to: destPath });
  return destPath;
}

// 刪除原圖（只刪 App cache 裡的，不動相簿）
export async function deleteOriginalPhoto(photoUri: string) {
  try {
    const cacheDir = FileSystem.cacheDirectory ?? '';
    const docDir = FileSystem.documentDirectory ?? '';
    if (cacheDir && photoUri.startsWith(cacheDir) ||
        docDir && photoUri.startsWith(docDir)) {
      await FileSystem.deleteAsync(photoUri, { idempotent: true });
    }
  } catch {
    // 忽略刪除失敗（例如檔案已不存在）
  }
}

// 讀取縮圖是否存在
export async function thumbnailExists(itemId: string): Promise<boolean> {
  const path = THUMB_DIR + itemId + '.jpg';
  const info = await FileSystem.getInfoAsync(path);
  return info.exists;
}

export function getThumbnailPath(itemId: string): string {
  return THUMB_DIR + itemId + '.jpg';
}

// 刪除物品時一併清理縮圖
export async function deleteThumbnail(itemId: string) {
  try {
    await FileSystem.deleteAsync(THUMB_DIR + itemId + '.jpg', { idempotent: true });
  } catch {
    // ignore
  }
}
