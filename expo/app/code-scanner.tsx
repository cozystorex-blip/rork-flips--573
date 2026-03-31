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
  ScrollView,
  ActivityIndicator,
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
  Globe,
  Lock,
  Wifi,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Package,
  Tag,
  DollarSign,
  Flag,
  Building,
  Hash,
  Link,
  Shield,
  Info,
  CreditCard,
  Key,
  Search,
  MessageSquare,
  Share2,
  Sparkles,
  AlertTriangle,
  ChevronRight,
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
import { analyzeScannedCode } from '@/services/codeScanAnalyzer';
import type { CodeAnalysisResult, SuggestedAction, ParsedField } from '@/services/codeScanAnalyzer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.68;

const BARCODE_TYPES = ALL_CODE_TYPES.map(mapCodeTypeToExpo) as Array<
  'qr' | 'ean13' | 'ean8' | 'code128' | 'code39' | 'code93' | 'codabar' | 'itf14' | 'upc_e' | 'upc_a' | 'pdf417' | 'aztec' | 'datamatrix'
>;

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  'globe': Globe,
  'lock': Lock,
  'wifi': Wifi,
  'user': User,
  'phone': Phone,
  'mail': Mail,
  'map-pin': MapPin,
  'calendar': Calendar,
  'package': Package,
  'tag': Tag,
  'dollar-sign': DollarSign,
  'flag': Flag,
  'building': Building,
  'hash': Hash,
  'link': Link,
  'shield': Shield,
  'info': Info,
  'credit-card': CreditCard,
  'key': Key,
};

function FieldIcon({ name, size, color }: { name: string; size: number; color: string }) {
  const IconComponent = ICON_MAP[name] ?? Info;
  return <IconComponent size={size} color={color} />;
}

interface EnrichedScanResult extends ScannedCodeResult {
  analysis?: CodeAnalysisResult;
  analyzing?: boolean;
}

