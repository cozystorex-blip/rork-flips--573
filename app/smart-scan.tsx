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
  ShieldAlert,
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
  Sparkles,
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

function getScanError(msg: string): string {
  if (msg.includes('Failed to read image') || msg.includes('corrupted')) {
    return 'Could not read this image. The file may be corrupted — try taking a new photo.';
  }
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('fetch')) {
    return 'Network issue — please check your connection and try again.';
  }
  if (msg.includes('Failed to process')) {
    return 'Could not process this image. Try a different photo with better lighting.';
  }
  return 'Could not analyze this image. Try a clearer photo or different angle.';
}

export default function SmartScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ historyEntryId?: string }>();

  const [scanning, setScanning] = useState<boolean>(false);
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle');
  const [scanError, setScanError] = useState<string | null>(null);
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
    setScanError(null);
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
      setScanPhase('error');
      progressWidth.setValue(0);
      setScanError(getScanError(msg));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setScanning(false);
      stopPulse();
    }
  }, [startPulse, stopPulse, animateProgress, progressWidth, resultFade, addEntry, router]);

  const resetScan = useCallback(() => {
    setResult(null);
    setReferenceImageUrl(null);
    setScannedImageUri(null);
    setViewingEntryId(null);
    setScanError(null);
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
      case 'unknown': return <UnknownResultSection result={result} />;
      default: return null;
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

            {scanError && !scanning && (
              <View style={st.errorCard}>
                <View style={st.errorHeader}>
                  <ShieldAlert size={18} color="#DC2626" />
                  <Text style={st.errorTitle}>Scan Issue</Text>
                </View>
                <Text style={st.errorMessage}>{scanError}</Text>
                <View style={st.errorActions}>
                  <Pressable style={st.retryBtn} onPress={() => void handleCapture('camera')}>
                    <RefreshCw size={14} color="#F5F5F7" />
                    <Text style={st.retryBtnText}>Retake</Text>
                  </Pressable>
                  <Pressable style={st.retryBtn} onPress={() => void handleCapture('gallery')}>
                    <ImageIcon size={14} color="#F5F5F7" />
                    <Text style={st.retryBtnText}>Upload</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {!scanning && !scanError && entries.length > 0 && (
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

            {!scanning && !scanError && (
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
            <View style={st.imageHero}>
              {scannedImageUri && referenceImageUrl ? (
                <View style={st.dualImageRow}>
                  <View style={st.dualImageWrap}>
                    <ExpoImage
                      source={{ uri: scannedImageUri }}
                      style={st.dualImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    <View style={st.imageLabelLeft}>
                      <Camera size={9} color="#FFFFFF" />
                      <Text style={st.imageLabelText}>Scan</Text>
                    </View>
                  </View>
                  <View style={st.dualImageWrap}>
                    <ExpoImage
                      source={{ uri: referenceImageUrl }}
                      style={st.dualImage}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />
                    <View style={st.imageLabelRight}>
                      <Sparkles size={9} color="#93C5FD" />
                      <Text style={st.imageLabelTextAi}>AI Match</Text>
                    </View>
                  </View>
                </View>
              ) : scannedImageUri ? (
                <View style={st.soloImageWrap}>
                  <ExpoImage
                    source={{ uri: scannedImageUri }}
                    style={st.soloImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                  {generatingImage && (
                    <View style={st.generatingOverlay}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={st.generatingText}>Creating AI reference...</Text>
                    </View>
                  )}
                </View>
              ) : referenceImageUrl ? (
                <View style={st.soloImageWrap}>
                  <ExpoImage
                    source={{ uri: referenceImageUrl }}
                    style={st.soloImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                </View>
              ) : generatingImage ? (
                <View style={st.imagePlaceholder}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text style={st.imagePlaceholderText}>Generating reference...</Text>
                </View>
              ) : null}
            </View>

            <View style={st.resultIdentity}>
              <View style={st.resultIdentityTop}>
                {typeConfig && (
                  <View style={[st.resultTypeIcon, { backgroundColor: `${typeConfig.color}20` }]}>
                    <typeConfig.Icon size={18} color={typeConfig.color} />
                  </View>
                )}
                <View style={st.resultIdentityText}>
                  <Text style={st.resultName}>{result.item_name}</Text>
                  <Text style={st.resultCategory}>{result.category}</Text>
                </View>
              </View>
              <View style={st.resultBadgeRow}>
                {typeConfig && (
                  <View style={[st.typeBadge, { backgroundColor: `${typeConfig.color}18` }]}>
                    <Text style={[st.typeBadgeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
                  </View>
                )}
                <View style={[st.confBadge, { backgroundColor: `${confidenceColor}18` }]}>
                  <View style={[st.confDot, { backgroundColor: confidenceColor }]} />
                  <Text style={[st.confText, { color: confidenceColor }]}>{confidenceLabel}</Text>
                </View>
              </View>
            </View>

            {result.short_summary ? (
              <View style={st.summaryStrip}>
                <Text style={st.summaryStripText}>{result.short_summary}</Text>
              </View>
            ) : null}

            <View style={st.resultCard}>
              {resultSection}
            </View>

            <View style={st.resultActionsRow}>
              <Pressable style={st.newScanBtn} onPress={resetScan} testID="smart-scan-again">
                <RefreshCw size={15} color="#FFFFFF" />
                <Text style={st.newScanBtnText}>Scan Another Item</Text>
              </Pressable>
              {viewingEntryId && (
                <Pressable
                  style={st.deleteResultBtn}
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
                  <Trash2 size={15} color="#FF453A" />
                </Pressable>
              )}
            </View>
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

  errorCard: { backgroundColor: '#FF453A18', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FF453A30' },
  errorHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  errorTitle: { fontSize: 15, fontWeight: '700' as const, color: '#FF453A' },
  errorMessage: { fontSize: 13, color: '#FF6961', lineHeight: 18, marginBottom: 14 },
  errorActions: { flexDirection: 'row', gap: 8 },
  retryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A' },
  retryBtnText: { fontSize: 12, fontWeight: '600' as const, color: '#F5F5F7' },

  capabilitiesSection: { marginTop: 8 },
  capabilitiesTitle: { fontSize: 13, fontWeight: '600' as const, color: '#636366', letterSpacing: 0.5, marginBottom: 14, textTransform: 'uppercase' as const },
  capRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  capIconWrap: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  capTextCol: { flex: 1 },
  capLabel: { fontSize: 14, fontWeight: '600' as const, color: '#F5F5F7' },
  capDesc: { fontSize: 12, color: '#8E8E93', marginTop: 1 },

  imageHero: { marginBottom: 16 },
  dualImageRow: { flexDirection: 'row', gap: 8, height: 190 },
  dualImageWrap: { flex: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: '#151515', position: 'relative' as const },
  dualImage: { width: '100%', height: '100%' },
  imageLabelLeft: { position: 'absolute' as const, bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  imageLabelRight: { position: 'absolute' as const, bottom: 6, right: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  imageLabelText: { fontSize: 9, fontWeight: '700' as const, color: '#FFFFFF', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  imageLabelTextAi: { fontSize: 9, fontWeight: '700' as const, color: '#93C5FD', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  soloImageWrap: { height: 220, borderRadius: 14, overflow: 'hidden', backgroundColor: '#151515', position: 'relative' as const },
  soloImage: { width: '100%', height: '100%' },
  generatingOverlay: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.6)' },
  generatingText: { fontSize: 12, fontWeight: '600' as const, color: '#D1D1D6' },
  imagePlaceholder: { height: 140, borderRadius: 14, backgroundColor: '#151515', borderWidth: 1, borderColor: '#222', justifyContent: 'center', alignItems: 'center', gap: 8 },
  imagePlaceholderText: { fontSize: 12, color: '#636366', fontWeight: '500' as const },

  resultIdentity: { marginBottom: 12 },
  resultIdentityTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  resultTypeIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  resultIdentityText: { flex: 1 },
  resultName: { fontSize: 21, fontWeight: '800' as const, color: '#F5F5F7', letterSpacing: -0.4 },
  resultCategory: { fontSize: 12, fontWeight: '500' as const, color: '#8E8E93', marginTop: 1 },
  resultBadgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' as const },
  confBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  confDot: { width: 5, height: 5, borderRadius: 3 },
  confText: { fontSize: 11, fontWeight: '700' as const },

  summaryStrip: { backgroundColor: '#161616', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#1E1E1E' },
  summaryStripText: { fontSize: 13, color: '#C7C7CC', lineHeight: 19, fontWeight: '500' as const },

  resultCard: { backgroundColor: '#141414', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#1E1E1E', marginBottom: 4 },

  resultActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  newScanBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#3B82F6' },
  newScanBtnText: { fontSize: 15, fontWeight: '600' as const, color: '#FFFFFF' },
  deleteResultBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center' },

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
