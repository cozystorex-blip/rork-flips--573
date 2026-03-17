import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  Animated,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import {
  X,
  Camera,
  ScanLine,
  RefreshCw,
  Image as ImageIcon,
  Flame,
  Package,
  Sofa,
  Receipt,
  HelpCircle,
  ChevronRight,
  BadgeCheck,
  History,
  Crown,
  Lock,
  Trash2,
  Shirt,
  Smartphone,
  Scan,
  Lamp,
  Dumbbell,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { AppIllustrations } from '@/constants/illustrations';
import { runSmartScan, generateReferenceImage, getLastProcessedBase64, SmartScanResult, SmartScanItemType } from '@/services/smartScanService';
import { useScanHistory } from '@/contexts/ScanHistoryContext';
import { persistScanImage } from '@/services/imagePersistence';
import { usePremium } from '@/contexts/PremiumContext';
import {
  FoodResultSection,
  GroceryResultSection,
  FurnitureResultSection,
  FashionResultSection,
  ElectronicsResultSection,
  HouseholdResultSection,
  GeneralResultSection,
  UnknownResultSection,
  ReceiptResultSection,
} from '@/components/scan/ScanResultRenderers';

type ScanPhase = 'idle' | 'preprocessing' | 'analyzing' | 'generating_image' | 'done' | 'error';

const PHASE_MESSAGES: Record<ScanPhase, string> = {
  idle: '',
  preprocessing: 'Preparing image...',
  analyzing: 'Identifying item...',
  generating_image: 'Creating reference image...',
  done: 'Complete!',
  error: 'Something went wrong',
};

const TYPE_CONFIG: Record<SmartScanItemType, { label: string; color: string; bg: string; Icon: React.ComponentType<{ size: number; color: string }> }> = {
  food: { label: 'Food Item', color: '#16A34A', bg: '#F0FDF4', Icon: Flame },
  grocery: { label: 'Grocery Product', color: '#2563EB', bg: '#EFF6FF', Icon: Package },
  household: { label: 'Home / Household', color: '#7C3AED', bg: '#F5F3FF', Icon: Lamp },
  furniture: { label: 'Furniture', color: '#0058A3', bg: '#E8F4FD', Icon: Sofa },
  fashion: { label: 'Fashion Item', color: '#E11D48', bg: '#FFF1F2', Icon: Shirt },
  electronics: { label: 'Electronics', color: '#0284C7', bg: '#F0F9FF', Icon: Smartphone },
  general: { label: 'Item Identified', color: '#0D9488', bg: '#F0FDFA', Icon: Scan },
  receipt: { label: 'Receipt Detected', color: '#DC2626', bg: '#FEF2F2', Icon: Receipt },
  unknown: { label: 'Unknown Item', color: '#6B7280', bg: '#F3F4F6', Icon: HelpCircle },
};

const CAPABILITIES = [
  { icon: Scan, label: 'Any Product', desc: 'Scan anything — get price, value, and smart insights instantly', color: '#0D9488' },
  { icon: Shirt, label: 'Fashion & Sneakers', desc: 'Brand, model, retail price, resale value, style info', color: '#E11D48' },
  { icon: Sofa, label: 'Furniture & Home', desc: 'Dimensions, assembly guide, tools needed, matching items', color: '#0058A3' },
  { icon: Flame, label: 'Food & Groceries', desc: 'Nutrition, calories, price comparison, budget tips', color: '#16A34A' },
  { icon: Dumbbell, label: 'Fitness & Household', desc: 'Equipment details, care tips, price estimates', color: '#7C3AED' },
  { icon: Smartphone, label: 'Electronics', desc: 'Specs, retail vs resale, depreciation, accessories', color: '#0284C7' },
];

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
      const result = await ImagePicker.launchCameraAsync(CAMERA_OPTIONS);
      return result;
    } catch (err) {
      console.log('[Camera] launchCameraAsync failed, falling back to gallery:', err);
      return ImagePicker.launchImageLibraryAsync(GALLERY_OPTIONS);
    }
  }

  if (status === 'undetermined' || canAskAgain) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.granted) {
      try {
        const result = await ImagePicker.launchCameraAsync(CAMERA_OPTIONS);
        return result;
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

async function requestGalleryImage(): Promise<ImagePicker.ImagePickerResult> {
  if (Platform.OS !== 'web') {
    const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (status !== 'granted' && (status === 'undetermined' || canAskAgain)) {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Photo Access Needed', 'Please allow photo library access in Settings.');
      }
    }
  }
  return ImagePicker.launchImageLibraryAsync(GALLERY_OPTIONS);
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}



export default function SmartScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ historyEntryId?: string }>();

  const [scanning, setScanning] = useState<boolean>(false);
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle');

  const [result, setResult] = useState<SmartScanResult | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [scannedImageUri, setScannedImageUri] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [viewingEntryId, setViewingEntryId] = useState<string | null>(null);

  const { entries, totalCount, hiddenCount, hasHiddenEntries, isAtFreeLimit, addEntry, deleteEntry, freeLimit } = useScanHistory();
  const { isPremium, upgradeToPremium, restorePurchases, isPurchasing, isRestoring, annualPrice } = usePremium();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const resultFade = useRef(new Animated.Value(0)).current;

  const historyEntryIdRef = useRef(params.historyEntryId);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (historyEntryIdRef.current && entries.length > 0 && !result) {
      const entry = entries.find((e) => e.id === historyEntryIdRef.current);
      if (entry) {
        console.log('[SmartScan] Loading history entry:', entry.result.item_name);
        if (entry.result.item_type === 'receipt') {
          historyEntryIdRef.current = undefined;
          if (!hasNavigatedRef.current) {
            hasNavigatedRef.current = true;
            router.push({ pathname: '/log-entry', params: { mode: 'receipt' } });
          }
          return;
        }
        setResult(entry.result);
        setReferenceImageUrl(entry.result.reference_image_url ?? null);
        setScannedImageUri(entry.imageUri ?? entry.result.scanned_image_uri ?? null);
        setViewingEntryId(entry.id);
        resultFade.setValue(1);
        historyEntryIdRef.current = undefined;
      }
    }
  }, [entries, result, resultFade, router]);

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const animateProgress = useCallback((to: number, dur: number) => {
    Animated.timing(progressWidth, { toValue: to, duration: dur, useNativeDriver: false }).start();
  }, [progressWidth]);

  const handleCapture = useCallback(async (mode: 'camera' | 'gallery') => {

    setResult(null);
    setReferenceImageUrl(null);
    setScannedImageUri(null);
    resultFade.setValue(0);
    hasNavigatedRef.current = false;

    try {
      let pickerResult: ImagePicker.ImagePickerResult | null;

      if (mode === 'camera') {
        pickerResult = await requestCameraImage();
        if (!pickerResult) return;
      } else {
        pickerResult = await requestGalleryImage();
      }

      if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
        console.log('[SmartScan] User cancelled image selection');
        return;
      }

      const capturedUri = pickerResult.assets[0].uri;
      console.log('[SmartScan] Image captured:', capturedUri.substring(0, 80));

      setScanning(true);
      setScanPhase('preprocessing');
      startPulse();
      progressWidth.setValue(0);
      animateProgress(20, 1500);

      setScanPhase('analyzing');
      animateProgress(40, 5000);

      const scanResult = await runSmartScan(capturedUri);

      if (scanResult.item_type === 'receipt') {
        animateProgress(100, 200);
        setScanPhase('done');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          router.push({ pathname: '/log-entry', params: { mode: 'receipt' } });
        }
        return;
      }

      animateProgress(70, 800);
      setResult(scanResult);
      setScannedImageUri(capturedUri);

      setScanPhase('generating_image');
      animateProgress(85, 3000);

      const processedBase64 = getLastProcessedBase64();
      let refImageUrl: string | null = null;
      if (scanResult.image_description) {
        try {
          setGeneratingImage(true);
          refImageUrl = await generateReferenceImage(scanResult.image_description, processedBase64 ?? undefined);
          setReferenceImageUrl(refImageUrl);
          scanResult.reference_image_url = refImageUrl;
        } catch (imgErr) {
          console.log('[SmartScan] Reference image generation failed:', imgErr);
        } finally {
          setGeneratingImage(false);
        }
      }

      setScanPhase('done');
      animateProgress(100, 300);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      let persistedUri = capturedUri;
      try {
        persistedUri = await persistScanImage(capturedUri);
      } catch (e) {
        console.log('[SmartScan] Image persistence failed:', e);
      }
      const newId = Date.now().toString() + Math.random().toString(36).substring(2, 6);
      setViewingEntryId(newId);
      addEntry(scanResult, persistedUri);

      Animated.timing(resultFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.log('[SmartScan] Error:', msg);

      const fallbackResult: SmartScanResult = {
        item_type: 'general',
        confidence: 0.25,
        item_name: 'Scanned Item',
        category: 'General',
        food_details: null,
        grocery_details: null,
        household_details: null,
        furniture_details: null,
        fashion_details: null,
        electronics_details: null,
        general_details: {
          item_description: 'We could not fully analyze this item. Try scanning again with better lighting or a different angle.',
          subcategory: 'other',
          brand: null, model: null, material: null, color: null, condition: null,
          estimated_retail_price: null, estimated_resale_value: null, price_range: null,
          value_rating: null, value_verdict: null, value_reasoning: null,
          resale_demand: null, resale_suggestion: null, best_selling_platform: null,
          comparable_item: null, budget_insight: null, cheaper_alternative: null,
          care_tip: null, fun_fact: null, practical_tip: 'Try scanning the product label, barcode, or a clearer angle for better results.',
          age_or_era: null, rarity: null,
          tags: ['needs-rescan'],
          complementary_items: [],
        },
        is_receipt: false,
        short_summary: 'Could not fully identify this item. Try a clearer photo for better results.',
        image_description: '',
      };

      setResult(fallbackResult);
      setScannedImageUri(scannedImageUri);
      setScanPhase('done');
      animateProgress(100, 300);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      const newId = Date.now().toString() + Math.random().toString(36).substring(2, 6);
      setViewingEntryId(newId);

      Animated.timing(resultFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    } finally {
      setScanning(false);
      stopPulse();
    }
  }, [startPulse, stopPulse, animateProgress, progressWidth, resultFade, addEntry, router, scannedImageUri]);

  const resetScan = useCallback(() => {
    setResult(null);
    setReferenceImageUrl(null);
    setScannedImageUri(null);
    setViewingEntryId(null);

    setScanPhase('idle');
    resultFade.setValue(0);
    progressWidth.setValue(0);
    hasNavigatedRef.current = false;
  }, [resultFade, progressWidth]);

  const typeConfig = result ? TYPE_CONFIG[result.item_type] : null;

  const confidenceLabel = useMemo(() => {
    if (!result) return '';
    if (result.confidence >= 0.8) return 'High confidence';
    if (result.confidence >= 0.6) return 'Good match';
    if (result.confidence >= 0.4) return 'Likely match';
    return 'Low confidence';
  }, [result]);

  const confidenceColor = useMemo(() => {
    if (!result) return '#6B7280';
    if (result.confidence >= 0.8) return '#059669';
    if (result.confidence >= 0.6) return '#2563EB';
    if (result.confidence >= 0.4) return '#D97706';
    return '#DC2626';
  }, [result]);


  const resultSection = useMemo(() => {
    if (!result) return null;
    switch (result.item_type) {
      case 'food': return <FoodResultSection result={result} />;
      case 'grocery': return <GroceryResultSection result={result} />;
      case 'household': return <HouseholdResultSection result={result} />;
      case 'furniture': return <FurnitureResultSection result={result} />;
      case 'fashion': return <FashionResultSection result={result} />;
      case 'electronics': return <ElectronicsResultSection result={result} />;
      case 'general': return <GeneralResultSection result={result} />;
      case 'receipt': return <ReceiptResultSection result={result} />;
      case 'unknown': return <UnknownResultSection result={result} />;
      default: return <UnknownResultSection result={result} />;
    }
  }, [result]);

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />

      <View style={[st.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={st.closeBtn} testID="close-smart-scan">
          <X size={20} color="#F5F5F7" />
        </Pressable>
        <Text style={st.topTitle}>Smart Scanner</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {!result && (
          <>
            <View style={st.heroSection}>
              <ExpoImage
                source={{ uri: AppIllustrations.scanner }}
                style={st.heroIllustration}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
              <Text style={st.heroSub}>
                Scan any item — food, sneakers, furniture, electronics, or anything else. Get instant details, pricing, and smart insights.
              </Text>
            </View>

            <View style={st.actionRow}>
              <Pressable
                style={st.actionBtnPrimary}
                onPress={() => void handleCapture('camera')}
                disabled={scanning}
                testID="smart-scan-camera"
              >
                {scanning ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Camera size={20} color="#FFFFFF" />
                )}
                <Text style={st.actionBtnPrimaryText}>{scanning ? 'Scanning...' : 'Camera'}</Text>
              </Pressable>
              <Pressable
                style={st.actionBtnSecondary}
                onPress={() => void handleCapture('gallery')}
                disabled={scanning}
                testID="smart-scan-gallery"
              >
                <ImageIcon size={20} color="#F5F5F7" />
                <Text style={st.actionBtnSecondaryText}>Gallery</Text>
              </Pressable>
            </View>

            {scanning && (
              <View style={st.progressCard}>
                <View style={st.progressHeader}>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <ScanLine size={18} color="#3B82F6" />
                  </Animated.View>
                  <Text style={st.progressText}>{PHASE_MESSAGES[scanPhase]}</Text>
                </View>
                <View style={st.progressBarBg}>
                  <Animated.View
                    style={[
                      st.progressBarFill,
                      {
                        width: progressWidth.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
                <Text style={st.progressHint}>
                  {scanPhase === 'preprocessing' && 'Optimizing image for best results...'}
                  {scanPhase === 'analyzing' && 'AI is analyzing your item...'}
                  {scanPhase === 'generating_image' && 'Creating a reference image...'}
                  {scanPhase === 'done' && 'Analysis complete!'}
                </Text>
              </View>
            )}

            {!scanning && entries.length > 0 && (
              <View style={st.historySection}>
                <Pressable
                  style={st.historyHeaderRow}
                  onPress={() => setShowHistory(!showHistory)}
                  testID="toggle-scan-history"
                >
                  <View style={st.historyHeaderLeft}>
                    <History size={16} color="#3B82F6" strokeWidth={2} />
                    <Text style={st.historyHeaderTitle}>Recent Scans</Text>
                    <View style={st.historyCountBadge}>
                      <Text style={st.historyCountText}>{totalCount}</Text>
                    </View>
                  </View>
                  <ChevronRight
                    size={16}
                    color="#636366"
                    style={{ transform: [{ rotate: showHistory ? '90deg' : '0deg' }] }}
                  />
                </Pressable>

                {showHistory && (
                  <View style={st.historyList}>
                    {entries.map((entry) => {
                      const config = TYPE_CONFIG[entry.result.item_type];
                      const timeAgo = getTimeAgo(entry.scannedAt);
                      return (
                        <Pressable
                          key={entry.id}
                          style={st.historyItem}
                          onPress={() => {
                            void Haptics.selectionAsync();
                            setResult(entry.result);
                            setReferenceImageUrl(entry.result.reference_image_url ?? null);
                            setScannedImageUri(entry.imageUri ?? entry.result.scanned_image_uri ?? null);
                            setViewingEntryId(entry.id);
                            resultFade.setValue(1);
                          }}
                          testID={`history-item-${entry.id}`}
                        >
                          <View style={[st.historyItemIcon, { backgroundColor: config?.bg ?? '#F3F4F6' }]}>
                            {config ? <config.Icon size={16} color={config.color} /> : <HelpCircle size={16} color="#6B7280" />}
                          </View>
                          <View style={st.historyItemInfo}>
                            <Text style={st.historyItemName} numberOfLines={1}>{entry.result.item_name}</Text>
                            <Text style={st.historyItemMeta}>{config?.label ?? 'Item'} · {timeAgo}</Text>
                          </View>
                          <Pressable
                            onPress={() => {
                              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              deleteEntry(entry.id);
                            }}
                            hitSlop={8}
                            style={st.historyDeleteBtn}
                          >
                            <Trash2 size={14} color="#636366" />
                          </Pressable>
                        </Pressable>
                      );
                    })}

                    {hasHiddenEntries && (
                      <Pressable
                        style={st.upgradeHistoryCard}
                        onPress={() => setShowUpgradeModal(true)}
                        testID="upgrade-history-prompt"
                      >
                        <View style={st.upgradeHistoryIcon}>
                          <Lock size={16} color="#D97706" />
                        </View>
                        <View style={st.upgradeHistoryInfo}>
                          <Text style={st.upgradeHistoryTitle}>{hiddenCount} older scan{hiddenCount === 1 ? '' : 's'} hidden</Text>
                          <Text style={st.upgradeHistorySubtext}>Upgrade to Premium for unlimited history</Text>
                        </View>
                        <Crown size={16} color="#D97706" />
                      </Pressable>
                    )}

                    {!isPremium && !hasHiddenEntries && isAtFreeLimit && (
                      <View style={st.limitNotice}>
                        <Text style={st.limitNoticeText}>Free plan: {freeLimit} most recent scans</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {!scanning && (
              <View style={st.capabilitiesSection}>
                <Text style={st.capabilitiesTitle}>What you can scan</Text>
                {CAPABILITIES.map((cap) => (
                  <View key={cap.label} style={st.capRow}>
                    <View style={[st.capIconWrap, { backgroundColor: `${cap.color}18` }]}>
                      <cap.icon size={16} color={cap.color} />
                    </View>
                    <View style={st.capTextCol}>
                      <Text style={st.capLabel}>{cap.label}</Text>
                      <Text style={st.capDesc}>{cap.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {result && (
          <Animated.View style={{ opacity: resultFade }}>
            <View style={st.receiptContainer}>
              <View style={st.receiptZigzagTop} />

              <View style={st.receiptBody}>
                <View style={st.receiptHeader}>
                  <Text style={st.receiptStoreName}>FLIPS SCANNER</Text>
                  <Text style={st.receiptStoreAddr}>Smart Item Analysis</Text>
                  <Text style={st.receiptDate}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>

                <View style={st.receiptDblLine}>
                  <View style={st.receiptDblLineInner} />
                  <View style={[st.receiptDblLineInner, { marginTop: 2 }]} />
                </View>

                {(scannedImageUri || referenceImageUrl) && (
                  <View style={st.receiptImageSection}>
                    {scannedImageUri && referenceImageUrl ? (
                      <View style={st.receiptDualImages}>
                        <View style={st.receiptImgWrap}>
                          <ExpoImage source={{ uri: scannedImageUri }} style={st.receiptImg} contentFit="cover" cachePolicy="memory-disk" />
                          <Text style={st.receiptImgLabel}>SCANNED</Text>
                        </View>
                        <View style={st.receiptImgWrap}>
                          <ExpoImage source={{ uri: referenceImageUrl }} style={st.receiptImg} contentFit="contain" cachePolicy="memory-disk" />
                          <Text style={st.receiptImgLabel}>AI MATCH</Text>
                        </View>
                      </View>
                    ) : scannedImageUri ? (
                      <View style={st.receiptSoloImgWrap}>
                        <ExpoImage source={{ uri: scannedImageUri }} style={st.receiptSoloImg} contentFit="cover" cachePolicy="memory-disk" />
                        {generatingImage && (
                          <View style={st.receiptImgOverlay}>
                            <ActivityIndicator size="small" color="#1A1A1A" />
                            <Text style={st.receiptImgOverlayText}>Generating AI ref...</Text>
                          </View>
                        )}
                      </View>
                    ) : referenceImageUrl ? (
                      <View style={st.receiptSoloImgWrap}>
                        <ExpoImage source={{ uri: referenceImageUrl }} style={st.receiptSoloImg} contentFit="contain" cachePolicy="memory-disk" />
                      </View>
                    ) : null}
                  </View>
                )}

                <View style={st.receiptDashLine}>
                  <Text style={st.receiptDashText}>{'- - - - - - - - - - - - - - - - - - - - - - - -'}</Text>
                </View>

                <View style={st.receiptItemHeader}>
                  <Text style={st.receiptItemName}>{result.item_name}</Text>
                  <Text style={st.receiptItemCategory}>{result.category}</Text>
                </View>

                <View style={st.receiptMetaRow}>
                  {typeConfig && (
                    <View style={st.receiptTypeBadge}>
                      <Text style={st.receiptTypeBadgeText}>{typeConfig.label}</Text>
                    </View>
                  )}
                  <View style={st.receiptConfBadge}>
                    <View style={[st.receiptConfDot, { backgroundColor: confidenceColor }]} />
                    <Text style={[st.receiptConfText, { color: confidenceColor }]}>{confidenceLabel}</Text>
                  </View>
                </View>

                {result.short_summary ? (
                  <View style={st.receiptSummary}>
                    <Text style={st.receiptSummaryText}>{result.short_summary}</Text>
                  </View>
                ) : null}

                <View style={st.receiptDashLine}>
                  <Text style={st.receiptDashText}>{'- - - - - - - - - - - - - - - - - - - - - - - -'}</Text>
                </View>

                <View style={st.receiptDetailsSection}>
                  {resultSection}
                </View>

                <View style={st.receiptDblLine}>
                  <View style={st.receiptDblLineInner} />
                  <View style={[st.receiptDblLineInner, { marginTop: 2 }]} />
                </View>

                <View style={st.receiptFooter}>
                  <Text style={st.receiptFooterText}>ITEMS SCANNED: 1</Text>
                  <Text style={st.receiptFooterText}>SCAN #{viewingEntryId?.slice(-6).toUpperCase() ?? '000000'}</Text>
                  <Text style={st.receiptThankYou}>THANK YOU FOR USING FLIPS</Text>
                  <Text style={st.receiptBarcode}>||||| |||| ||||| ||| |||| ||||| ||</Text>
                </View>
              </View>

              <View style={st.receiptZigzagBottom} />
            </View>

            <Pressable style={st.newScanBtnReceipt} onPress={resetScan} testID="smart-scan-again">
              <RefreshCw size={16} color="#F5F5F7" />
              <Text style={st.newScanBtnTextReceipt}>Scan Another Item</Text>
            </Pressable>

            {viewingEntryId && (
              <Pressable
                style={st.deleteResultBtnReceipt}
                testID="delete-scan-result"
                onPress={() => {
                  Alert.alert(
                    'Delete Scan',
                    'Are you sure you want to delete this scan result?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                          deleteEntry(viewingEntryId);
                          resetScan();
                        },
                      },
                    ]
                  );
                }}
              >
                <Trash2 size={14} color="#FF453A" />
                <Text style={st.deleteResultBtnTextReceipt}>Delete This Scan</Text>
              </Pressable>
            )}
          </Animated.View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      <Modal
        visible={showUpgradeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <Pressable style={st.modalOverlay} onPress={() => setShowUpgradeModal(false)}>
          <Pressable style={st.upgradeModal} onPress={() => {}}>
            <View style={st.upgradeModalIcon}>
              <Crown size={32} color="#D97706" />
            </View>
            <Text style={st.upgradeModalTitle}>Unlock Unlimited History</Text>
            <Text style={st.upgradeModalDesc}>
              Free accounts can view the {freeLimit} most recent scans. Upgrade to Premium to keep and access all your past scans forever.
            </Text>

            <View style={st.upgradeFeatures}>
              {[
                'Unlimited scan history',
                'Access all past results anytime',
                'Never lose a scan again',
              ].map((feat) => (
                <View key={feat} style={st.upgradeFeatureRow}>
                  <BadgeCheck size={14} color="#16A34A" />
                  <Text style={st.upgradeFeatureText}>{feat}</Text>
                </View>
              ))}
            </View>

            <Pressable
              style={[st.upgradeBtn, (isPurchasing || isRestoring) && { opacity: 0.7 }]}
              disabled={isPurchasing || isRestoring}
              onPress={() => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                upgradeToPremium();
              }}
              testID="upgrade-premium-btn"
            >
              {isPurchasing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Crown size={18} color="#FFFFFF" />
                  <Text style={st.upgradeBtnText}>Unlock Premium — {annualPrice}</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={st.upgradeDismissBtn}
              disabled={isPurchasing || isRestoring}
              onPress={() => { restorePurchases(); }}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color="#AEAEB2" />
              ) : (
                <Text style={st.upgradeDismissText}>Restore Purchases</Text>
              )}
            </Pressable>

            <Pressable
              style={st.upgradeDismissBtn}
              disabled={isPurchasing || isRestoring}
              onPress={() => setShowUpgradeModal(false)}
            >
              <Text style={st.upgradeDismissText}>Maybe Later</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center' },
  topTitle: { fontSize: 16, fontWeight: '700' as const, color: '#F5F5F7' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },

  heroSection: { alignItems: 'center', marginBottom: 28 },
  heroIllustration: { width: 80, height: 80, borderRadius: 20, marginBottom: 14 },
  heroSub: { fontSize: 14, color: '#8E8E93', textAlign: 'center' as const, lineHeight: 20, paddingHorizontal: 16 },

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, backgroundColor: '#3B82F6' },
  actionBtnPrimaryText: { fontSize: 15, fontWeight: '600' as const, color: '#FFFFFF' },
  actionBtnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A' },
  actionBtnSecondaryText: { fontSize: 15, fontWeight: '600' as const, color: '#F5F5F7' },

  progressCard: { backgroundColor: '#0A84FF18', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#0A84FF30' },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  progressText: { fontSize: 14, fontWeight: '600' as const, color: '#0A84FF' },
  progressBarBg: { height: 6, backgroundColor: '#2A2A2A', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: 6, backgroundColor: '#0A84FF', borderRadius: 3 },
  progressHint: { fontSize: 12, color: '#636366', lineHeight: 16 },



  capabilitiesSection: { marginTop: 8 },
  capabilitiesTitle: { fontSize: 13, fontWeight: '600' as const, color: '#636366', letterSpacing: 0.5, marginBottom: 14, textTransform: 'uppercase' as const },
  capRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  capIconWrap: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  capTextCol: { flex: 1 },
  capLabel: { fontSize: 14, fontWeight: '600' as const, color: '#F5F5F7' },
  capDesc: { fontSize: 12, color: '#8E8E93', marginTop: 1 },

  receiptContainer: { marginBottom: 4 },
  receiptZigzagTop: { height: 10, backgroundColor: '#0A0A0A', borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  receiptBody: { backgroundColor: '#FAFAF5', paddingHorizontal: 20, paddingVertical: 20 },
  receiptHeader: { alignItems: 'center' as const, marginBottom: 4 },
  receiptStoreName: { fontSize: 20, fontWeight: '900' as const, color: '#1A1A1A', letterSpacing: 3, textTransform: 'uppercase' as const },
  receiptStoreAddr: { fontSize: 11, color: '#8A8A8A', fontWeight: '500' as const, marginTop: 2, letterSpacing: 0.5 },
  receiptDate: { fontSize: 10, color: '#8A8A8A', fontWeight: '500' as const, marginTop: 4, letterSpacing: 0.3 },
  receiptDblLine: { marginVertical: 8 },
  receiptDblLineInner: { height: 1, backgroundColor: '#1A1A1A' },
  receiptImageSection: { marginVertical: 10 },
  receiptDualImages: { flexDirection: 'row', gap: 8, height: 150 },
  receiptImgWrap: { flex: 1, borderWidth: 1, borderColor: '#D0D0D0', overflow: 'hidden', position: 'relative' as const, backgroundColor: '#F0F0EA' },
  receiptImg: { width: '100%', height: '100%' },
  receiptImgLabel: { position: 'absolute' as const, bottom: 4, left: 0, right: 0, textAlign: 'center' as const, fontSize: 8, fontWeight: '700' as const, color: '#8A8A8A', letterSpacing: 1.5, textTransform: 'uppercase' as const },
  receiptSoloImgWrap: { height: 180, borderWidth: 1, borderColor: '#D0D0D0', overflow: 'hidden', position: 'relative' as const, backgroundColor: '#F0F0EA' },
  receiptSoloImg: { width: '100%', height: '100%' },
  receiptImgOverlay: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, backgroundColor: 'rgba(250,250,245,0.85)' },
  receiptImgOverlayText: { fontSize: 11, fontWeight: '600' as const, color: '#4A4A4A' },
  receiptDashLine: { alignItems: 'center' as const, overflow: 'hidden', marginVertical: 8 },
  receiptDashText: { fontSize: 12, color: '#BFBFBF', letterSpacing: 2 },
  receiptItemHeader: { alignItems: 'center' as const, marginVertical: 6 },
  receiptItemName: { fontSize: 18, fontWeight: '900' as const, color: '#1A1A1A', textAlign: 'center' as const, letterSpacing: -0.3 },
  receiptItemCategory: { fontSize: 11, fontWeight: '500' as const, color: '#8A8A8A', marginTop: 2, textTransform: 'uppercase' as const, letterSpacing: 1 },
  receiptMetaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8, marginBottom: 4, justifyContent: 'center' as const },
  receiptTypeBadge: { borderWidth: 1, borderColor: '#1A1A1A', paddingHorizontal: 8, paddingVertical: 3 },
  receiptTypeBadgeText: { fontSize: 9, fontWeight: '800' as const, color: '#1A1A1A', letterSpacing: 1, textTransform: 'uppercase' as const },
  receiptConfBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#D0D0D0', paddingHorizontal: 8, paddingVertical: 3 },
  receiptConfDot: { width: 5, height: 5, borderRadius: 3 },
  receiptConfText: { fontSize: 9, fontWeight: '700' as const, letterSpacing: 0.5 },
  receiptSummary: { marginVertical: 6, paddingVertical: 6 },
  receiptSummaryText: { fontSize: 12, color: '#4A4A4A', lineHeight: 17, fontWeight: '500' as const, textAlign: 'center' as const },
  receiptDetailsSection: { marginVertical: 4 },
  receiptFooter: { alignItems: 'center' as const, marginTop: 4, gap: 4 },
  receiptFooterText: { fontSize: 10, color: '#8A8A8A', fontWeight: '500' as const, letterSpacing: 0.8 },
  receiptThankYou: { fontSize: 12, fontWeight: '800' as const, color: '#1A1A1A', letterSpacing: 2, marginTop: 6, textTransform: 'uppercase' as const },
  receiptBarcode: { fontSize: 18, color: '#1A1A1A', letterSpacing: 1, marginTop: 6, fontWeight: '400' as const },
  receiptZigzagBottom: { height: 10, backgroundColor: '#0A0A0A', borderTopLeftRadius: 4, borderTopRightRadius: 4 },

  newScanBtnReceipt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12, backgroundColor: '#1A1A1A', marginTop: 16, borderWidth: 1, borderColor: '#333333' },
  newScanBtnTextReceipt: { fontSize: 15, fontWeight: '700' as const, color: '#F5F5F7', letterSpacing: 0.3 },
  deleteResultBtnReceipt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 8 },
  deleteResultBtnTextReceipt: { fontSize: 13, fontWeight: '600' as const, color: '#FF453A' },

  historySection: { backgroundColor: '#1A1A1A', borderRadius: 16, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#2A2A2A' },
  historyHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  historyHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyHeaderTitle: { fontSize: 15, fontWeight: '700' as const, color: '#F5F5F7' },
  historyCountBadge: { backgroundColor: '#3B82F6', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  historyCountText: { fontSize: 11, fontWeight: '700' as const, color: '#FFFFFF' },
  historyList: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#2A2A2A' },
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2A2A2A', gap: 12 },
  historyItemIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  historyItemInfo: { flex: 1 },
  historyItemName: { fontSize: 14, fontWeight: '600' as const, color: '#F5F5F7' },
  historyItemMeta: { fontSize: 12, fontWeight: '400' as const, color: '#8E8E93', marginTop: 1 },
  historyDeleteBtn: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  upgradeHistoryCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFD60A12', gap: 12 },
  upgradeHistoryIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFD60A18', justifyContent: 'center', alignItems: 'center' },
  upgradeHistoryInfo: { flex: 1 },
  upgradeHistoryTitle: { fontSize: 13, fontWeight: '600' as const, color: '#FFD60A' },
  upgradeHistorySubtext: { fontSize: 11, fontWeight: '400' as const, color: '#D4A017', marginTop: 1 },
  limitNotice: { paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  limitNoticeText: { fontSize: 11, fontWeight: '500' as const, color: '#636366' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  upgradeModal: { backgroundColor: '#1C1C1E', borderRadius: 24, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  upgradeModalIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#FFD60A18', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#FFD60A30' },
  upgradeModalTitle: { fontSize: 20, fontWeight: '800' as const, color: '#F5F5F7', letterSpacing: -0.5, marginBottom: 8 },
  upgradeModalDesc: { fontSize: 14, color: '#8E8E93', textAlign: 'center' as const, lineHeight: 20, marginBottom: 20 },
  upgradeFeatures: { width: '100%', gap: 10, marginBottom: 24 },
  upgradeFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  upgradeFeatureText: { fontSize: 14, fontWeight: '500' as const, color: '#F5F5F7' },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D97706', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, width: '100%', marginBottom: 10 },
  upgradeBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
  upgradeDismissBtn: { paddingVertical: 10 },
  upgradeDismissText: { fontSize: 14, fontWeight: '500' as const, color: '#636366' },
});
