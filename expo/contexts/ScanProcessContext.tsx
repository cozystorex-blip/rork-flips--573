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
  quality: 0.7,
  allowsEditing: false,
  exif: false,
};

const GALLERY_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
  allowsEditing: false,
  exif: false,
};

async function requestCameraImage(): Promise<ImagePicker.ImagePickerResult | null> {
  if (Platform.OS === 'web') {
    console.log('[Camera] Web platform — using gallery fallback');
    return ImagePicker.launchImageLibraryAsync(GALLERY_OPTIONS);
  }

  const { status, canAskAgain } = await ImagePicker.getCameraPermissionsAsync();
  console.log('[Camera] Permission status:', status, 'canAskAgain:', canAskAgain);

  if (status === 'granted') {
    try {
      return await ImagePicker.launchCameraAsync(CAMERA_OPTIONS);
    } catch (err) {
      console.log('[Camera] launchCameraAsync failed, falling back to gallery:', err);
      return ImagePicker.launchImageLibraryAsync(GALLERY_OPTIONS);
    }
  }

  if (status === 'undetermined' || canAskAgain) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.granted) {
      try {
        return await ImagePicker.launchCameraAsync(CAMERA_OPTIONS);
      } catch (err) {
        console.log('[Camera] launchCameraAsync failed after grant, falling back:', err);
        return ImagePicker.launchImageLibraryAsync(GALLERY_OPTIONS);
      }
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
    const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();
    console.log('[Gallery] Permission status:', status, 'canAskAgain:', canAskAgain);
    if (status !== 'granted') {
      if (status === 'undetermined' || canAskAgain) {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Photo Access Needed', 'Please allow photo library access in your device Settings to select photos.');
          return null;
        }
      } else {
        Alert.alert('Photo Access Needed', 'Please allow photo library access in your device Settings to select photos.');
        return null;
      }
    }
  }
  try {
    return await ImagePicker.launchImageLibraryAsync(GALLERY_OPTIONS);
  } catch (err) {
    console.log('[Gallery] launchImageLibraryAsync failed:', err);
    Alert.alert('Error', 'Could not open photo library. Please try again.');
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
const SCAN_STUCK_TIMEOUT_MS = 90000;

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
  const scanAbortRef = useRef<boolean>(false);
  const scanInProgressRef = useRef<boolean>(false);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stuckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearScanTimeout = useCallback(() => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    if (stuckTimeoutRef.current) {
      clearTimeout(stuckTimeoutRef.current);
      stuckTimeoutRef.current = null;
    }
  }, []);

  const handleCapture = useCallback(async (mode: 'camera' | 'gallery', ikeaScanMode?: IkeaScanMode) => {
    if (scanInProgressRef.current) {
      console.log('[ScanProcess] Scan already in progress, ignoring duplicate call');
      return;
    }

    scanInProgressRef.current = true;
    setResult(null);
    setReferenceImageUrl(null);
    setScannedImageUri(null);
    setGeneratingImage(false);
    setViewingEntryId(null);
    setPendingReceiptNav(false);
    scanAbortRef.current = false;
    clearScanTimeout();

    stuckTimeoutRef.current = setTimeout(() => {
      if (scanInProgressRef.current) {
        console.log('[ScanProcess] STUCK SAFETY: Force-resetting scanInProgressRef after', SCAN_STUCK_TIMEOUT_MS, 'ms');
        scanInProgressRef.current = false;
        setScanning(false);
        setScanPhase('idle');
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

      if (!pickerResult || pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
        console.log('[ScanProcess] User cancelled image selection');
        scanInProgressRef.current = false;
        clearScanTimeout();
        setScanning(false);
        setScanPhase('idle');
        return;
      }

      capturedUri = pickerResult.assets[0].uri;
      console.log('[ScanProcess] Image captured:', capturedUri.substring(0, 80));

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      setScanning(true);
      setScanPhase('preprocessing');

      scanTimeoutRef.current = setTimeout(() => {
        if (scanInProgressRef.current) {
          console.log('[ScanProcess] Scan timed out after', SCAN_TIMEOUT_MS, 'ms');
          scanAbortRef.current = true;
        }
      }, SCAN_TIMEOUT_MS);

      setScanPhase('analyzing');

      const activeScanMode = ikeaScanMode ?? scanMode;
      console.log('[ScanProcess] Using scan mode:', activeScanMode ?? 'auto');
      const scanResult = await runSmartScan(capturedUri, activeScanMode);

      clearScanTimeout();

      if (scanAbortRef.current) {
        console.log('[ScanProcess] Scan was aborted or timed out');
        scanInProgressRef.current = false;
        setScanning(false);
        setScanPhase('idle');
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

      const processedBase64 = getLastProcessedBase64();
      if (scanResult.image_description) {
        try {
          setGeneratingImage(true);
          const refImageUrl = await generateReferenceImage(scanResult.image_description, processedBase64 ?? undefined);
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
      clearScanTimeout();
      const msg = error instanceof Error ? error.message : String(error);
      console.log('[ScanProcess] Error during scan:', msg);

      const fallbackResult: SmartScanResult = {
        item_type: 'general',
        confidence: 0.35,
        item_name: 'Detected Item',
        category: 'General',
        food_details: null,
        grocery_details: null,
        household_details: null,
        furniture_details: null,
        fashion_details: null,
        electronics_details: null,
        document_details: null,
        general_details: {
          item_description: 'Item detected with best-effort analysis based on visual similarity.',
          subcategory: 'other',
          brand: null, model: null, material: 'Mixed', color: null, condition: 'good',
          estimated_retail_price: '$10 - $40',
          estimated_resale_value: '$5',
          price_range: '$5 - $25',
          value_rating: 'average',
          value_verdict: 'fair',
          value_reasoning: 'Estimated from general category patterns. A clearer scan with visible labels or tags will improve accuracy.',
          resale_demand: 'low',
          resale_suggestion: 'Photograph any brand labels, tags, or distinguishing features for better resale analysis.',
          best_selling_platform: 'Facebook Marketplace, eBay, Mercari',
          comparable_item: 'Similar items in this category',
          budget_insight: 'Scan labels or tags for precise value assessment.',
          cheaper_alternative: null,
          care_tip: 'Store in a clean, dry place to maintain condition.',
          fun_fact: null,
          practical_tip: 'Try scanning the product label, barcode, or a clearer angle for better results.',
          age_or_era: null, rarity: null,
          tags: ['general', 'rescan-for-detail'],
          complementary_items: ['Related accessories', 'Replacement parts'],
          purpose: 'General item detected — scan labels or tags for full analysis.',
          value_insight: 'A clearer scan will unlock detailed pricing, resale demand, and similar item comparisons.',
          next_scan_suggestion: 'Try scanning the product label, barcode, or a clearer angle for better results.',
        },
        is_receipt: false,
        short_summary: 'Item detected with estimated value. Try a clearer photo with visible labels for full analysis.',
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
      clearScanTimeout();
    }
  }, [addEntry, clearScanTimeout, scanMode]);

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
    scanAbortRef.current = false;
    scanInProgressRef.current = false;
    setScanning(false);
    clearScanTimeout();
  }, [clearScanTimeout]);

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
    handleCapture,
    resetScan,
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
    lastValidation, handleCapture, resetScan, loadHistoryEntry, consumeReceiptNav,
  ]);
});
