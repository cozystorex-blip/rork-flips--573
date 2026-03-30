import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  UIManager,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Package,
  Bell,
  Flame,
  Scan,
  Camera,
  ImagePlus,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useScanHistory, ScanHistoryEntry } from '@/contexts/ScanHistoryContext';
import { generateBrandLogo, getCachedBrandLogo } from '@/services/brandLogoService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function getScanPrice(entry: ScanHistoryEntry): string | null {
  const r = entry.result;
  const details = r.fashion_details ?? r.electronics_details ?? r.food_details ?? r.grocery_details ?? r.household_details ?? r.furniture_details;
  if (!details || typeof details !== 'object') return null;
  const d = details as Record<string, unknown>;
  if (d.estimated_resale_value && typeof d.estimated_resale_value === 'string') return d.estimated_resale_value;
  if (d.estimated_retail_price && typeof d.estimated_retail_price === 'string') return d.estimated_retail_price;
  if (d.estimated_price && typeof d.estimated_price === 'string') return d.estimated_price;
  if (d.price_range && typeof d.price_range === 'string') return d.price_range;
  return null;
}

function getScanBadge(entry: ScanHistoryEntry): { label: string; color: string } | null {
  const r = entry.result;
  const details = r.fashion_details ?? r.electronics_details ?? r.food_details ?? r.grocery_details ?? r.household_details ?? r.furniture_details;
  if (!details || typeof details !== 'object') return null;
  const d = details as Record<string, unknown>;
  if (d.value_verdict && typeof d.value_verdict === 'string') {
    const v = d.value_verdict.toLowerCase();
    if (v.includes('good') || v.includes('great') || v.includes('excellent')) return { label: 'Good Deal', color: '#16A34A' };
    if (v.includes('fair')) return { label: 'Fair Price', color: '#F59E0B' };
    if (v.includes('low')) return { label: 'Price Drop', color: '#16A34A' };
  }
  if (d.resale_demand && typeof d.resale_demand === 'string') {
    const rd = d.resale_demand.toLowerCase();
    if (rd.includes('high')) return { label: 'High Demand', color: '#16A34A' };
  }
  return null;
}

function getBrandFromEntry(entry: ScanHistoryEntry): string {
  const r = entry.result;
  const details = r.fashion_details ?? r.electronics_details ?? r.food_details ?? r.grocery_details ?? r.household_details ?? r.furniture_details;
  if (details && typeof details === 'object') {
    const d = details as Record<string, unknown>;
    if (d.brand && typeof d.brand === 'string') return d.brand;
    if (d.manufacturer && typeof d.manufacturer === 'string') return d.manufacturer;
  }
  return r.item_name || 'Item';
}

interface BrandLogoIconProps {
  entry: ScanHistoryEntry;
  size: number;
}

