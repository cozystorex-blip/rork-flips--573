import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const SCAN_IMAGES_DIR = `${FileSystem.documentDirectory ?? ''}scan_images/`;

async function ensureDir(): Promise<void> {
  if (Platform.OS === 'web') return;
  const dirInfo = await FileSystem.getInfoAsync(SCAN_IMAGES_DIR);
  if (!dirInfo.exists) {
    console.log('[ImagePersistence] Creating scan_images directory');
    await FileSystem.makeDirectoryAsync(SCAN_IMAGES_DIR, { intermediates: true });
  }
}

const MAX_PERSIST_RETRIES = 2;

export async function persistScanImage(tempUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    console.log('[ImagePersistence] Web platform — using original URI');
    return tempUri;
  }

  for (let attempt = 1; attempt <= MAX_PERSIST_RETRIES; attempt++) {
    try {
      await ensureDir();

      const ext = tempUri.split('.').pop()?.split('?')[0] ?? 'jpg';
      const filename = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const destUri = `${SCAN_IMAGES_DIR}${filename}`;

      console.log(`[ImagePersistence] Copying image attempt ${attempt}/${MAX_PERSIST_RETRIES}:`, destUri);
      await FileSystem.copyAsync({ from: tempUri, to: destUri });

      const check = await FileSystem.getInfoAsync(destUri);
      if (!check.exists) {
        console.log('[ImagePersistence] Copy verification failed on attempt', attempt);
        if (attempt < MAX_PERSIST_RETRIES) {
          await new Promise(r => setTimeout(r, 300));
          continue;
        }
        console.log('[ImagePersistence] All attempts failed verification, using original URI');
        return tempUri;
      }

      console.log('[ImagePersistence] Image persisted successfully:', destUri);
      return destUri;
    } catch (error) {
      console.log(`[ImagePersistence] Attempt ${attempt} failed:`, error);
      if (attempt < MAX_PERSIST_RETRIES) {
        await new Promise(r => setTimeout(r, 300));
        continue;
      }
    }
  }

  console.log('[ImagePersistence] All persist attempts failed, using original URI');
  return tempUri;
}

export async function deleteScanImage(uri: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!uri || !uri.startsWith(SCAN_IMAGES_DIR)) return;

  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      console.log('[ImagePersistence] Deleted persisted image:', uri);
    }
  } catch (error) {
    console.log('[ImagePersistence] Failed to delete image:', error);
  }
}
