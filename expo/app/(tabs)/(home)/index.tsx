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
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useScanHistory, ScanHistoryEntry } from '@/contexts/ScanHistoryContext';
import { generateBrandLogo, getCachedBrandLogo } from '@/services/brandLogoService';
import { useExpenses } from '@/contexts/ExpenseContext';

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
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
  },
  fallback: {
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#16A34A',
  },
});

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { entries: scanEntries } = useScanHistory();
  const { expenses } = useExpenses();

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

  const latestScan = allScans.length > 0 ? allScans[0] : null;
  const recentScans = allScans.slice(1, 5);

  const recentReceipts = useMemo(() => {
    return [...expenses]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [expenses]);

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
              <Text style={styles.streakText}>{streakDays}</Text>
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

          {latestScan ? (
            <>
              <Pressable
                onPress={() => handleScanItemPress(latestScan)}
                style={({ pressed }) => [
                  styles.featuredCard,
                  pressed && { opacity: 0.95, transform: [{ scale: 0.985 }] },
                ]}
                testID="featured-scan-card"
              >
                <View style={styles.featuredImageWrap}>
                  {latestScan.imageUri ? (
                    <Image
                      source={{ uri: latestScan.imageUri }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={styles.featuredImagePlaceholder}>
                      <Package size={36} color="#C7C7CC" strokeWidth={1.3} />
                    </View>
                  )}
                  {getScanBadge(latestScan) && (
                    <View style={[styles.featuredBadge, { backgroundColor: getScanBadge(latestScan)!.color }]}>
                      <Text style={styles.featuredBadgeText}>{getScanBadge(latestScan)!.label}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.featuredInfo}>
                  <View style={styles.featuredTopRow}>
                    <BrandLogoIcon entry={latestScan} size={24} />
                    <Text style={styles.featuredBrand} numberOfLines={1}>
                      {getBrandFromEntry(latestScan)}
                    </Text>
                  </View>
                  <Text style={styles.featuredName} numberOfLines={2}>
                    {latestScan.result.item_name || 'Scanned Item'}
                  </Text>
                  {getScanPrice(latestScan) && (
                    <Text style={styles.featuredPrice}>{getScanPrice(latestScan)}</Text>
                  )}
                  <Text style={styles.featuredTime}>
                    {formatTimeAgo(latestScan.scannedAt)}
                  </Text>
                </View>
              </Pressable>

              {recentScans.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Recent Scans</Text>
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

                  {recentScans.map((entry) => {
                    const price = getScanPrice(entry);
                    return (
                      <Pressable
                        key={entry.id}
                        onPress={() => handleScanItemPress(entry)}
                        style={({ pressed }) => [
                          styles.listCard,
                          pressed && { opacity: 0.92, backgroundColor: '#F8F8FA' },
                        ]}
                      >
                        <View style={styles.listImageWrap}>
                          {entry.imageUri ? (
                            <Image
                              source={{ uri: entry.imageUri }}
                              style={StyleSheet.absoluteFill}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                            />
                          ) : (
                            <View style={styles.listImagePlaceholder}>
                              <Package size={18} color="#C7C7CC" strokeWidth={1.3} />
                            </View>
                          )}
                        </View>
                        <View style={styles.listInfo}>
                          <Text style={styles.listItemName} numberOfLines={1}>
                            {entry.result.item_name || 'Scanned Item'}
                          </Text>
                          <Text style={styles.listItemMeta} numberOfLines={1}>
                            {getBrandFromEntry(entry)} · {formatTimeAgo(entry.scannedAt)}
                          </Text>
                        </View>
                        {price && (
                          <Text style={styles.listItemPrice}>{price}</Text>
                        )}
                        <ChevronRight size={16} color="#C7C7CC" strokeWidth={1.5} />
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {recentReceipts.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Recent Receipts</Text>
                  </View>
                  {recentReceipts.map((expense) => (
                    <View key={expense.id} style={styles.receiptRow}>
                      <View style={styles.receiptIconWrap}>
                        <Clock size={14} color="#8E8E93" strokeWidth={1.5} />
                      </View>
                      <View style={styles.receiptInfo}>
                        <Text style={styles.receiptTitle} numberOfLines={1}>{expense.title}</Text>
                        <Text style={styles.receiptMeta}>
                          {new Date(expense.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      <Text style={styles.receiptAmount}>${expense.amount.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {scanEntries.length > 0 && (
                <View style={styles.summaryStrip}>
                  <Text style={styles.summaryText}>
                    {scanEntries.length} item{scanEntries.length !== 1 ? 's' : ''} scanned
                  </Text>
                  {streakDays > 1 && (
                    <Text style={styles.summaryText}>
                      · {streakDays}-day streak
                    </Text>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Scan size={28} color="#16A34A" strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>Start scanning</Text>
              <Text style={styles.emptySubtext}>
                Tap the scan button below to identify products, compare prices, and track your finds
              </Text>
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/smart-scan');
                }}
                style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              >
                <Scan size={16} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.emptyBtnText}>Scan an Item</Text>
              </Pressable>
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
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginRight: 4,
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
    paddingTop: 16,
  },

  featuredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  featuredImageWrap: {
    width: '100%',
    height: 200,
    backgroundColor: '#F2F2F7',
  },
  featuredImagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featuredBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  featuredInfo: {
    padding: 14,
    gap: 4,
  },
  featuredTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  featuredBrand: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flex: 1,
  },
  featuredName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  featuredPrice: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  featuredTime: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#AEAEB2',
    marginTop: 2,
  },

  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#16A34A',
  },

  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  listImageWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    overflow: 'hidden',
  },
  listImagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listInfo: {
    flex: 1,
    gap: 2,
  },
  listItemName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.1,
  },
  listItemMeta: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
  },
  listItemPrice: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },

  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    gap: 10,
  },
  receiptIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptInfo: {
    flex: 1,
    gap: 1,
  },
  receiptTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1C1C1E',
  },
  receiptMeta: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#AEAEB2',
  },
  receiptAmount: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },

  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#AEAEB2',
  },

  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 44,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
