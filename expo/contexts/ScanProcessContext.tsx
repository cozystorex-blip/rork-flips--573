import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useRef, useMemo } from 'react';
import { Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { runSmartScan, generateReferenceImage, getLastProcessedBase64 } from '@/services/smartScanService';
import { validateScanResult } from '@/services/scanValidator';
import type { ScanValidationResult } from '@/services/scanValidator';
import type { IkeaScanMode } from '@/services/smartScanService';
import { persistScanImage } from '@/services/imagePersistence';
import { useScanHistory } from '@/contexts/ScanHistoryContext';
import type { SmartScanResult } from '@/services/smartScanService';
import { ScanCaptureError, parseCaptureError } from '@/services/cameraErrors';
import type { CameraPermissionStatus } from '@/services/cameraErrors';

export type ScanPhase = 'idle' | 'preprocessing' | 'analyzing' | 'generating_image' | 'done' | 'error';

export const PHASE_MESSAGES: Record<ScanPhase, string> = {
  idle: '',
  preprocessing: 'Preparing image...',
  analyzing: 'Identifying item...',
  generating_image: 'Creating reference image...',
  done: 'Complete!',
  error: 'Something went wrong',
};

const CAMERA_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8,
  allowsEditing: false,
  exif: true,
};

const GALLERY_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8,
  allowsEditing: false,
  exif: true,
};

const CAPTURE_TIMEOUT_MS = 30000;

function mapPermissionStatus(status: string): CameraPermissionStatus {
  switch (status) {
    case 'granted': return 'granted';
    case 'denied': return 'denied';
    case 'limited': return 'limited';
    default: return 'undetermined';
  }
}

async function getCameraPermissionStatus(): Promise<CameraPermissionStatus> {
  if (Platform.OS === 'web') return 'granted';
  const { status } = await ImagePicker.getCameraPermissionsAsync();
  console.log('[Camera] getCameraPermissionStatus:', status);
  return mapPermissionStatus(status);
}

async function requestCameraPermission(): Promise<CameraPermissionStatus> {
  if (Platform.OS === 'web') return 'granted';
  const result = await ImagePicker.requestCameraPermissionsAsync();
  console.log('[Camera] requestCameraPermission result:', result.status, 'granted:', result.granted);
  return result.granted ? 'granted' : mapPermissionStatus(result.status);
}

async function getGalleryPermissionStatus(): Promise<CameraPermissionStatus> {
  if (Platform.OS === 'web') return 'granted';
  const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
  console.log('[Gallery] getGalleryPermissionStatus:', status);
  return mapPermissionStatus(status);
}

async function requestGalleryPermission(): Promise<CameraPermissionStatus> {
  if (Platform.OS === 'web') return 'granted';
  const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
  console.log('[Gallery] requestGalleryPermission result:', result.status, 'granted:', result.granted);
  return result.granted ? 'granted' : mapPermissionStatus(result.status);
}

async function withCaptureTimeout<T>(promise: Promise<T>, timeoutMs: number = CAPTURE_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ScanCaptureError('capture/timeout', `Capture timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

async function launchCameraWithRetry(options: ImagePicker.ImagePickerOptions, maxRetries: number = 2): Promise<ImagePicker.ImagePickerResult> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Camera] launchCameraAsync attempt ${attempt}/${maxRetries}`);
      const result = await withCaptureTimeout(ImagePicker.launchCameraAsync(options));
      return result;
    } catch (err) {
      lastError = err;
      console.log(`[Camera] launchCameraAsync attempt ${attempt} failed:`, err);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }
  }
  throw lastError ?? new ScanCaptureError('capture/failed', 'Camera launch failed after retries');
}

