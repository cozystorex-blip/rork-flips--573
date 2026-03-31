import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ScanLine,
  Camera,
  QrCode,
  ChevronRight,
  Image as ImageIcon,
  Sofa,
  Tag,
  Ruler,
  Wrench,
  Clock,
  ShoppingBag,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ScannerColors } from '@/constants/scannerTheme';

const FEATURES = [
  { icon: Tag, label: 'Price & Details', desc: 'Instant product info', color: '#0058A3' },
  { icon: Wrench, label: 'Tools Needed', desc: 'What you\'ll need to build', color: '#D97706' },
  { icon: Clock, label: 'Assembly Time', desc: 'Difficulty & time estimate', color: '#059669' },
  { icon: ShoppingBag, label: 'What Goes With It', desc: 'Matching IKEA products', color: '#7C3AED' },
];

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
        <View style={styles.headerRow}>
          <View style={styles.ikeaBadge}>
            <Sofa size={16} color="#0058A3" strokeWidth={2.2} />
          </View>
          <View>
            <Text style={styles.headerTitle}>IKEA Companion</Text>
            <Text style={styles.headerSubtitle}>Scan items for instant info</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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
                <ScanLine size={28} color="#0058A3" strokeWidth={1.8} />
              </View>
              <View style={styles.scanCardTextCol}>
                <Text style={styles.scanCardTitle}>Scan IKEA Item</Text>
                <Text style={styles.scanCardDesc}>
                  Point at any IKEA product, tag, barcode, or shelf sign
                </Text>
              </View>
              <ChevronRight size={20} color="#0058A3" />
            </View>
            <View style={styles.scanCardActions}>
              <View style={styles.scanCardChip}>
                <Camera size={13} color="#0058A3" strokeWidth={2} />
                <Text style={styles.scanCardChipText}>Camera</Text>
              </View>
              <View style={styles.scanCardChip}>
                <ImageIcon size={13} color="#0058A3" strokeWidth={2} />
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
                <QrCode size={24} color="#1C1C1E" strokeWidth={1.8} />
              </View>
              <View style={styles.scanCardTextCol}>
                <Text style={[styles.scanCardTitle, styles.codeScanTitle]}>Barcode Scanner</Text>
                <Text style={[styles.scanCardDesc, styles.codeScanDesc]}>
                  Scan IKEA article numbers & barcodes
                </Text>
              </View>
              <ChevronRight size={20} color="#AEAEB2" />
            </View>
          </Pressable>

          <View style={styles.featuresSection}>
            <Text style={styles.featuresSectionTitle}>What You Get From a Scan</Text>
            <View style={styles.featuresGrid}>
              {FEATURES.map((f) => (
                <View key={f.label} style={styles.featureCard}>
                  <View style={[styles.featureIconWrap, { backgroundColor: `${f.color}12` }]}>
                    <f.icon size={18} color={f.color} strokeWidth={2} />
                  </View>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipIconWrap}>
              <Ruler size={16} color={ScannerColors.ikeaBlue} strokeWidth={2} />
            </View>
            <View style={styles.tipTextCol}>
              <Text style={styles.tipTitle}>In-Store Tip</Text>
              <Text style={styles.tipDesc}>
                For best results, scan the yellow price tag or the article number label on the shelf.
              </Text>
            </View>
          </View>

          <View style={{ height: 24 }} />
        </Animated.View>
      </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ikeaBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFDA1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 12,
  },
  scanCard: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  smartScanCard: {
    backgroundColor: '#FFDA1A',
    shadowColor: '#CC9E00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
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
    backgroundColor: 'rgba(255,255,255,0.85)',
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
    color: '#0058A3',
    marginBottom: 4,
  },
  codeScanTitle: {
    color: '#1C1C1E',
  },
  scanCardDesc: {
    fontSize: 13,
    color: 'rgba(0,88,163,0.7)',
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
    backgroundColor: 'rgba(0,88,163,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scanCardChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#0058A3',
  },
  featuresSection: {
    marginTop: 8,
  },
  featuresSectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#8E8E93',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 12,
    paddingLeft: 2,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureCard: {
    width: '47%' as unknown as number,
    flexGrow: 1,
    flexBasis: '45%' as unknown as number,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#B8D4F0',
    marginTop: 4,
  },
  tipIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipTextCol: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#0058A3',
    marginBottom: 3,
  },
  tipDesc: {
    fontSize: 12,
    color: '#3B82F6',
    lineHeight: 17,
  },
});