export default function CodeScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isForeground = useIsForeground();
  const [permission, requestPermission] = useCameraPermissions();

  const [torch, setTorch] = useState(false);
  const [lastScanned, setLastScanned] = useState<EnrichedScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<EnrichedScanResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showFullResult, setShowFullResult] = useState(false);
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
    setShowFullResult(false);
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

      const scannedResult: EnrichedScanResult = {
        code,
        timestamp: Date.now(),
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        analyzing: true,
      };

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      scanCooldown.current = true;
      setTimeout(() => {
        scanCooldown.current = false;
      }, 2500);

      setLastScanned(scannedResult);
      setScanHistory((prev) => [scannedResult, ...prev].slice(0, 50));
      showResultCard();

      analyzeScannedCode(data, codeType).then((analysis) => {
        console.log('[CodeScanner] AI analysis complete:', analysis.title);
        const enriched: EnrichedScanResult = { ...scannedResult, analysis, analyzing: false };
        setLastScanned(enriched);
        setScanHistory((prev) =>
          prev.map((item) => (item.id === scannedResult.id ? enriched : item))
        );
      }).catch((err) => {
        console.log('[CodeScanner] AI analysis failed:', err);
        const fallback: EnrichedScanResult = { ...scannedResult, analyzing: false };
        setLastScanned(fallback);
        setScanHistory((prev) =>
          prev.map((item) => (item.id === scannedResult.id ? fallback : item))
        );
      });
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

  const handleAction = useCallback((action: SuggestedAction) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (action.type) {
      case 'open_url':
        Linking.openURL(action.value).catch(() => Alert.alert('Error', 'Could not open URL'));
        break;
      case 'copy':
        handleCopyValue(action.value);
        break;
      case 'call':
        Linking.openURL(`tel:${action.value}`).catch(() => Alert.alert('Error', 'Could not initiate call'));
        break;
      case 'email':
        Linking.openURL(`mailto:${action.value}`).catch(() => Alert.alert('Error', 'Could not open email'));
        break;
      case 'sms':
        Linking.openURL(`sms:${action.value}`).catch(() => Alert.alert('Error', 'Could not open messaging'));
        break;
      case 'map':
        Linking.openURL(action.value).catch(() => Alert.alert('Error', 'Could not open maps'));
        break;
      case 'search':
        Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(action.value)}`).catch(() => Alert.alert('Error', 'Could not open search'));
        break;
      case 'share':
        handleCopyValue(action.value);
        break;
      default:
        handleCopyValue(action.value);
        break;
    }
  }, [handleCopyValue]);

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

  const handleViewHistoryItem = useCallback((item: EnrichedScanResult) => {
    void Haptics.selectionAsync();
    setLastScanned(item);
    setShowHistory(false);
    setShowFullResult(true);
    showResultCard();
  }, [showResultCard]);

  const getActionIcon = useCallback((type: SuggestedAction['type']) => {
    switch (type) {
      case 'open_url': return ExternalLink;
      case 'copy': return Copy;
      case 'call': return Phone;
      case 'email': return Mail;
      case 'sms': return MessageSquare;
      case 'map': return MapPin;
      case 'wifi_connect': return Wifi;
      case 'add_contact': return User;
      case 'share': return Share2;
      case 'search': return Search;
      default: return Info;
    }
  }, []);

  const getTypeColor = useCallback((type: string): string => {
    switch (type) {
      case 'url': return '#3B82F6';
      case 'wifi': return '#8B5CF6';
      case 'vcard': return '#EC4899';
      case 'email': return '#F59E0B';
      case 'phone': return '#10B981';
      case 'sms': return '#06B6D4';
      case 'geo': return '#EF4444';
      case 'calendar': return '#F97316';
      case 'product': return '#0EA5E9';
      case 'cryptocurrency': return '#D97706';
      case 'json': return '#6366F1';
      case 'serial_number': return '#64748B';
      default: return '#16A34A';
    }
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

  const renderAnalyzingState = () => (
    <View style={styles.analyzingContainer}>
      <View style={styles.analyzingRow}>
        <ActivityIndicator size="small" color="#16A34A" />
        <Sparkles size={14} color="#16A34A" />
        <Text style={styles.analyzingText}>AI is analyzing...</Text>
      </View>
    </View>
  );

  const renderCompactResult = () => {
    if (!lastScanned) return null;
    const analysis = lastScanned.analysis;
    const isAnalyzing = lastScanned.analyzing;

    return (
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

        {isAnalyzing ? (
          <>
            <Text style={styles.resultValue} numberOfLines={2} selectable>
              {lastScanned.code.value}
            </Text>
            {renderAnalyzingState()}
          </>
        ) : analysis ? (
          <>
            <Text style={styles.analysisTitle}>{analysis.title}</Text>
            <Text style={styles.analysisSummary} numberOfLines={2}>{analysis.summary}</Text>

            {analysis.security_warning && (
              <View style={styles.warningBanner}>
                <AlertTriangle size={14} color="#DC2626" />
                <Text style={styles.warningText} numberOfLines={2}>{analysis.security_warning}</Text>
              </View>
            )}

            <View style={styles.resultActions}>
              {analysis.actions.slice(0, 2).map((action, i) => {
                const ActionIcon = getActionIcon(action.type);
                const isPrimary = i === 0;
                return (
                  <Pressable
                    key={`action-${i}`}
                    onPress={() => handleAction(action)}
                    style={({ pressed }) => [
                      isPrimary ? styles.resultActionBtnPrimary : styles.resultActionBtn,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <ActionIcon size={16} color={isPrimary ? '#FFFFFF' : '#1C1C1E'} />
                    <Text style={isPrimary ? styles.resultActionPrimaryText : styles.resultActionText} numberOfLines={1}>
                      {action.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {(analysis.parsed_fields.length > 2 || analysis.actions.length > 2) && (
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setShowFullResult(true);
                }}
                style={({ pressed }) => [styles.viewMoreBtn, pressed && { opacity: 0.7 }]}
              >
                <Sparkles size={12} color="#16A34A" />
                <Text style={styles.viewMoreText}>View Full Analysis</Text>
                <ChevronRight size={14} color="#16A34A" />
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Text style={styles.resultValue} numberOfLines={4} selectable>
              {lastScanned.code.value}
            </Text>
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
          </>
        )}
      </View>
    );
  };

  const renderFullResult = () => {
    if (!lastScanned?.analysis) return null;
    const analysis = lastScanned.analysis;
    const typeColor = getTypeColor(analysis.parsed_type);

    return (
      <View style={styles.fullResultOverlay}>
        <Pressable
          style={styles.fullResultBackdrop}
          onPress={() => setShowFullResult(false)}
        />
        <View style={[styles.fullResultSheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.fullResultHandle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.fullResultScroll}
          >
            <View style={styles.fullResultHeader}>
              <View style={[styles.fullResultTypeBadge, { backgroundColor: `${typeColor}14`, borderColor: `${typeColor}30` }]}>
                <Sparkles size={12} color={typeColor} />
                <Text style={[styles.fullResultTypeLabel, { color: typeColor }]}>
                  {analysis.parsed_type.replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowFullResult(false)}
                style={({ pressed }) => [styles.fullResultCloseBtn, pressed && { opacity: 0.7 }]}
              >
                <X size={18} color="#636366" />
              </Pressable>
            </View>

            <Text style={styles.fullResultTitle}>{analysis.title}</Text>
            <Text style={styles.fullResultSummary}>{analysis.summary}</Text>

            {analysis.security_warning && (
              <View style={styles.fullWarningBanner}>
                <AlertTriangle size={16} color="#DC2626" />
                <Text style={styles.fullWarningText}>{analysis.security_warning}</Text>
              </View>
            )}

            {analysis.product_info && (
              <View style={styles.productCard}>
                <View style={styles.productCardHeader}>
                  <Package size={16} color="#0EA5E9" />
                  <Text style={styles.productCardTitle}>Product Information</Text>
                </View>
                <View style={styles.productFields}>
                  {analysis.product_info.product_name && (
                    <View style={styles.productField}>
                      <Text style={styles.productFieldLabel}>Product</Text>
                      <Text style={styles.productFieldValue}>{analysis.product_info.product_name}</Text>
                    </View>
                  )}
                  {analysis.product_info.brand && (
                    <View style={styles.productField}>
                      <Text style={styles.productFieldLabel}>Brand</Text>
                      <Text style={styles.productFieldValue}>{analysis.product_info.brand}</Text>
                    </View>
                  )}
                  {analysis.product_info.category && (
                    <View style={styles.productField}>
                      <Text style={styles.productFieldLabel}>Category</Text>
                      <Text style={styles.productFieldValue}>{analysis.product_info.category}</Text>
                    </View>
                  )}
                  {analysis.product_info.estimated_price && (
                    <View style={styles.productField}>
                      <Text style={styles.productFieldLabel}>Est. Price</Text>
                      <Text style={[styles.productFieldValue, { color: '#059669', fontWeight: '800' as const }]}>
                        {analysis.product_info.estimated_price}
                      </Text>
                    </View>
                  )}
                  {analysis.product_info.country_of_origin && (
                    <View style={styles.productField}>
                      <Text style={styles.productFieldLabel}>Origin</Text>
                      <Text style={styles.productFieldValue}>{analysis.product_info.country_of_origin}</Text>
                    </View>
                  )}
                  {analysis.product_info.manufacturer && (
                    <View style={styles.productField}>
                      <Text style={styles.productFieldLabel}>Manufacturer</Text>
                      <Text style={styles.productFieldValue}>{analysis.product_info.manufacturer}</Text>
                    </View>
                  )}
                  {analysis.product_info.description && (
                    <View style={[styles.productField, { flexBasis: '100%' as unknown as number }]}>
                      <Text style={styles.productFieldLabel}>Description</Text>
                      <Text style={styles.productFieldValue}>{analysis.product_info.description}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {analysis.wifi_info && (
              <View style={[styles.productCard, { borderColor: '#DDD6FE' }]}>
                <View style={styles.productCardHeader}>
                  <Wifi size={16} color="#8B5CF6" />
                  <Text style={styles.productCardTitle}>Wi-Fi Network</Text>
                </View>
                <View style={styles.productFields}>
                  <View style={styles.productField}>
                    <Text style={styles.productFieldLabel}>Network</Text>
                    <Text style={styles.productFieldValue}>{analysis.wifi_info.ssid}</Text>
                  </View>
                  <View style={styles.productField}>
                    <Text style={styles.productFieldLabel}>Security</Text>
                    <Text style={styles.productFieldValue}>{analysis.wifi_info.security}</Text>
                  </View>
                  {analysis.wifi_info.password && (
                    <View style={styles.productField}>
                      <Text style={styles.productFieldLabel}>Password</Text>
                      <Text style={[styles.productFieldValue, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                        {analysis.wifi_info.password}
                      </Text>
                    </View>
                  )}
                  <View style={styles.productField}>
                    <Text style={styles.productFieldLabel}>Hidden</Text>
                    <Text style={styles.productFieldValue}>{analysis.wifi_info.hidden ? 'Yes' : 'No'}</Text>
                  </View>
                </View>
              </View>
            )}

            {analysis.contact_info && (
              <View style={[styles.productCard, { borderColor: '#FBCFE8' }]}>
                <View style={styles.productCardHeader}>
                  <User size={16} color="#EC4899" />
                  <Text style={styles.productCardTitle}>Contact Information</Text>
                </View>
                <View style={styles.productFields}>
                  {analysis.contact_info.name && (
                    <View style={styles.productField}>
                      <Text style={styles.productFieldLabel}>Name</Text>
                      <Text style={styles.productFieldValue}>{analysis.contact_info.name}</Text>
                    </View>
                  )}
                  {analysis.contact_info.phone && (
                    <View style={styles.productField}>
                      <Text style={styles.productFieldLabel}>Phone</Text>
                      <Text style={styles.productFieldValue}>{analysis.contact_info.phone}</Text>
                    </View>
                  )}
                  {analysis.contact_info.email && (
                    <View style={styles.productField}>
                      <Text style={styles.productFieldLabel}>Email</Text>
                      <Text style={styles.productFieldValue}>{analysis.contact_info.email}</Text>
                    </View>
                  )}
                  {analysis.contact_info.organization && (
                    <View style={styles.productField}>
                      <Text style={styles.productFieldLabel}>Organization</Text>
                      <Text style={styles.productFieldValue}>{analysis.contact_info.organization}</Text>
                    </View>
                  )}
                  {analysis.contact_info.address && (
                    <View style={[styles.productField, { flexBasis: '100%' as unknown as number }]}>
                      <Text style={styles.productFieldLabel}>Address</Text>
                      <Text style={styles.productFieldValue}>{analysis.contact_info.address}</Text>
                    </View>
                  )}
                  {analysis.contact_info.website && (
                    <View style={[styles.productField, { flexBasis: '100%' as unknown as number }]}>
                      <Text style={styles.productFieldLabel}>Website</Text>
                      <Text style={styles.productFieldValue}>{analysis.contact_info.website}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {analysis.url_info && (
              <View style={[styles.productCard, { borderColor: '#BFDBFE' }]}>
                <View style={styles.productCardHeader}>
                  <Globe size={16} color="#3B82F6" />
                  <Text style={styles.productCardTitle}>URL Details</Text>
                </View>
                <View style={styles.productFields}>
                  <View style={styles.productField}>
                    <Text style={styles.productFieldLabel}>Domain</Text>
                    <Text style={styles.productFieldValue}>{analysis.url_info.domain}</Text>
                  </View>
                  <View style={styles.productField}>
                    <Text style={styles.productFieldLabel}>Secure</Text>
                    <Text style={[styles.productFieldValue, { color: analysis.url_info.is_secure ? '#059669' : '#DC2626' }]}>
                      {analysis.url_info.is_secure ? 'Yes (HTTPS)' : 'No (HTTP)'}
                    </Text>
                  </View>
                  <View style={styles.productField}>
                    <Text style={styles.productFieldLabel}>Purpose</Text>
                    <Text style={styles.productFieldValue}>{analysis.url_info.likely_purpose}</Text>
                  </View>
                  {analysis.url_info.is_shortened && (
                    <View style={styles.productField}>
                      <Text style={styles.productFieldLabel}>Shortened</Text>
                      <Text style={[styles.productFieldValue, { color: '#D97706' }]}>Yes — use caution</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {analysis.parsed_fields.length > 0 && (
              <View style={styles.fieldsSection}>
                <Text style={styles.fieldsSectionTitle}>All Details</Text>
                {analysis.parsed_fields.map((field: ParsedField, i: number) => (
                  <Pressable
                    key={`field-${i}`}
                    onPress={() => handleCopyValue(field.value)}
                    style={({ pressed }) => [styles.fieldRow, pressed && { backgroundColor: '#F2F2F7' }]}
                  >
                    <View style={styles.fieldIconWrap}>
                      <FieldIcon name={field.icon} size={14} color="#636366" />
                    </View>
                    <View style={styles.fieldContent}>
                      <Text style={styles.fieldLabel}>{field.label}</Text>
                      <Text style={styles.fieldValue} numberOfLines={3} selectable>{field.value}</Text>
                    </View>
                    <Copy size={12} color="#C7C7CC" />
                  </Pressable>
                ))}
              </View>
            )}

            {analysis.additional_context && (
              <View style={styles.contextCard}>
                <Info size={14} color="#6366F1" />
                <Text style={styles.contextText}>{analysis.additional_context}</Text>
              </View>
            )}

            <View style={styles.fullResultActions}>
              {analysis.actions.map((action, i) => {
                const ActionIcon = getActionIcon(action.type);
                return (
                  <Pressable
                    key={`fullaction-${i}`}
                    onPress={() => handleAction(action)}
                    style={({ pressed }) => [
                      i === 0 ? styles.fullActionPrimary : styles.fullActionSecondary,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <ActionIcon size={16} color={i === 0 ? '#FFFFFF' : '#1C1C1E'} />
                    <Text style={i === 0 ? styles.fullActionPrimaryText : styles.fullActionSecondaryText}>
                      {action.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.rawValueSection}>
              <Text style={styles.rawValueLabel}>Raw Value</Text>
              <Pressable onPress={() => handleCopyValue(lastScanned.code.value)}>
                <Text style={styles.rawValueText} selectable numberOfLines={6}>
                  {lastScanned.code.value}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {isForeground && !showFullResult && (
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

      {!showFullResult && (
        <>
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

            <View style={styles.headerTitleRow}>
              <Sparkles size={14} color="#16A34A" />
              <Text style={styles.headerTitle}>AI Scanner</Text>
            </View>

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
            <View style={styles.hintBadge}>
              <Sparkles size={11} color="#16A34A" />
              <Text style={styles.hintText}>AI-powered analysis</Text>
            </View>
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
              {renderCompactResult()}
            </Animated.View>
          )}
        </>
      )}

      {showFullResult && lastScanned?.analysis && renderFullResult()}

      {showHistory && !showFullResult && (
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
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {scanHistory.length === 0 ? (
                <View style={styles.historyEmpty}>
                  <ScanLine size={24} color="#C7C7CC" />
                  <Text style={styles.historyEmptyText}>No codes scanned yet</Text>
                </View>
              ) : (
                scanHistory.map((item) => (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [styles.historyItem, pressed && { backgroundColor: '#F9F9F9' }]}
                    onPress={() => handleViewHistoryItem(item)}
                  >
                    <View style={styles.historyItemLeft}>
                      <View style={[
                        styles.historyItemTypeBadge,
                        item.analysis && { backgroundColor: `${getTypeColor(item.analysis.parsed_type)}14` },
                      ]}>
                        <Text style={[
                          styles.historyItemTypeText,
                          item.analysis && { color: getTypeColor(item.analysis.parsed_type) },
                        ]}>
                          {item.analysis?.parsed_type?.replace(/_/g, ' ').toUpperCase() ?? getCodeTypeLabel(item.code.type)}
                        </Text>
                      </View>
                      <Text style={styles.historyItemValue} numberOfLines={1}>
                        {item.analysis?.title ?? item.code.value}
                      </Text>
                      <Text style={styles.historyItemTime}>
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                    <View style={styles.historyItemActions}>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCopyValue(item.code.value);
                        }}
                        style={({ pressed }) => [styles.historyItemBtn, pressed && { opacity: 0.7 }]}
                      >
                        <Copy size={14} color="#636366" />
                      </Pressable>
                      {isUrlValue(item.code.value) && (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            handleOpenUrl(item.code.value);
                          }}
                          style={({ pressed }) => [styles.historyItemBtn, pressed && { opacity: 0.7 }]}
                        >
                          <ExternalLink size={14} color="#16A34A" />
                        </Pressable>
                      )}
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteHistoryItem(item.id);
                        }}
                        style={({ pressed }) => [styles.historyItemBtn, pressed && { opacity: 0.7 }]}
                      >
                        <Trash2 size={14} color="#FF3B30" />
                      </Pressable>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  hintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.85)',
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
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#1C1C1E',
    lineHeight: 21,
    marginBottom: 12,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  analysisSummary: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#636366',
    lineHeight: 20,
    marginBottom: 12,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#DC2626',
    lineHeight: 16,
  },
  analyzingContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  analyzingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analyzingText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#16A34A',
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
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  viewMoreText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#16A34A',
  },
  fullResultOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  fullResultBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  fullResultSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  fullResultHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  fullResultScroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  fullResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  fullResultTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  fullResultTypeLabel: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  fullResultCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullResultTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  fullResultSummary: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: '#636366',
    lineHeight: 22,
    marginBottom: 20,
  },
  fullWarningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  fullWarningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#DC2626',
    lineHeight: 19,
  },
  productCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  productCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  productCardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  productFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  productField: {
    flexGrow: 1,
    flexBasis: '45%' as unknown as number,
    minWidth: 120,
  },
  productFieldLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#8E8E93',
    marginBottom: 2,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  productFieldValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    lineHeight: 19,
  },
  fieldsSection: {
    marginBottom: 16,
  },
  fieldsSectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#8E8E93',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 10,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  fieldIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#8E8E93',
    marginBottom: 1,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1C1C1E',
    lineHeight: 19,
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  contextText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#4338CA',
    lineHeight: 19,
  },
  fullResultActions: {
    gap: 10,
    marginBottom: 16,
  },
  fullActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#16A34A',
  },
  fullActionPrimaryText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  fullActionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
  },
  fullActionSecondaryText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  rawValueSection: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 14,
  },
  rawValueLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#8E8E93',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  },
  rawValueText: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#636366',
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
    zIndex: 50,
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
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    borderRadius: 8,
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