async function requestCameraImage(): Promise<ImagePicker.ImagePickerResult | null> {
  if (Platform.OS === 'web') {
    console.log('[Camera] Web platform — using gallery fallback');
    return withCaptureTimeout(ImagePicker.launchImageLibraryAsync(GALLERY_OPTIONS));
  }

  let permStatus = await getCameraPermissionStatus();
  console.log('[Camera] Initial permission status:', permStatus);

  if (permStatus === 'undetermined') {
    permStatus = await requestCameraPermission();
    console.log('[Camera] After request, permission status:', permStatus);
  }

  if (permStatus === 'granted' || permStatus === 'limited') {
    try {
      return await launchCameraWithRetry(CAMERA_OPTIONS);
    } catch (err) {
      const parsed = parseCaptureError(err);
      console.log('[Camera] launchCameraAsync failed with code:', parsed.code, '— falling back to gallery');
      if (parsed.code === 'capture/cancelled') return null;
      try {
        return await withCaptureTimeout(ImagePicker.launchImageLibraryAsync(GALLERY_OPTIONS));
      } catch (galleryErr) {
        console.log('[Camera] Gallery fallback also failed:', galleryErr);
        throw new ScanCaptureError('capture/failed', 'Both camera and gallery failed');
      }
    }
  }

  if (permStatus === 'denied') {
    Alert.alert(
      'Camera Access Needed',
      'Camera access was denied. Please enable it in your device Settings, or use the Gallery option.',
      [{ text: 'OK' }]
    );
    return null;
  }

  const retryPerm = await requestCameraPermission();
  if (retryPerm === 'granted' || retryPerm === 'limited') {
    try {
      return await launchCameraWithRetry(CAMERA_OPTIONS);
    } catch (err) {
      console.log('[Camera] launchCameraAsync failed after permission grant:', err);
      return withCaptureTimeout(ImagePicker.launchImageLibraryAsync(GALLERY_OPTIONS));
    }
  }

  Alert.alert(
    'Camera Access Needed',
    'Please allow camera access in your device Settings to use the camera scanner. You can also use the Gallery option.',
    [{ text: 'OK' }]
  );
  return null;
}

async function requestGalleryImage(): Promise<ImagePicker.ImagePickerResult | null> {
  if (Platform.OS !== 'web') {
    let permStatus = await getGalleryPermissionStatus();
    console.log('[Gallery] Initial permission status:', permStatus);

    if (permStatus === 'undetermined') {
      permStatus = await requestGalleryPermission();
      console.log('[Gallery] After request, permission status:', permStatus);
    }

    if (permStatus === 'denied') {
      Alert.alert(
        'Photo Access Needed',
        'Photo library access was denied. Please enable it in your device Settings to select photos.',
        [{ text: 'OK' }]
      );
      return null;
    }

    if (permStatus !== 'granted' && permStatus !== 'limited') {
      const retryPerm = await requestGalleryPermission();
      if (retryPerm !== 'granted' && retryPerm !== 'limited') {
        Alert.alert('Photo Access Needed', 'Please allow photo library access in your device Settings to select photos.');
        return null;
      }
    }
  }

  try {
    return await withCaptureTimeout(ImagePicker.launchImageLibraryAsync(GALLERY_OPTIONS));
  } catch (err) {
    const parsed = parseCaptureError(err);
    console.log('[Gallery] launchImageLibraryAsync failed with code:', parsed.code);
    if (parsed.code === 'capture/cancelled') return null;
    Alert.alert('Error', parsed.userMessage);
    return null;
  }
}

export interface ScanProcessState {
  scanning: boolean;
  scanPhase: ScanPhase;
  result: SmartScanResult | null;
  referenceImageUrl: string | null;
  scannedImageUri: string | null;
  generatingImage: boolean;
  viewingEntryId: string | null;
  pendingReceiptNav: boolean;
  scanMode: IkeaScanMode;
  lastValidation: ScanValidationResult | null;
}

const SCAN_TIMEOUT_MS = 60000;
const SCAN_STUCK_TIMEOUT_MS = 20000;
const SCAN_PHASE_TIMEOUT_MS = 45000;

