import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Animated,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import {
  Camera,
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
  Shirt,
  Smartphone,
  Scan,
  Lamp,
  Sparkles,
  ShieldCheck,
  Info,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import type { SmartScanItemType } from '@/services/smartScanService';
import { useScanHistory } from '@/contexts/ScanHistoryContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useScanProcess, PHASE_MESSAGES } from '@/contexts/ScanProcessContext';
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
  DocumentResultSection,
} from '@/components/scan/ScanResultRenderers';
import {
  ScannerTopBar,
  ScannerActionButtons,
  ScannerProgressCard,
  ScannerResultActions,
  ConfidenceBadge,
  getConfidenceInfo,
} from '@/components/scan/ScannerComponents';
import { ResaleInsightsSection } from '@/components/scan/ResaleInsightsSection';
import ReferenceSection from '@/components/scan/ReferenceSection';
import { ScannerColors, ScannerRadius, ScannerSpacing } from '@/constants/scannerTheme';

export const TYPE_CONFIG: Record<SmartScanItemType, { label: string; color: string; bg: string; Icon: React.ComponentType<{ size: number; color: string }> }> = {
  food: { label: 'Food Item', color: '#16A34A', bg: '#16A34A18', Icon: Flame },
  grocery: { label: 'Grocery Product', color: '#2563EB', bg: '#2563EB18', Icon: Package },
  household: { label: 'Home / Household', color: '#7C3AED', bg: '#7C3AED18', Icon: Lamp },
  furniture: { label: 'Furniture', color: '#0058A3', bg: '#0058A318', Icon: Sofa },
  fashion: { label: 'Fashion Item', color: '#E11D48', bg: '#E11D4818', Icon: Shirt },
  electronics: { label: 'Electronics', color: '#0284C7', bg: '#0284C718', Icon: Smartphone },
  general: { label: 'Item Identified', color: '#0D9488', bg: '#0D948818', Icon: Scan },
  receipt: { label: 'Receipt Detected', color: '#DC2626', bg: '#DC262618', Icon: Receipt },
  document: { label: 'Document / Content', color: '#8B5CF6', bg: '#8B5CF618', Icon: ImageIcon },
  unknown: { label: 'Unknown Item', color: '#6B7280', bg: '#6B728018', Icon: HelpCircle },
};


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

  const {
    scanning,
    scanPhase,
    result,
    referenceImageUrl,
    scannedImageUri,
    generatingImage,
    viewingEntryId,
    pendingReceiptNav,
    handleCapture,
    resetScan,
    loadHistoryEntry,
    consumeReceiptNav,
  } = useScanProcess();

  const [showReferenceSection, setShowReferenceSection] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const hasAutoLaunched = useRef(false);

  const { entries, totalCount, hiddenCount, hasHiddenEntries, isAtFreeLimit, deleteEntry, freeLimit } = useScanHistory();
  const { isPremium, upgradeToPremium, restorePurchases, isPurchasing, isRestoring, annualPrice } = usePremium();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const resultFade = useRef(new Animated.Value(0)).current;

  const hasNavigatedRef = useRef(false);
  const historyLoadedRef = useRef(false);

  useEffect(() => {
    if (!hasAutoLaunched.current && !result && !scanning && !params.historyEntryId && !viewingEntryId) {
      hasAutoLaunched.current = true;
      console.log('[SmartScan] Auto-launching camera on open');
      void handleCapture('camera');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pendingReceiptNav) {
      consumeReceiptNav();
      if (!hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        router.push({ pathname: '/log-entry', params: { mode: 'receipt' } });
      }
    }
  }, [pendingReceiptNav, consumeReceiptNav, router]);

  useEffect(() => {
    if (historyLoadedRef.current) return;

    const targetId = params.historyEntryId;
    if (!targetId) return;

    if (viewingEntryId === targetId && result) {
      console.log('[SmartScan] Entry already loaded by caller, showing result');
      resultFade.setValue(1);
      historyLoadedRef.current = true;
      return;
    }

    if (entries.length === 0) return;

    const entry = entries.find((e) => e.id === targetId);
    if (entry) {
      console.log('[SmartScan] Loading history entry from lookup:', entry.result.item_name);
      if (entry.result.item_type === 'receipt') {
        historyLoadedRef.current = true;
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          router.push({ pathname: '/log-entry', params: { mode: 'receipt' } });
        }
        return;
      }
      loadHistoryEntry({ result: entry.result, imageUri: entry.imageUri, id: entry.id });
      resultFade.setValue(1);
      historyLoadedRef.current = true;
    } else {
      console.log('[SmartScan] Entry not found in history:', targetId);
      historyLoadedRef.current = true;
    }
  }, [entries, result, resultFade, router, loadHistoryEntry, viewingEntryId, params.historyEntryId]);

  useEffect(() => {
    if (scanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();

      if (scanPhase === 'preprocessing') {
        Animated.timing(progressWidth, { toValue: 20, duration: 1200, useNativeDriver: false }).start();
      } else if (scanPhase === 'analyzing') {
        Animated.timing(progressWidth, { toValue: 40, duration: 5000, useNativeDriver: false }).start();
      } else if (scanPhase === 'generating_image') {
        Animated.timing(progressWidth, { toValue: 85, duration: 3000, useNativeDriver: false }).start();
      }
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [scanning, scanPhase, pulseAnim, progressWidth]);

  useEffect(() => {
    if (scanPhase === 'done' && result) {
      Animated.timing(progressWidth, { toValue: 100, duration: 300, useNativeDriver: false }).start();
      Animated.timing(resultFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    } else if (scanPhase === 'idle') {
      progressWidth.setValue(0);
      resultFade.setValue(0);
    }
  }, [scanPhase, result, progressWidth, resultFade]);

  const handleResetScan = useCallback(() => {
    resetScan();
    setShowReferenceSection(false);
    hasNavigatedRef.current = false;
  }, [resetScan]);

  const typeConfig = result ? TYPE_CONFIG[result.item_type] : null;

  const confidenceInfo = useMemo(() => {
    if (!result) return { label: '', color: '#6B7280', isLow: false, isVeryLow: false };
    return getConfidenceInfo(result.confidence);
  }, [result]);

  const { isLow: isLowConfidence } = confidenceInfo;

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
      case 'document': return <DocumentResultSection result={result} />;
      case 'unknown': return <UnknownResultSection result={result} />;
      default: return <UnknownResultSection result={result} />;
    }
  }, [result]);

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScannerTopBar
        title="Smart Scanner"
        onClose={() => router.back()}
        paddingTop={insets.top}
        testID="close-smart-scan"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {!result && (
          <>
            <ScannerActionButtons
              onCamera={() => void handleCapture('camera')}
              onGallery={() => void handleCapture('gallery')}
              scanning={scanning}
              cameraTestID="smart-scan-camera"
              galleryTestID="smart-scan-gallery"
            />

            {scanning && (
              <ScannerProgressCard
                phaseMessage={PHASE_MESSAGES[scanPhase]}
                phaseHint={
                  scanPhase === 'preprocessing' ? 'Optimizing image for best results...' :
                  scanPhase === 'analyzing' ? 'AI is analyzing your item...' :
                  scanPhase === 'generating_image' ? 'Creating a reference image...' :
                  scanPhase === 'done' ? 'Analysis complete!' : ''
                }
                progressWidth={progressWidth}
                pulseAnim={pulseAnim}
              />
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
                            loadHistoryEntry({ result: entry.result, imageUri: entry.imageUri, id: entry.id });
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


          </>
        )}

        {result && (
          <Animated.View style={{ opacity: resultFade }}>
            <View style={st.imageGallery}>
              {scannedImageUri && (
                <Pressable
                  style={st.scannedImageContainer}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setShowReferenceSection(prev => !prev);
                    console.log('[SmartScan] Photo tapped, toggling reference section');
                  }}
                  testID="scan-photo-tap"
                >
                  <ExpoImage
                    source={{ uri: scannedImageUri }}
                    style={st.scannedImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                  <View style={st.scannedImageBadge}>
                    <Camera size={10} color="#FFFFFF" />
                    <Text style={st.scannedImageBadgeText}>Your Scan</Text>
                  </View>
                  <View style={st.tapHintBadge}>
                    <Text style={st.tapHintText}>{showReferenceSection ? 'Tap to close' : 'Tap for reference'}</Text>
                  </View>
                </Pressable>
              )}
              {(referenceImageUrl || generatingImage) && (
                <View style={st.referenceImageContainer}>
                  {referenceImageUrl ? (
                    <ExpoImage
                      source={{ uri: referenceImageUrl }}
                      style={scannedImageUri ? st.referenceImageSmall : st.referenceImage}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={scannedImageUri ? st.referenceImagePlaceholderSmall : st.referenceImagePlaceholder}>
                      <ActivityIndicator size="small" color="#3B82F6" />
                      <Text style={st.referenceImageLoadingText}>Creating reference...</Text>
                    </View>
                  )}
                  <View style={st.referenceImageBadge}>
                    <Sparkles size={10} color="#3B82F6" />
                    <Text style={st.referenceImageBadgeText}>AI Reference</Text>
                  </View>
                </View>
              )}
            </View>

            {result && (
              <ReferenceSection
                result={result}
                referenceImageUrl={referenceImageUrl}
                visible={showReferenceSection}
              />
            )}

            <View style={st.resultHeader}>
              <Text style={st.resultItemName}>
                {confidenceInfo.isVeryLow ? 'Item Not Confidently Identified' : result.item_name}
              </Text>
              {result.trustResult && result.trustResult.title.verificationStatus !== 'confirmed' && !isLowConfidence && (
                <View style={st.unverifiedTitleBadge}>
                  <Info size={10} color={ScannerColors.amber} />
                  <Text style={st.unverifiedTitleText}>Exact product unverified</Text>
                </View>
              )}
              <View style={st.resultMetaRow}>
                {typeConfig && (
                  <View style={[st.typeBadge, { backgroundColor: typeConfig.bg }]}>
                    <typeConfig.Icon size={12} color={typeConfig.color} />
                    <Text style={[st.typeBadgeText, { color: typeConfig.color }]}>
                      {confidenceInfo.isVeryLow ? 'Low Confidence Scan' : typeConfig.label}
                    </Text>
                  </View>
                )}
                <ConfidenceBadge confidence={result.confidence} />
              </View>
              {result.trustResult && (
                <View style={st.verificationSummaryRow}>
                  <ShieldCheck size={12} color={ScannerColors.textMuted} />
                  <Text style={st.verificationSummaryText}>{result.trustResult.verificationSummary}</Text>
                </View>
              )}
            </View>

            {isLowConfidence && (
              <View style={st.lowConfidenceCard}>
                <Text style={st.lowConfidenceTitle}>Why this result may be inaccurate</Text>
                <Text style={st.lowConfidenceText}>
                  {result.confidence < 0.3
                    ? 'The image was too unclear, dark, or ambiguous to identify with confidence. Try scanning again with better lighting or a closer angle.'
                    : 'This scan had limited visual information. The result is a best guess — details may not be fully accurate.'}
                </Text>
              </View>
            )}

            {result.short_summary ? (
              <View style={st.summaryCard}>
                <Text style={st.summaryText}>{result.short_summary}</Text>
              </View>
            ) : null}

            <View style={st.detailsSection}>
              {resultSection}
            </View>

            <ResaleInsightsSection result={result} />

            <ScannerResultActions
              onScanAgain={handleResetScan}
              onTryDifferent={() => void handleCapture('gallery')}
              showTryDifferent={isLowConfidence}
              onDelete={viewingEntryId ? () => {
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
                        handleResetScan();
                      },
                    },
                  ]
                );
              } : undefined}
              scanAgainTestID="smart-scan-again"
              tryDifferentTestID="smart-scan-gallery-retry"
              deleteTestID="delete-scan-result"
            />
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
  container: { flex: 1, backgroundColor: ScannerColors.bg },
  scrollContent: { paddingHorizontal: ScannerSpacing.xl, paddingTop: ScannerSpacing.xxl },

  heroSection: { alignItems: 'center', marginBottom: 28 },
  heroIllustration: { width: 80, height: 80, borderRadius: ScannerRadius.xxl, marginBottom: 14 },
  heroSub: { fontSize: 14, color: ScannerColors.textSecondary, textAlign: 'center' as const, lineHeight: 20, paddingHorizontal: ScannerSpacing.lg },

  capabilitiesSection: { marginTop: 8 },
  capabilitiesTitle: { fontSize: 13, fontWeight: '600' as const, color: ScannerColors.textMuted, letterSpacing: 0.5, marginBottom: 14, textTransform: 'uppercase' as const },
  capRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, marginBottom: 14 },
  capIconWrap: { width: 38, height: 38, borderRadius: ScannerRadius.md, justifyContent: 'center' as const, alignItems: 'center' as const },
  capTextCol: { flex: 1 },
  capLabel: { fontSize: 14, fontWeight: '600' as const, color: ScannerColors.text },
  capDesc: { fontSize: 12, color: ScannerColors.textSecondary, marginTop: 1 },

  imageGallery: { flexDirection: 'row' as const, gap: 10, marginBottom: ScannerSpacing.lg },
  scannedImageContainer: { flex: 1, position: 'relative' as const, borderRadius: ScannerRadius.xxl, overflow: 'hidden' as const },
  scannedImage: { width: '100%' as const, height: 200, borderRadius: ScannerRadius.xxl, backgroundColor: ScannerColors.card },
  scannedImageBadge: { position: 'absolute' as const, bottom: 8, left: 8, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: ScannerRadius.sm },
  scannedImageBadgeText: { fontSize: 10, fontWeight: '600' as const, color: '#FFFFFF' },
  tapHintBadge: { position: 'absolute' as const, top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: ScannerRadius.sm },
  tapHintText: { fontSize: 9, fontWeight: '600' as const, color: 'rgba(255,255,255,0.85)' },
  referenceImageContainer: { flex: 1, position: 'relative' as const, borderRadius: ScannerRadius.xxl, overflow: 'hidden' as const },
  referenceImage: { width: '100%' as const, height: 220, borderRadius: ScannerRadius.xxl, backgroundColor: ScannerColors.card },
  referenceImageSmall: { width: '100%' as const, height: 200, borderRadius: ScannerRadius.xxl, backgroundColor: ScannerColors.card },
  referenceImagePlaceholder: { width: '100%' as const, height: 160, borderRadius: ScannerRadius.xxl, backgroundColor: ScannerColors.card, borderWidth: 1, borderColor: ScannerColors.cardBorder, justifyContent: 'center' as const, alignItems: 'center' as const, gap: 8 },
  referenceImagePlaceholderSmall: { width: '100%' as const, height: 200, borderRadius: ScannerRadius.xxl, backgroundColor: ScannerColors.card, borderWidth: 1, borderColor: ScannerColors.cardBorder, justifyContent: 'center' as const, alignItems: 'center' as const, gap: 8 },
  referenceImageLoadingText: { fontSize: 11, color: ScannerColors.textMuted, fontWeight: '500' as const, textAlign: 'center' as const },
  referenceImageBadge: { position: 'absolute' as const, bottom: 8, right: 8, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: ScannerRadius.sm },
  referenceImageBadgeText: { fontSize: 10, fontWeight: '600' as const, color: '#BFDBFE' },

  resultHeader: { marginBottom: ScannerSpacing.md },
  resultItemName: { fontSize: 22, fontWeight: '800' as const, color: ScannerColors.text, letterSpacing: -0.5, marginBottom: 8 },
  resultMetaRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, alignItems: 'center' as const },
  typeBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: ScannerRadius.sm },
  typeBadgeText: { fontSize: 12, fontWeight: '600' as const },

  summaryCard: { backgroundColor: '#F0FDF4', borderRadius: ScannerRadius.lg, padding: 14, marginBottom: ScannerSpacing.lg, borderWidth: 1, borderColor: '#BBF7D0' },
  summaryText: { fontSize: 14, color: '#166534', lineHeight: 20 },

  detailsSection: { backgroundColor: '#FFFFFF', borderRadius: ScannerRadius.xxl, padding: ScannerSpacing.lg, marginBottom: ScannerSpacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },

  lowConfidenceCard: { backgroundColor: ScannerColors.warningBg, borderRadius: ScannerRadius.lg, padding: 14, marginBottom: ScannerSpacing.md, borderWidth: 1, borderColor: ScannerColors.warningBorder },
  lowConfidenceTitle: { fontSize: 13, fontWeight: '700' as const, color: ScannerColors.warning, marginBottom: 4 },
  lowConfidenceText: { fontSize: 12, color: ScannerColors.textSecondary, lineHeight: 17 },

  historySection: { backgroundColor: ScannerColors.card, borderRadius: ScannerRadius.xxl, marginBottom: ScannerSpacing.xl, overflow: 'hidden' as const, borderWidth: 1, borderColor: ScannerColors.cardBorder },
  historyHeaderRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingHorizontal: ScannerSpacing.lg, paddingVertical: 14 },
  historyHeaderLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  historyHeaderTitle: { fontSize: 15, fontWeight: '700' as const, color: ScannerColors.text },
  historyCountBadge: { backgroundColor: ScannerColors.accent, paddingHorizontal: 7, paddingVertical: 2, borderRadius: ScannerRadius.sm },
  historyCountText: { fontSize: 11, fontWeight: '700' as const, color: '#FFFFFF' },
  historyList: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ScannerColors.cardBorder },
  historyItem: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: ScannerSpacing.lg, paddingVertical: ScannerSpacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ScannerColors.cardBorder, gap: 12 },
  historyItemIcon: { width: 36, height: 36, borderRadius: ScannerRadius.md, justifyContent: 'center' as const, alignItems: 'center' as const },
  historyItemInfo: { flex: 1 },
  historyItemName: { fontSize: 14, fontWeight: '600' as const, color: ScannerColors.text },
  historyItemMeta: { fontSize: 12, fontWeight: '400' as const, color: ScannerColors.textSecondary, marginTop: 1 },
  historyDeleteBtn: { width: 28, height: 28, borderRadius: ScannerRadius.sm, justifyContent: 'center' as const, alignItems: 'center' as const },
  upgradeHistoryCard: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: ScannerSpacing.lg, paddingVertical: 14, backgroundColor: ScannerColors.amberBg, gap: 12 },
  upgradeHistoryIcon: { width: 36, height: 36, borderRadius: ScannerRadius.md, backgroundColor: ScannerColors.amberBg, justifyContent: 'center' as const, alignItems: 'center' as const },
  upgradeHistoryInfo: { flex: 1 },
  upgradeHistoryTitle: { fontSize: 13, fontWeight: '600' as const, color: '#92400E' },
  upgradeHistorySubtext: { fontSize: 11, fontWeight: '400' as const, color: ScannerColors.amber, marginTop: 1 },
  limitNotice: { paddingHorizontal: ScannerSpacing.lg, paddingVertical: 10, alignItems: 'center' as const },
  limitNoticeText: { fontSize: 11, fontWeight: '500' as const, color: ScannerColors.textMuted },

  modalOverlay: { flex: 1, backgroundColor: ScannerColors.overlay, justifyContent: 'center' as const, alignItems: 'center' as const, padding: ScannerSpacing.xxl },
  upgradeModal: { backgroundColor: '#FFFFFF', borderRadius: ScannerRadius.xxl + 8, padding: 28, width: '100%' as const, maxWidth: 360, alignItems: 'center' as const, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 8 },
  upgradeModalIcon: { width: 64, height: 64, borderRadius: ScannerRadius.xxl, backgroundColor: ScannerColors.amberBg, justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: ScannerSpacing.lg, borderWidth: 1, borderColor: ScannerColors.amberBorder },
  upgradeModalTitle: { fontSize: 20, fontWeight: '800' as const, color: ScannerColors.text, letterSpacing: -0.5, marginBottom: 8 },
  upgradeModalDesc: { fontSize: 14, color: ScannerColors.textSecondary, textAlign: 'center' as const, lineHeight: 20, marginBottom: ScannerSpacing.xl },
  upgradeFeatures: { width: '100%' as const, gap: 10, marginBottom: ScannerSpacing.xxl },
  upgradeFeatureRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  upgradeFeatureText: { fontSize: 14, fontWeight: '500' as const, color: ScannerColors.text },
  upgradeBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, backgroundColor: ScannerColors.amber, paddingVertical: 16, paddingHorizontal: 32, borderRadius: ScannerRadius.xl, width: '100%' as const, marginBottom: 10 },
  upgradeBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
  upgradeDismissBtn: { paddingVertical: 10 },
  upgradeDismissText: { fontSize: 14, fontWeight: '500' as const, color: ScannerColors.textMuted },

  unverifiedTitleBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, backgroundColor: ScannerColors.amberBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: ScannerRadius.sm, marginBottom: 6, alignSelf: 'flex-start' as const, borderWidth: 1, borderColor: ScannerColors.amberBorder },
  unverifiedTitleText: { fontSize: 11, fontWeight: '600' as const, color: ScannerColors.amber },
  verificationSummaryRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, marginTop: 8 },
  verificationSummaryText: { fontSize: 11, fontWeight: '500' as const, color: ScannerColors.textMuted },
});
