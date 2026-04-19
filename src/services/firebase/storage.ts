import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

export async function uploadPhoto(
  userId: string,
  itemId: string,
  localUri: string,
  type: 'original' | 'thumbnail',
): Promise<string> {
  const ext = localUri.split('.').pop() ?? 'jpg';
  const path = `users/${userId}/items/${itemId}/${type}.${ext}`;
  const storageRef = ref(storage, path);

  const response = await fetch(localUri);
  const blob = await response.blob();
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function deletePhoto(userId: string, itemId: string, type: 'original' | 'thumbnail') {
  const pathJpg = `users/${userId}/items/${itemId}/${type}.jpg`;
  try {
    await deleteObject(ref(storage, pathJpg));
  } catch {
    // ignore not-found errors
  }
}

export async function compressToThumbnail(localUri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 300 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

export async function deleteLocalPhoto(localUri: string) {
  try {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  } catch {
    // ignore
  }
}