export const [ScanProcessProvider, useScanProcess] = createContextHook(() => {
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle');
  const [result, setResult] = useState<SmartScanResult | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [scannedImageUri, setScannedImageUri] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState<boolean>(false);
  const [viewingEntryId, setViewingEntryId] = useState<string | null>(null);
  const [pendingReceiptNav, setPendingReceiptNav] = useState<boolean>(false);
  const [scanMode, setScanMode] = useState<IkeaScanMode>(null);
  const [lastValidation, setLastValidation] = useState<ScanValidationResult | null>(null);

  const { addEntry } = useScanHistory();
  const [lastError, setLastError] = useState<ScanCaptureError | null>(null);
  const scanAbortRef = useRef<boolean>(false);
  const scanInProgressRef = useRef<boolean>(false);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stuckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureAttemptRef = useRef<number>(0);

  const clearAllTimers = useCallback(() => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    if (stuckTimeoutRef.current) {
      clearTimeout(stuckTimeoutRef.current);
      stuckTimeoutRef.current = null;
    }
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current);
      phaseTimeoutRef.current = null;
    }
  }, []);

  const startPhaseTimer = useCallback((phaseName: string) => {
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current);
    }
    phaseTimeoutRef.current = setTimeout(() => {
      if (scanInProgressRef.current) {
        console.log(`[ScanProcess] Phase '${phaseName}' stuck for ${SCAN_PHASE_TIMEOUT_MS}ms — triggering abort`);
        scanAbortRef.current = true;
      }
    }, SCAN_PHASE_TIMEOUT_MS);
  }, []);

  const scanningRef = useRef<boolean>(false);
  scanningRef.current = scanning;

  const handleCapture = useCallback(async (mode: 'camera' | 'gallery', ikeaScanMode?: IkeaScanMode) => {
    if (scanInProgressRef.current) {
      if (!scanningRef.current) {
        console.log('[ScanProcess] scanInProgressRef stuck but not scanning — force resetting');
        scanInProgressRef.current = false;
      } else {
        console.log('[ScanProcess] Scan already in progress, ignoring duplicate call');
        return;
      }
    }

    captureAttemptRef.current += 1;
    const attemptId = captureAttemptRef.current;
    console.log(`[ScanProcess] Starting capture attempt #${attemptId} mode=${mode}`);

    scanInProgressRef.current = true;
    setResult(null);
    setReferenceImageUrl(null);
    setScannedImageUri(null);
    setGeneratingImage(false);
    setViewingEntryId(null);
    setPendingReceiptNav(false);
    setLastError(null);
    scanAbortRef.current = false;
    clearAllTimers();

    stuckTimeoutRef.current = setTimeout(() => {
      if (scanInProgressRef.current && captureAttemptRef.current === attemptId) {
        console.log(`[ScanProcess] STUCK SAFETY #${attemptId}: Force-resetting after ${SCAN_STUCK_TIMEOUT_MS}ms`);
        scanInProgressRef.current = false;
        setScanning(false);
        setScanPhase('idle');
        setLastError(new ScanCaptureError('processing/timeout', 'Scan got stuck and was auto-recovered'));
      }
    }, SCAN_STUCK_TIMEOUT_MS);

    let capturedUri: string | null = null;

    try {
      let pickerResult: ImagePicker.ImagePickerResult | null;

      if (mode === 'camera') {
        pickerResult = await requestCameraImage();
      } else {
        pickerResult = await requestGalleryImage();
      }

      if (captureAttemptRef.current !== attemptId) {
        console.log(`[ScanProcess] Attempt #${attemptId} superseded by #${captureAttemptRef.current}, aborting`);
        return;
      }

      if (!pickerResult || pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
        console.log('[ScanProcess] User cancelled image selection');
        scanInProgressRef.current = false;
        clearAllTimers();
        setScanning(false);
        setScanPhase('idle');
        return;
      }

      capturedUri = pickerResult.assets[0].uri;
      const assetWidth = pickerResult.assets[0].width;
      const assetHeight = pickerResult.assets[0].height;
      console.log(`[ScanProcess] Image captured: ${capturedUri.substring(0, 80)} (${assetWidth}x${assetHeight})`);

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      setScanning(true);
      setScanPhase('preprocessing');
      startPhaseTimer('preprocessing');

      scanTimeoutRef.current = setTimeout(() => {
        if (scanInProgressRef.current && captureAttemptRef.current === attemptId) {
          console.log(`[ScanProcess] Scan #${attemptId} timed out after ${SCAN_TIMEOUT_MS}ms`);
          scanAbortRef.current = true;
        }
      }, SCAN_TIMEOUT_MS);

      setScanPhase('analyzing');
      startPhaseTimer('analyzing');

      const activeScanMode = ikeaScanMode ?? scanMode;
      console.log('[ScanProcess] Using scan mode:', activeScanMode ?? 'auto');
      const scanResult = await runSmartScan(capturedUri, activeScanMode);

      clearAllTimers();

      if (captureAttemptRef.current !== attemptId) {
        console.log(`[ScanProcess] Attempt #${attemptId} superseded after analysis, discarding result`);
        return;
      }

      if (scanAbortRef.current) {
        console.log('[ScanProcess] Scan was aborted or timed out');
        scanInProgressRef.current = false;
        setScanning(false);
        setScanPhase('idle');
        setLastError(new ScanCaptureError('processing/timeout', 'Scan analysis timed out'));
        Alert.alert('Scan Timeout', 'The scan took too long. Please try again with a clearer photo.');
        return;
      }

      if (scanResult.item_type === 'receipt') {
        setScanPhase('done');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setScanning(false);
        setPendingReceiptNav(true);
        scanInProgressRef.current = false;
        return;
      }

      const entryId = Date.now().toString() + Math.random().toString(36).substring(2, 6);

      let persistedUri = capturedUri;
      try {
        persistedUri = await persistScanImage(capturedUri);
        console.log('[ScanProcess] Image persisted:', persistedUri.substring(0, 80));
      } catch (e) {
        console.log('[ScanProcess] Image persistence failed, using captured URI:', e);
      }

      const validation = validateScanResult(scanResult);
      setLastValidation(validation);
      console.log('[ScanProcess] Validation score:', validation.score, '% |', validation.passedChecks, '/', validation.totalChecks, 'checks passed');

      setResult(scanResult);
      setScannedImageUri(persistedUri);
      setViewingEntryId(entryId);

      setScanPhase('generating_image');
      startPhaseTimer('generating_image');

      const processedBase64 = getLastProcessedBase64();
      if (scanResult.image_description) {
        try {
          setGeneratingImage(true);
          const refImageUrl = await generateReferenceImage(scanResult.image_description, processedBase64 ?? undefined, scanResult.confidence);
          if (refImageUrl) {
            setReferenceImageUrl(refImageUrl);
            scanResult.reference_image_url = refImageUrl;
          }
        } catch (imgErr) {
          console.log('[ScanProcess] Reference image generation failed:', imgErr);
        } finally {
          setGeneratingImage(false);
        }
      }

      setScanPhase('done');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      scanResult.scanned_image_uri = persistedUri;
      addEntry(scanResult, persistedUri, entryId);
      console.log('[ScanProcess] Scan saved with ID:', entryId, 'name:', scanResult.item_name);

    } catch (error: unknown) {
      clearAllTimers();

      const scanError = parseCaptureError(error);
      setLastError(scanError);
      console.log(`[ScanProcess] Error during scan: code=${scanError.code} message=${scanError.message} retryable=${scanError.isRetryable}`);

      if (scanError.code === 'capture/cancelled') {
        scanInProgressRef.current = false;
        setScanning(false);
        setScanPhase('idle');
        return;
      }

      const fallbackResult: SmartScanResult = {
        item_type: 'unknown',
        confidence: 0.15,
        item_name: 'Could Not Identify',
        category: 'Unknown',
        food_details: null,
        grocery_details: null,
        household_details: null,
        furniture_details: null,
        fashion_details: null,
        electronics_details: null,
        document_details: null,
        general_details: {
          item_description: 'The scan could not reliably identify this item. Try again with a clearer photo.',
          subcategory: 'other',
          brand: null, model: null, material: null, color: null, condition: null,
          estimated_retail_price: null,
          estimated_resale_value: null,
          price_range: null,
          value_rating: null,
          value_verdict: null,
          value_reasoning: null,
          resale_demand: null,
          resale_suggestion: null,
          best_selling_platform: null,
          comparable_item: null,
          budget_insight: null,
          cheaper_alternative: null,
          care_tip: null,
          fun_fact: null,
          practical_tip: scanError.isRetryable
            ? 'Try scanning the product label, barcode, or a clearer angle for better results.'
            : scanError.userMessage,
          age_or_era: null, rarity: null,
          tags: [],
          complementary_items: [],
          purpose: null,
          value_insight: null,
          next_scan_suggestion: 'Try a clearer photo with good lighting, showing labels or brand markings.',
        },
        is_receipt: false,
        short_summary: 'We could not identify this item. Please try again with a clearer, well-lit photo showing any labels or brand markings.',
        image_description: '',
      };

      let fallbackPersistedUri = capturedUri;
      if (capturedUri) {
        try {
          fallbackPersistedUri = await persistScanImage(capturedUri);
        } catch (persistErr) {
          console.log('[ScanProcess] Fallback image persistence failed:', persistErr);
        }
      }

      fallbackResult.scanned_image_uri = fallbackPersistedUri ?? undefined;
      const fallbackValidation = validateScanResult(fallbackResult);
      setLastValidation(fallbackValidation);
      setResult(fallbackResult);
      setScannedImageUri(fallbackPersistedUri);
      setScanPhase('done');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      const fallbackId = Date.now().toString() + Math.random().toString(36).substring(2, 6);
      setViewingEntryId(fallbackId);
      addEntry(fallbackResult, fallbackPersistedUri ?? undefined, fallbackId);
      console.log('[ScanProcess] Fallback scan saved with ID:', fallbackId);
    } finally {
      console.log('[ScanProcess] Scan complete, resetting state flags');
      setScanning(false);
      scanInProgressRef.current = false;
      clearAllTimers();
    }
  }, [addEntry, clearAllTimers, startPhaseTimer, scanMode]);

  const resetScan = useCallback(() => {
    console.log('[ScanProcess] Resetting scan state');
    setResult(null);
    setReferenceImageUrl(null);
    setScannedImageUri(null);
    setViewingEntryId(null);
    setScanPhase('idle');
    setGeneratingImage(false);
    setPendingReceiptNav(false);
    setLastValidation(null);
    setLastError(null);
    scanAbortRef.current = false;
    scanInProgressRef.current = false;
    setScanning(false);
    clearAllTimers();
  }, [clearAllTimers]);

  const abortScan = useCallback(() => {
    console.log('[ScanProcess] User-initiated abort');
    scanAbortRef.current = true;
    scanInProgressRef.current = false;
    setScanning(false);
    setScanPhase('idle');
    setLastError(new ScanCaptureError('processing/aborted', 'Scan cancelled by user'));
    clearAllTimers();
  }, [clearAllTimers]);

  const loadHistoryEntry = useCallback((entry: {
    result: SmartScanResult;
    imageUri?: string | null;
    id: string;
  }) => {
    setResult(entry.result);
    setReferenceImageUrl(entry.result.reference_image_url ?? null);
    setScannedImageUri(entry.imageUri ?? entry.result.scanned_image_uri ?? null);
    setViewingEntryId(entry.id);
    setScanPhase('done');
    setScanning(false);
    setGeneratingImage(false);
    setPendingReceiptNav(false);
  }, []);

  const consumeReceiptNav = useCallback(() => {
    setPendingReceiptNav(false);
  }, []);

  return useMemo(() => ({
    scanning,
    scanPhase,
    result,
    referenceImageUrl,
    scannedImageUri,
    generatingImage,
    viewingEntryId,
    pendingReceiptNav,
    scanMode,
    lastValidation,
    lastError,
    handleCapture,
    resetScan,
    abortScan,
    loadHistoryEntry,
    consumeReceiptNav,
    setScanMode,
    setResult,
    setReferenceImageUrl,
    setScannedImageUri,
    setViewingEntryId,
  }), [
    scanning, scanPhase, result, referenceImageUrl, scannedImageUri,
    generatingImage, viewingEntryId, pendingReceiptNav, scanMode,
    lastValidation, lastError, handleCapture, resetScan, abortScan, loadHistoryEntry, consumeReceiptNav,
  ]);
});
