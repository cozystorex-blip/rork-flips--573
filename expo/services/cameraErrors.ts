export type CameraErrorCode =
  | 'permission/camera-denied'
  | 'permission/gallery-denied'
  | 'permission/not-determined'
  | 'capture/cancelled'
  | 'capture/failed'
  | 'capture/no-asset'
  | 'capture/timeout'
  | 'system/unavailable'
  | 'system/view-not-found'
  | 'processing/failed'
  | 'processing/timeout'
  | 'processing/aborted'
  | 'unknown';

export class ScanCaptureError extends Error {
  public readonly code: CameraErrorCode;
  public readonly isRetryable: boolean;
  public readonly userMessage: string;

  constructor(code: CameraErrorCode, message: string, userMessage?: string) {
    super(message);
    this.name = 'ScanCaptureError';
    this.code = code;
    this.isRetryable = getRetryable(code);
    this.userMessage = userMessage ?? getDefaultUserMessage(code);
    console.log(`[ScanCaptureError] code=${code} message=${message} retryable=${this.isRetryable}`);
  }
}

function getRetryable(code: CameraErrorCode): boolean {
  switch (code) {
    case 'permission/camera-denied':
    case 'permission/gallery-denied':
    case 'system/unavailable':
      return false;
    case 'capture/cancelled':
      return false;
    case 'capture/failed':
    case 'capture/no-asset':
    case 'capture/timeout':
    case 'processing/failed':
    case 'processing/timeout':
    case 'processing/aborted':
    case 'permission/not-determined':
    case 'system/view-not-found':
    case 'unknown':
      return true;
    default:
      return true;
  }
}

function getDefaultUserMessage(code: CameraErrorCode): string {
  switch (code) {
    case 'permission/camera-denied':
      return 'Camera access is needed. Please enable it in your device Settings.';
    case 'permission/gallery-denied':
      return 'Photo library access is needed. Please enable it in your device Settings.';
    case 'permission/not-determined':
      return 'Camera permission has not been granted yet. Please try again.';
    case 'capture/cancelled':
      return 'Image selection was cancelled.';
    case 'capture/failed':
      return 'Failed to capture image. Please try again.';
    case 'capture/no-asset':
      return 'No image was captured. Please try again.';
    case 'capture/timeout':
      return 'Camera took too long to respond. Please try again.';
    case 'system/unavailable':
      return 'Camera is not available on this device.';
    case 'system/view-not-found':
      return 'Camera view could not be initialized. Please restart the app.';
    case 'processing/failed':
      return 'Failed to process the image. Try a clearer photo.';
    case 'processing/timeout':
      return 'Analysis took too long. Please try again with a clearer photo.';
    case 'processing/aborted':
      return 'Scan was cancelled.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function parseCaptureError(error: unknown): ScanCaptureError {
  if (error instanceof ScanCaptureError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes('cancel') || lower.includes('dismissed') || lower.includes('user denied')) {
    return new ScanCaptureError('capture/cancelled', message);
  }
  if (lower.includes('permission') || lower.includes('not authorized') || lower.includes('access denied')) {
    if (lower.includes('camera')) {
      return new ScanCaptureError('permission/camera-denied', message);
    }
    if (lower.includes('photo') || lower.includes('library') || lower.includes('gallery')) {
      return new ScanCaptureError('permission/gallery-denied', message);
    }
    return new ScanCaptureError('permission/camera-denied', message);
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return new ScanCaptureError('capture/timeout', message);
  }
  if (lower.includes('unavailable') || lower.includes('not supported') || lower.includes('no camera')) {
    return new ScanCaptureError('system/unavailable', message);
  }

  return new ScanCaptureError('capture/failed', message);
}

export type CameraPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'limited';

export interface PermissionCheckResult {
  camera: CameraPermissionStatus;
  gallery: CameraPermissionStatus;
}
