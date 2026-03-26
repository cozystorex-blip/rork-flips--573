import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Linking } from 'react-native';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export async function checkPhotoPermission(): Promise<PermissionStatus> {
  if (Platform.OS === 'web') return 'granted';
  const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
  console.log('[Upload] Current photo permission:', status);
  return status as PermissionStatus;
}

export async function requestPhotoPermission(): Promise<PermissionStatus> {
  if (Platform.OS === 'web') return 'granted';
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  console.log('[Upload] Requested photo permission:', status);
  return status as PermissionStatus;
}

export function openAppSettings(): void {
  if (Platform.OS === 'ios') {
    void Linking.openURL('app-settings:');
  } else if (Platform.OS === 'android') {
    void Linking.openSettings();
  }
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIN_DIMENSION = 200;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/jpg'];

export async function pickAndCropAvatar(): Promise<{ uri: string; width: number; height: number } | null> {
  console.log('[Upload] Requesting image picker for avatar');

  const permStatus = await requestPhotoPermission();
  if (permStatus !== 'granted') {
    console.log('[Upload] Permission denied');
    throw new PermissionDeniedError('Photo access is required for custom uploads. You can still use a preset avatar.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) {
    console.log('[Upload] User cancelled picker');
    return null;
  }

  const asset = result.assets[0];
  console.log('[Upload] Image picked:', asset.width, 'x', asset.height, 'size:', asset.fileSize, 'type:', asset.mimeType);

  if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
    throw new ValidationError('Image is too large. Maximum size is 5MB.');
  }

  const mimeType = (asset.mimeType ?? '').toLowerCase();
  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new ValidationError('Unsupported format. Please use JPG, PNG, or WebP.');
  }

  if (!asset.width || !asset.height || asset.width < 1 || asset.height < 1) {
    throw new ValidationError('Could not read image dimensions. The file may be corrupt.');
  }

  const minDim = Math.min(asset.width, asset.height);
  if (minDim < MIN_DIMENSION) {
    throw new ValidationError(`Image is too small (${asset.width}×${asset.height}). Minimum size is ${MIN_DIMENSION}×${MIN_DIMENSION}.`);
  }

  const aspectRatio = asset.width / asset.height;
  if (aspectRatio > 4 || aspectRatio < 0.25) {
    throw new ValidationError('Please choose a clear profile-style photo. This image is too wide or too tall for an avatar.');
  }

  let targetSize = 512;
  if (minDim < 512) {
    targetSize = Math.max(MIN_DIMENSION, minDim);
  }

  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: targetSize, height: targetSize } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
  );

  console.log('[Upload] Avatar cropped to:', manipulated.width, 'x', manipulated.height);
  return { uri: manipulated.uri, width: manipulated.width, height: manipulated.height };
}

export class PermissionDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const AVATARS_DIR = Platform.OS !== 'web'
  ? `${FileSystem.documentDirectory ?? ''}avatars/`
  : '';

async function ensureAvatarsDir(): Promise<void> {
  if (Platform.OS === 'web') return;
  const dirInfo = await FileSystem.getInfoAsync(AVATARS_DIR);
  if (!dirInfo.exists) {
    console.log('[Upload] Creating avatars directory');
    await FileSystem.makeDirectoryAsync(AVATARS_DIR, { intermediates: true });
  }
}

export async function uploadAvatarToSupabase(uri: string, userId: string): Promise<string> {
  console.log('[Upload] Persisting avatar for user:', userId);

  if (Platform.OS === 'web') {
    console.log('[Upload] Web platform — using original URI directly');
    return uri;
  }

  try {
    await ensureAvatarsDir();
    const filename = `avatar_${userId}_${Date.now()}.jpg`;
    const destUri = `${AVATARS_DIR}${filename}`;

    await FileSystem.copyAsync({ from: uri, to: destUri });

    const check = await FileSystem.getInfoAsync(destUri);
    if (!check.exists) {
      console.log('[Upload] Avatar copy verification failed, using original URI');
      return uri;
    }

    console.log('[Upload] Avatar persisted locally:', destUri);
    return destUri;
  } catch (e) {
    console.log('[Upload] Local avatar persist failed, using original URI:', e);
    return uri;
  }
}

export async function pickBlockImage(): Promise<{ uri: string } | null> {
  console.log('[Upload] Requesting image picker for block');
  const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permResult.granted) {
    throw new Error('Permission to access photos is required.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) {
    throw new Error('Image is too large. Maximum size is 8MB.');
  }

  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: 800 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  );

  return { uri: manipulated.uri };
}

const BLOCKS_DIR = Platform.OS !== 'web'
  ? `${FileSystem.documentDirectory ?? ''}block_images/`
  : '';

async function ensureBlocksDir(): Promise<void> {
  if (Platform.OS === 'web') return;
  const dirInfo = await FileSystem.getInfoAsync(BLOCKS_DIR);
  if (!dirInfo.exists) {
    console.log('[Upload] Creating block_images directory');
    await FileSystem.makeDirectoryAsync(BLOCKS_DIR, { intermediates: true });
  }
}

export async function uploadBlockImageToSupabase(uri: string, userId: string): Promise<string> {
  console.log('[Upload] Persisting block image for user:', userId);

  if (Platform.OS === 'web') {
    console.log('[Upload] Web platform — using original URI directly');
    return uri;
  }

  try {
    await ensureBlocksDir();
    const filename = `block_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.jpg`;
    const destUri = `${BLOCKS_DIR}${filename}`;

    await FileSystem.copyAsync({ from: uri, to: destUri });

    const check = await FileSystem.getInfoAsync(destUri);
    if (!check.exists) {
      console.log('[Upload] Block image copy verification failed, using original URI');
      return uri;
    }

    console.log('[Upload] Block image persisted locally:', destUri);
    return destUri;
  } catch (e) {
    console.log('[Upload] Local block image persist failed, using original URI:', e);
    return uri;
  }
}

export function isValidImageUrl(url: string): boolean {
  if (!url.trim()) return false;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const ext = parsed.pathname.toLowerCase();
    return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') ||
           ext.endsWith('.gif') || ext.endsWith('.webp') || url.includes('unsplash.com') ||
           url.includes('images.') || url.startsWith('https://');
  } catch {
    return false;
  }
}