function BrandLogoIcon({ entry, size }: BrandLogoIconProps) {
  const brandName = getBrandFromEntry(entry);
  const itemName = entry.result.item_name || 'Item';
  const [logoUri, setLogoUri] = useState<string | null>(() => getCachedBrandLogo(itemName, brandName));
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (logoUri || failed) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const uri = await generateBrandLogo(itemName, brandName);
        if (!cancelled) {
          if (uri) setLogoUri(uri);
          else setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [itemName, brandName, logoUri, failed]);

  if (logoUri) {
    return (
      <View style={[logoStyles.container, { width: size, height: size }]}>
        <Image
          source={{ uri: logoUri }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={300}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[logoStyles.fallback, { width: size, height: size }]}>
        <ActivityIndicator size="small" color="#16A34A" />
      </View>
    );
  }

  return (
    <View style={[logoStyles.fallback, { width: size, height: size }]}>
      <Text style={logoStyles.fallbackText}>
        {(brandName || itemName || 'S').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  fallback: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#16A34A',
  },
});

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { entries: scanEntries } = useScanHistory();

  const streakDays = useMemo(() => {
    if (scanEntries.length === 0) return 0;
    let streak = 1;
    const sorted = [...scanEntries].sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].scannedAt);
      const curr = new Date(sorted[i].scannedAt);
      const diffDays = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
      if (diffDays <= 1) streak++;
      else break;
    }
    return streak;
  }, [scanEntries]);

  const recentScans = useMemo(() => {
    return [...scanEntries]
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
      .slice(0, 6);
  }, [scanEntries]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;
  const scannerSlide = useRef(new Animated.Value(30)).current;
  const scannerFade = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(scannerFade, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
      Animated.timing(scannerSlide, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, [fadeAnim, slideAnim, scannerFade, scannerSlide, pulseAnim]);

  const handleScanItemPress = useCallback((entry: ScanHistoryEntry) => {
    void Haptics.selectionAsync();
    router.push({ pathname: '/smart-scan', params: { historyEntryId: entry.id } });
  }, [router]);

  const handleScanCamera = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/smart-scan');
  }, [router]);

  const handleScanGallery = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/smart-scan');
  }, [router]);

  const scannerMinHeight = Math.min(SCREEN_HEIGHT * 0.38, 340);

  return (
    <View style={styles.container}>
      <View style={[styles.headerArea, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.brandTitle}>Flip</Text>
          <View style={{ flex: 1 }} />
          {streakDays > 0 && (
            <View style={styles.streakBadge}>
              <Flame size={12} color="#FF9500" strokeWidth={2.5} fill="#FF9500" />
              <Text style={styles.streakText}>{streakDays}-day streak</Text>
            </View>
          )}
          <Pressable
            onPress={() => { void Haptics.selectionAsync(); }}
            style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.6, transform: [{ scale: 0.92 }] }]}
            hitSlop={8}
          >
            <Bell size={19} color="#1C1C1E" strokeWidth={1.5} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {recentScans.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Scanned</Text>
                <Pressable
                  onPress={() => {
                    void Haptics.selectionAsync();
                    router.push('/(tabs)/saved');
                  }}
                  hitSlop={8}
                  style={({ pressed }) => [styles.seeAllBtn, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                  <ChevronRight size={14} color="#16A34A" strokeWidth={2} />
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              >
                {recentScans.map((entry) => {
                  const price = getScanPrice(entry);
                  const badge = getScanBadge(entry);
                  return (
                    <Pressable
                      key={entry.id}
                      onPress={() => handleScanItemPress(entry)}
                      style={({ pressed }) => [
                        styles.scanCard,
                        pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                      ]}
                    >
                      <View style={styles.scanCardImage}>
                        {entry.imageUri ? (
                          <Image
                            source={{ uri: entry.imageUri }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                        ) : (
                          <View style={styles.scanCardPlaceholder}>
                            <Package size={22} color="#C7C7CC" strokeWidth={1.3} />
                          </View>
                        )}
                        {badge && (
                          <View style={[styles.scanCardBadge, { backgroundColor: badge.color }]}>
                            <Text style={styles.scanCardBadgeText}>{badge.label}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.scanCardInfo}>
                        <View style={styles.scanCardHeader}>
                          <BrandLogoIcon entry={entry} size={22} />
                          <Text style={styles.scanCardBrand} numberOfLines={1}>
                            {getBrandFromEntry(entry)}
                          </Text>
                        </View>
                        <Text style={styles.scanCardName} numberOfLines={1}>
                          {entry.result.item_name || 'Scanned Item'}
                        </Text>
                        {price && (
                          <Text style={styles.scanCardPrice}>{price}</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </Animated.View>

        <Animated.View style={[
          styles.scannerPanel,
          { minHeight: scannerMinHeight, opacity: scannerFade, transform: [{ translateY: scannerSlide }] },
        ]}>
          <View style={styles.scannerPanelHandle}>
            <View style={styles.handleBar} />
          </View>

          <View style={styles.scannerContent}>
            <Animated.View style={[styles.scannerIconArea, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.scannerIconOuter}>
                <View style={styles.scannerIconInner}>
                  <Scan size={32} color="#FFFFFF" strokeWidth={2} />
                </View>
              </View>
            </Animated.View>

            <Text style={styles.scannerTitle}>Scan Any Item</Text>
            <Text style={styles.scannerSubtext}>
              Point your camera at any product to get instant pricing, details, and smart insights
            </Text>

            <View style={styles.scannerActions}>
              <Pressable
                onPress={handleScanCamera}
                style={({ pressed }) => [
                  styles.scanMainBtn,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.97 }] },
                ]}
                testID="home-scan-camera"
              >
                <Camera size={20} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.scanMainBtnText}>Open Scanner</Text>
              </Pressable>

              <Pressable
                onPress={handleScanGallery}
                style={({ pressed }) => [
                  styles.scanSecondaryBtn,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
                ]}
                testID="home-scan-gallery"
              >
                <ImagePlus size={18} color="#16A34A" strokeWidth={2} />
                <Text style={styles.scanSecondaryBtnText}>From Gallery</Text>
              </Pressable>
            </View>

            <View style={styles.scannerFeatures}>
              <View style={styles.featurePill}>
                <Sparkles size={11} color="#16A34A" strokeWidth={2} />
                <Text style={styles.featurePillText}>AI-Powered</Text>
              </View>
              <View style={styles.featureDot} />
              <View style={styles.featurePill}>
                <Text style={styles.featurePillText}>Instant Results</Text>
              </View>
              <View style={styles.featureDot} />
              <View style={styles.featurePill}>
                <Text style={styles.featurePillText}>Any Product</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {recentScans.length === 0 && (
          <Animated.View style={[styles.emptyHint, { opacity: fadeAnim }]}>
            <Scan size={24} color="#C7C7CC" strokeWidth={1.3} />
            <Text style={styles.emptyHintText}>Your scanned items will appear here</Text>
          </Animated.View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  headerArea: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginRight: 6,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#EA580C',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 8,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#16A34A',
  },
  horizontalList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  scanCard: {
    width: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  scanCardImage: {
    width: 150,
    height: 120,
    backgroundColor: '#F2F2F7',
    overflow: 'hidden' as const,
  },
  scanCardPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F2F2F7',
  },
  scanCardBadge: {
    position: 'absolute' as const,
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scanCardBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  scanCardInfo: {
    padding: 10,
    gap: 3,
  },
  scanCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 1,
  },
  scanCardBrand: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#8E8E93',
    flex: 1,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  scanCardName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.1,
  },
  scanCardPrice: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },

  scannerPanel: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    marginTop: 6,
  },
  scannerPanelHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
  },
  scannerContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
  },
  scannerIconArea: {
    marginBottom: 16,
  },
  scannerIconOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#16A34A12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D7A2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  scannerTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  scannerSubtext: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#8E8E93',
    textAlign: 'center' as const,
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 20,
  },
  scannerActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%' as const,
    marginBottom: 16,
  },
  scanMainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingVertical: 15,
    borderRadius: 14,
    shadowColor: '#0D7A2F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  scanMainBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  scanSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#16A34A10',
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#16A34A25',
  },
  scanSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#16A34A',
  },
  scannerFeatures: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featurePillText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  featureDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D1D6',
  },
  emptyHint: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyHintText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#8E8E93',
    textAlign: 'center' as const,
  },
});
