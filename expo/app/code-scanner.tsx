import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Linking,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Zap,
  ZapOff,
  Copy,
  ExternalLink,
  X,
  ScanLine,
  History,
  Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useIsForeground } from '@/hooks/useIsForeground';
import {
  mapExpoBarcodeType,
  getCodeTypeLabel,
  isUrlValue,
  ALL_CODE_TYPES,
  mapCodeTypeToExpo,
} from '@/types/codeScanner';
import type { Code, ScannedCodeResult } from '@/types/codeScanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.68;

const BARCODE_TYPES = ALL_CODE_TYPES.map(mapCodeTypeToExpo) as Array<
  'qr' | 'ean13' | 'ean8' | 'code128' | 'code39' | 'code93' | 'codabar' | 'itf14' | 'upc_e' | 'upc_a' | 'pdf417' | 'aztec' | 'datamatrix'
>;

export default function CodeScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isForeground = useIsForeground();
  const [permission, requestPermission] = useCameraPermissions();

  const [torch, setTorch] = useState(false);
  const [lastScanned, setLastScanned] = useState<ScannedCodeResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScannedCodeResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const isShowingAlert = useRef(false);
  const scanCooldown = useRef(false);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(200)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [scanLineAnim]);

  const showResultCard = useCallback(() => {
    resultSlide.setValue(200);
    resultOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(resultSlide, {
        toValue: 0,
        damping: 20,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.timing(resultOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [resultSlide, resultOpacity]);

  const hideResultCard = useCallback(() => {
    Animated.parallel([
      Animated.timing(resultSlide, {
        toValue: 200,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(resultOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setLastScanned(null);
    });
  }, [resultSlide, resultOpacity]);

  const onBarcodeScanned = useCallback(
    (scanResult: BarcodeScanningResult) => {
      if (scanCooldown.current || isShowingAlert.current) return;

      const { data, type: rawType, cornerPoints, bounds } = scanResult;
      if (!data) return;

      const codeType = mapExpoBarcodeType(rawType);
      if (!codeType) {
        console.log('[CodeScanner] Unknown barcode type:', rawType);
        return;
      }

      console.log(`[CodeScanner] Scanned ${codeType}: ${data}`);

      const code: Code = {
        type: codeType,
        value: data,
        frame: bounds
          ? {
              x: bounds.origin.x,
              y: bounds.origin.y,
              width: bounds.size.width,
              height: bounds.size.height,
            }
          : undefined,
        corners: cornerPoints?.map((p) => ({ x: p.x, y: p.y })),
      };

      const scannedResult: ScannedCodeResult = {
        code,
        timestamp: Date.now(),
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      };

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      scanCooldown.current = true;
      setTimeout(() => {
        scanCooldown.current = false;
      }, 1500);

      setLastScanned(scannedResult);
      setScanHistory((prev) => [scannedResult, ...prev].slice(0, 50));
      showResultCard();
    },
    [showResultCard]
  );

  const handleOpenUrl = useCallback((url: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open the URL');
    });
  }, []);

  const handleCopyValue = useCallback((value: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'web') {
      try {
        void navigator.clipboard.writeText(value);
        Alert.alert('Copied', 'Value copied to clipboard');
      } catch {
        Alert.alert('Copy', value);
      }
    } else {
      try {
        const Clipboard = require('expo-clipboard');
        void Clipboard.setStringAsync(value);
        Alert.alert('Copied', 'Value copied to clipboard');
      } catch {
        Alert.alert('Value', value);
      }
    }
  }, []);

  const handleDeleteHistoryItem = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScanHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleClearHistory = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Clear History', 'Remove all scanned codes?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => setScanHistory([]),
      },
    ]);
  }, []);

  if (!permission) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.permissionContainer}>
          <View style={styles.permissionCard}>
            <ScanLine size={48} color="#16A34A" strokeWidth={1.5} />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionDesc}>
              The scanner needs camera access to detect QR codes and barcodes in real-time.
            </Text>
            <Pressable
              onPress={() => void requestPermission()}
              style={({ pressed }) => [
                styles.permissionBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              testID="grant-camera-permission"
            >
              <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.permissionBackBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.permissionBackText}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {isForeground && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{
            barcodeTypes: BARCODE_TYPES,
          }}
          onBarcodeScanned={onBarcodeScanned}
          testID="code-scanner-camera"
        />
      )}

      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddleRow}>
          <View style={styles.overlaySide} />
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [
                    {
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, SCAN_AREA_SIZE - 4],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      <View style={[styles.topControls, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.controlBtn, pressed && { opacity: 0.7 }]}
          testID="code-scanner-back"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.headerTitle}>Code Scanner</Text>

        <View style={styles.rightControls}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowHistory(!showHistory);
            }}
            style={({ pressed }) => [styles.controlBtn, pressed && { opacity: 0.7 }]}
            testID="code-scanner-history"
          >
            <History size={20} color="#FFFFFF" />
            {scanHistory.length > 0 && (
              <View style={styles.historyBadge}>
                <Text style={styles.historyBadgeText}>
                  {scanHistory.length > 9 ? '9+' : scanHistory.length}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTorch(!torch);
            }}
            style={({ pressed }) => [
              styles.controlBtn,
              torch && styles.controlBtnActive,
              pressed && { opacity: 0.7 },
            ]}
            testID="code-scanner-torch"
          >
            {torch ? (
              <Zap size={20} color="#FFD60A" />
            ) : (
              <ZapOff size={20} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>
          Point camera at a QR code or barcode
        </Text>
      </View>

      {lastScanned && (
        <Animated.View
          style={[
            styles.resultContainer,
            { paddingBottom: insets.bottom + 16 },
            {
              transform: [{ translateY: resultSlide }],
              opacity: resultOpacity,
            },
          ]}
        >
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.resultTypeBadge}>
                <ScanLine size={14} color="#16A34A" strokeWidth={2} />
                <Text style={styles.resultTypeText}>
                  {getCodeTypeLabel(lastScanned.code.type)}
                </Text>
              </View>
              <Pressable
                onPress={hideResultCard}
                style={({ pressed }) => [styles.resultCloseBtn, pressed && { opacity: 0.7 }]}
              >
                <X size={16} color="#8E8E93" />
              </Pressable>
            </View>

            <Text style={styles.resultValue} numberOfLines={4} selectable>
              {lastScanned.code.value}
            </Text>

            {lastScanned.code.frame && (
              <Text style={styles.resultMeta}>
                Bounds: {Math.round(lastScanned.code.frame.width)}x{Math.round(lastScanned.code.frame.height)}
                {lastScanned.code.corners && lastScanned.code.corners.length > 0
                  ? ` · ${lastScanned.code.corners.length} corners`
                  : ''}
              </Text>
            )}

            <View style={styles.resultActions}>
              <Pressable
                onPress={() => handleCopyValue(lastScanned.code.value)}
                style={({ pressed }) => [
                  styles.resultActionBtn,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Copy size={16} color="#1C1C1E" />
                <Text style={styles.resultActionText}>Copy</Text>
              </Pressable>
              {isUrlValue(lastScanned.code.value) && (
                <Pressable
                  onPress={() => handleOpenUrl(lastScanned.code.value)}
                  style={({ pressed }) => [
                    styles.resultActionBtnPrimary,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <ExternalLink size={16} color="#FFFFFF" />
                  <Text style={styles.resultActionPrimaryText}>Open URL</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Animated.View>
      )}

      {showHistory && (
        <View style={[styles.historyOverlay, { paddingTop: insets.top + 60 }]}>
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Scan History</Text>
              <View style={styles.historyHeaderActions}>
                {scanHistory.length > 0 && (
                  <Pressable
                    onPress={handleClearHistory}
                    style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.historyClearText}>Clear All</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setShowHistory(false)}
                  style={({ pressed }) => [styles.historyCloseBtn, pressed && { opacity: 0.7 }]}
                >
                  <X size={18} color="#1C1C1E" />
                </Pressable>
              </View>
            </View>
            {scanHistory.length === 0 ? (
              <View style={styles.historyEmpty}>
                <ScanLine size={24} color="#C7C7CC" />
                <Text style={styles.historyEmptyText}>No codes scanned yet</Text>
              </View>
            ) : (
              scanHistory.map((item) => (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.historyItemLeft}>
                    <View style={styles.historyItemTypeBadge}>
                      <Text style={styles.historyItemTypeText}>
                        {getCodeTypeLabel(item.code.type)}
                      </Text>
                    </View>
                    <Text style={styles.historyItemValue} numberOfLines={1}>
                      {item.code.value}
                    </Text>
                    <Text style={styles.historyItemTime}>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                  <View style={styles.historyItemActions}>
                    <Pressable
                      onPress={() => handleCopyValue(item.code.value)}
                      style={({ pressed }) => [styles.historyItemBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Copy size={14} color="#636366" />
                    </Pressable>
                    {isUrlValue(item.code.value) && (
                      <Pressable
                        onPress={() => handleOpenUrl(item.code.value)}
                        style={({ pressed }) => [styles.historyItemBtn, pressed && { opacity: 0.7 }]}
                      >
                        <ExternalLink size={14} color="#16A34A" />
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => handleDeleteHistoryItem(item.id)}
                      style={({ pressed }) => [styles.historyItemBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Trash2 size={14} color="#FF3B30" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayMiddleRow: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#16A34A',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: '#16A34A',
    borderRadius: 1,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  rightControls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(120,120,120,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(255,214,10,0.25)',
  },
  historyBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  historyBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  hintContainer: {
    position: 'absolute',
    bottom: '32%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center' as const,
  },
  resultContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16A34A14',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  resultTypeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#16A34A',
  },
  resultCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#1C1C1E',
    lineHeight: 22,
    marginBottom: 6,
  },
  resultMeta: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 14,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 10,
  },
  resultActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  resultActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  resultActionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#16A34A',
  },
  resultActionPrimaryText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    gap: 12,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    marginTop: 4,
  },
  permissionDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  permissionBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  permissionBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  permissionBackBtn: {
    paddingVertical: 10,
  },
  permissionBackText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.5)',
  },
  historyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 16,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    maxHeight: '80%',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  historyHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyClearText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FF3B30',
  },
  historyCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  historyEmptyText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  historyItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  historyItemTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  historyItemTypeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#636366',
  },
  historyItemValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1C1C1E',
    marginBottom: 2,
  },
  historyItemTime: {
    fontSize: 11,
    color: '#AEAEB2',
  },
  historyItemActions: {
    flexDirection: 'row',
    gap: 6,
  },
  historyItemBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
