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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Package,
  Bell,
  Flame,
  Scan,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useScanHistory, ScanHistoryEntry } from '@/contexts/ScanHistoryContext';
import { generateBrandLogo, getCachedBrandLogo } from '@/services/brandLogoService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

  const allScans = useMemo(() => {
    return [...scanEntries]
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
  }, [scanEntries]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleScanItemPress = useCallback((entry: ScanHistoryEntry) => {
    void Haptics.selectionAsync();
    router.push({ pathname: '/smart-scan', params: { historyEntryId: entry.id } });
  }, [router]);

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

          {allScans.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Scanned Items</Text>
                <Pressable
                  onPress={() => {
                    void Haptics.selectionAsync();
                    router.push('/(tabs)/saved');
                  }}
                  hitSlop={8}
                  style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                </Pressable>
              </View>

              <View style={styles.gridContainer}>
                {allScans.map((entry, index) => {
                  const price = getScanPrice(entry);
                  const badge = getScanBadge(entry);
                  const isLarge = index === 0 || index === 3;
                  return (
                    <Pressable
                      key={entry.id}
                      onPress={() => handleScanItemPress(entry)}
                      style={({ pressed }) => [
                        styles.gridItem,
                        isLarge ? styles.gridItemLarge : styles.gridItemSmall,
                        pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                      ]}
                    >
                      <View style={[styles.gridImageWrap, isLarge ? styles.gridImageLarge : styles.gridImageSmall]}>
                        {entry.imageUri ? (
                          <Image
                            source={{ uri: entry.imageUri }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                        ) : (
                          <View style={styles.gridImagePlaceholder}>
                            <Package size={28} color="#C7C7CC" strokeWidth={1.3} />
                          </View>
                        )}
                      </View>
                      <View style={styles.gridItemInfo}>
                        <View style={styles.gridItemHeader}>
                          <BrandLogoIcon entry={entry} size={28} />
                          <Text style={styles.gridItemBrand} numberOfLines={1}>
                            {getBrandFromEntry(entry)}
                          </Text>
                        </View>
                        <Text style={styles.gridItemName} numberOfLines={1}>
                          {entry.result.item_name || 'Scanned Item'}
                        </Text>
                        {price && (
                          <Text style={styles.gridItemPrice}>{price}</Text>
                        )}
                        {badge && (
                          <View style={[styles.gridBadgePill, { backgroundColor: badge.color + '15' }]}>
                            <Text style={[styles.gridBadgeLabel, { color: badge.color }]}>{badge.label}</Text>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Scan size={32} color="#C7C7CC" strokeWidth={1.3} />
              <Text style={styles.emptyTitle}>No scanned items yet</Text>
              <Text style={styles.emptySubtext}>Tap the scan button to start scanning products</Text>
            </View>
          )}

          <View style={{ height: 32 }} />
        </Animated.View>
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
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#16A34A',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  gridItemLarge: {
    width: '100%' as unknown as number,
    flexDirection: 'row' as const,
  },
  gridItemSmall: {
    width: '47.5%' as unknown as number,
    flexBasis: '47.5%' as unknown as number,
    flexGrow: 1,
  },
  gridImageWrap: {
    backgroundColor: '#F2F2F7',
    overflow: 'hidden' as const,
  },
  gridImageLarge: {
    width: 110,
    height: 110,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  gridImageSmall: {
    width: '100%' as unknown as number,
    height: 120,
  },
  gridImagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F2F2F7',
  },
  gridItemInfo: {
    flex: 1,
    padding: 10,
    gap: 3,
  },
  gridItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  gridItemBrand: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#8E8E93',
    flex: 1,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  gridItemName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.1,
  },
  gridItemPrice: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  gridBadgePill: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  gridBadgeLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 48,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#8E8E93',
    textAlign: 'center' as const,
  },
});
