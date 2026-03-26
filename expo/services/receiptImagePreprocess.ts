import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface PreprocessedImage {
  uri: string;
  base64: string;
  width: number;
  height: number;
  sizeKB: number;
}

export type ImageScanMode = 'receipt' | 'smart' | 'auto';

const MAX_BASE64_SIZE_KB = 4000;
const JPEG_QUALITY_HIGH = 0.92;
const JPEG_QUALITY_MED = 0.80;
const JPEG_QUALITY_LOW = 0.65;

function getTargetWidth(width: number, height: number, mode: ImageScanMode): number {
  const aspectRatio = width / height;
  if (mode === 'receipt') {
    const isLong = aspectRatio < 0.4 || height > width * 3;
    return isLong ? 1200 : 1600;
  }
  if (mode === 'smart') {
    return 1800;
  }
  const isLong = aspectRatio < 0.4 || height > width * 3;
  return isLong ? 1200 : 1500;
}

export async function preprocessReceiptImage(imageUri: string, mode: ImageScanMode = 'auto'): Promise<PreprocessedImage> {
  console.log('[ImagePreprocess] Starting for mode:', mode, 'uri:', imageUri.substring(0, 80));

  let initial;
  try {
    initial = await manipulateAsync(
      imageUri,
      [],
      { compress: 1.0, format: SaveFormat.JPEG, base64: true }
    );
  } catch (err) {
    console.log('[ImagePreprocess] Initial read failed:', err);
    throw new Error('Failed to read image. The file may be corrupted or inaccessible.');
  }

  if (!initial.base64) {
    throw new Error('Failed to read image data during preprocessing');
  }

  const targetWidth = getTargetWidth(initial.width, initial.height, mode);

  console.log('[ImagePreprocess] Original:', initial.width, 'x', initial.height, 'target:', targetWidth, 'mode:', mode);

  const needsResize = initial.width > targetWidth * 1.15;
  const actions = needsResize ? [{ resize: { width: targetWidth } }] : [];

  let quality = JPEG_QUALITY_HIGH;
  const originalSizeKB = Math.round((initial.base64.length * 3) / 4 / 1024);
  console.log('[ImagePreprocess] Estimated original size:', originalSizeKB, 'KB');

  if (originalSizeKB > MAX_BASE64_SIZE_KB) {
    quality = JPEG_QUALITY_MED;
  }
  if (originalSizeKB > MAX_BASE64_SIZE_KB * 1.5) {
    quality = JPEG_QUALITY_LOW;
  }

  let processed;
  try {
    processed = await manipulateAsync(
      imageUri,
      actions,
      { compress: quality, format: SaveFormat.JPEG, base64: true }
    );
  } catch (err) {
    console.log('[ImagePreprocess] Compression failed:', err);
    throw new Error('Failed to process image. Try a different photo.');
  }

  if (!processed.base64) {
    throw new Error('Failed to generate base64 after compression');
  }

  const finalSizeKB = Math.round((processed.base64.length * 3) / 4 / 1024);
  console.log('[ImagePreprocess] Processed:', processed.width, 'x', processed.height, 'size:', finalSizeKB, 'KB', 'quality:', quality);

  if (finalSizeKB > MAX_BASE64_SIZE_KB) {
    console.log('[ImagePreprocess] Still too large, applying aggressive compression');
    try {
      const aggressive = await manipulateAsync(
        imageUri,
        [{ resize: { width: Math.min(1000, targetWidth) } }],
        { compress: JPEG_QUALITY_LOW, format: SaveFormat.JPEG, base64: true }
      );
      if (aggressive.base64) {
        const aggressiveSizeKB = Math.round((aggressive.base64.length * 3) / 4 / 1024);
        console.log('[ImagePreprocess] Aggressive result:', aggressive.width, 'x', aggressive.height, 'size:', aggressiveSizeKB, 'KB');
        return {
          uri: aggressive.uri,
          base64: aggressive.base64,
          width: aggressive.width,
          height: aggressive.height,
          sizeKB: aggressiveSizeKB,
        };
      }
    } catch (err) {
      console.log('[ImagePreprocess] Aggressive compression failed, using previous result:', err);
    }
  }

  return {
    uri: processed.uri,
    base64: processed.base64,
    width: processed.width,
    height: processed.height,
    sizeKB: finalSizeKB,
  };
}

export function estimateImageQuality(width: number, height: number, sizeKB: number): 'good' | 'fair' | 'poor' {
  const pixels = width * height;
  if (pixels < 200000) return 'poor';
  if (pixels < 500000) return 'fair';

  const bytesPerPixel = (sizeKB * 1024) / pixels;
  if (bytesPerPixel < 0.05) return 'poor';
  if (bytesPerPixel < 0.15) return 'fair';

  return 'good';
}
