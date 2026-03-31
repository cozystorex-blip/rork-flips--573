import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ScanLine,
  Camera,
  QrCode,
  Sparkles,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function ScanTabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleSmartScan = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/smart-scan');
  }, [router]);

  const handleCodeScanner = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/code-scanner');
  }, [router]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Scan</Text>
        <Text style={styles.headerSubtitle}>Identify items or scan codes</Text>
      </View>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Pressable
          onPress={handleSmartScan}
          style={({ pressed }) => [
            styles.scanCard,
            styles.smartScanCard,
            pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
          ]}
          testID="scan-smart-scan"
        >
          <View style={styles.scanCardContent}>
            <View style={styles.scanCardIconWrap}>
              <Sparkles size={28} color="#FFFFFF" strokeWidth={1.8} />
            </View>
            <View style={styles.scanCardTextCol}>
              <Text style={styles.scanCardTitle}>Smart Scan</Text>
              <Text style={styles.scanCardDesc}>
                AI-powered item identification with pricing, details, and resale insights
              </Text>
            </View>
            <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
          </View>
          <View style={styles.scanCardActions}>
            <View style={styles.scanCardChip}>
              <Camera size={13} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.scanCardChipText}>Camera</Text>
            </View>
            <View style={styles.scanCardChip}>
              <ImageIcon size={13} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.scanCardChipText}>Gallery</Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          onPress={handleCodeScanner}
          style={({ pressed }) => [
            styles.scanCard,
            styles.codeScanCard,
            pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
          ]}
          testID="scan-code-scanner"
        >
          <View style={styles.scanCardContent}>
            <View style={[styles.scanCardIconWrap, styles.codeIconWrap]}>
              <QrCode size={28} color="#1C1C1E" strokeWidth={1.8} />
            </View>
            <View style={styles.scanCardTextCol}>
              <Text style={[styles.scanCardTitle, styles.codeScanTitle]}>Code Scanner</Text>
              <Text style={[styles.scanCardDesc, styles.codeScanDesc]}>
                Real-time QR code and barcode scanner with instant results
              </Text>
            </View>
            <ChevronRight size={20} color="#AEAEB2" />
          </View>
          <View style={styles.codeTypeRow}>
            {['QR', 'EAN-13', 'UPC-A', 'Code 128', 'Aztec'].map((label) => (
              <View key={label} style={styles.codeTypeBadge}>
                <Text style={styles.codeTypeBadgeText}>{label}</Text>
              </View>
            ))}
          </View>
        </Pressable>

        <View style={styles.infoCard}>
          <ScanLine size={18} color="#3B82F6" strokeWidth={2} />
          <View style={styles.infoTextCol}>
            <Text style={styles.infoTitle}>Vision Camera Scanner</Text>
            <Text style={styles.infoDesc}>
              Code scanner uses the same output format as react-native-vision-camera — code type, value, bounds, and corner points for every detected barcode.
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#F2F2F7',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 14,
  },
  scanCard: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  smartScanCard: {
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  codeScanCard: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  scanCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  scanCardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeIconWrap: {
    backgroundColor: '#F2F2F7',
  },
  scanCardTextCol: {
    flex: 1,
  },
  scanCardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  codeScanTitle: {
    color: '#1C1C1E',
  },
  scanCardDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  codeScanDesc: {
    color: '#8E8E93',
  },
  scanCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  scanCardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scanCardChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  codeTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
  },
  codeTypeBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeTypeBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#636366',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTextCol: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 12,
    color: '#3B82F6',
    lineHeight: 17,
  },
});
