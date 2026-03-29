import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  UIManager,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Package,
  Bell,
  Flame,
  DollarSign,
  Scan,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import ScanFrameIcon from '@/components/ScanFrameIcon';
import { useExpenses } from '@/contexts/ExpenseContext';
import { useScanHistory, ScanHistoryEntry } from '@/contexts/ScanHistoryContext';
import { useSavedItems } from '@/contexts/SavedItemsContext';
import AdMobBanner from '@/components/ads/AdMobBanner';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return '';
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

function getScanSubtitle(entry: ScanHistoryEntry): string {
  const r = entry.result;
  const category = r.category || '';
  const itemType = r.item_type || '';
  const parts: string[] = [];
  if (category) parts.push(category);
  if (itemType && itemType !== category) parts.push(itemType);
  return parts.join(' · ');
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { expenses } = useExpenses();
  const { entries: scanEntries } = useScanHistory();
  const { savedDeals } = useSavedItems();

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
      .slice(0, 3);
  }, [scanEntries]);

  const recentReceipts = useMemo(() => {
    return expenses
      .filter((e) => e.amount > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [expenses]);

  const itemsScannedCount = scanEntries.length;

  const totalSavings = useMemo(() => {
    let total = 0;
    savedDeals.forEach(d => {
      if (d.savingsAmount) total += d.savingsAmount;
    });
    return total;
  }, [savedDeals]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleScanPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/smart-scan');
  }, [router]);

  const handleReceiptPress = useCallback((expenseId: string) => {
    void Haptics.selectionAsync();
    router.push({ pathname: '/receipt-detail', params: { expenseId } });
  }, [router]);

  const handleScanItemPress = useCallback((entry: ScanHistoryEntry) => {
    void Haptics.selectionAsync();
    router.push({ pathname: '/smart-scan', params: { historyEntryId: entry.id } });
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={[styles.headerArea, { paddingTop: insets.top + 12 }]}>
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
        <Pressable
          onPress={handleScanPress}
          style={({ pressed }) => [styles.scanCard, pressed && styles.scanCardPressed]}
          testID="home-scan-card"
        >
          <View style={styles.scanCardContent}>
            <View style={styles.scanCardIconWrap}>
              <ScanFrameIcon size={32} color="#FFFFFF" strokeWidth={2.5} />
            </View>
            <Text style={styles.scanCardTitle}>Scan Item</Text>
            <Text style={styles.scanCardSub}>Barcode, product, or receipt</Text>
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

            <View style={styles.listCard}>
              {recentScans.map((entry, index) => {
                const price = getScanPrice(entry);
                const badge = getScanBadge(entry);
                const subtitle = getScanSubtitle(entry);
                return (
                  <Pressable
                    key={entry.id}
                    onPress={() => handleScanItemPress(entry)}
                    style={({ pressed }) => [
                      styles.scanRow,
                      pressed && styles.scanRowPressed,
                      index < recentScans.length - 1 && styles.scanRowBorder,
                    ]}
                  >
                    <View style={styles.scanImageWrap}>
                      {entry.imageUri ? (
                        <Image
                          source={{ uri: entry.imageUri }}
                          style={styles.scanImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View style={styles.scanImagePlaceholder}>
                          <Package size={18} color="#C7C7CC" strokeWidth={1.5} />
                        </View>
                      )}
                    </View>
                    <View style={styles.scanInfo}>
                      <Text style={styles.scanItemTitle} numberOfLines={1}>
                        {entry.result.item_name || 'Scanned Item'}
                      </Text>
                      <Text style={styles.scanItemSub} numberOfLines={1}>
                        {subtitle}{subtitle ? ' · ' : ''}{formatTimeAgo(entry.scannedAt)}
                      </Text>
                      {badge && (
                        <View style={[styles.scanBadgePill, { backgroundColor: badge.color + '18' }]}>
                          <Text style={[styles.scanBadgeText, { color: badge.color }]}>{badge.label}</Text>
                        </View>
                      )}
                    </View>
                    {price && (
                      <Text style={styles.scanPrice}>{price}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardSavings]}>
            <View style={styles.statIconWrap}>
              <DollarSign size={14} color="#16A34A" strokeWidth={2} />
            </View>
            <Text style={styles.statLabel}>Total Saved</Text>
            <Text style={styles.statValue}>${totalSavings > 0 ? totalSavings.toFixed(0) : '0'}</Text>
            <Text style={styles.statPeriod}>This month</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Scan size={14} color="#3B82F6" strokeWidth={2} />
            </View>
            <Text style={styles.statLabel}>Items Scanned</Text>
            <Text style={styles.statValue}>{itemsScannedCount}</Text>
            <Text style={styles.statPeriod}>This week</Text>
          </View>
        </View>

        <AdMobBanner />

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Receipts</Text>
            {recentReceipts.length > 0 && (
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  router.push('/(tabs)/receipts' as any);
                }}
                hitSlop={8}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </Pressable>
            )}
          </View>

          {recentReceipts.length > 0 ? (
            <View style={styles.listCard}>
              {recentReceipts.map((exp, index) => {
                const itemCount = exp.receiptItemsPreview
                  ? exp.receiptItemsPreview.split(',').length
                  : 0;
                return (
                  <Pressable
                    key={exp.id}
                    onPress={() => handleReceiptPress(exp.id)}
                    style={({ pressed }) => [
                      styles.receiptRow,
                      pressed && styles.scanRowPressed,
                      index < recentReceipts.length - 1 && styles.scanRowBorder,
                    ]}
                  >
                    <View style={styles.receiptIconWrap}>
                      <Text style={styles.receiptStoreIcon}>
                        {(exp.merchant || exp.title || 'S').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.scanInfo}>
                      <Text style={styles.scanItemTitle} numberOfLines={1}>
                        {exp.merchant || exp.title}
                      </Text>
                      <Text style={styles.scanItemSub}>
                        {itemCount > 0 ? `· ${itemCount} items` : ''} · {formatDate(exp.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.receiptAmount}>${exp.amount.toFixed(2)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Package size={24} color="#C7C7CC" strokeWidth={1.3} />
              <Text style={styles.emptyTitle}>No receipts yet</Text>
              <Text style={styles.emptySubtext}>Scan a receipt to start tracking</Text>
            </View>
          )}
        </View>

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
    letterSpacing: -0.5,
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
    paddingTop: 16,
  },
  scanCard: {
    backgroundColor: '#16A34A',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  scanCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  scanCardContent: {
    alignItems: 'center',
    gap: 6,
  },
  scanCardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  scanCardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  scanCardSub: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.75)',
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
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#16A34A',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardSavings: {
    borderLeftWidth: 3,
    borderLeftColor: '#16A34A',
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#8E8E93',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  statPeriod: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#AEAEB2',
    marginTop: 2,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  scanRowPressed: {
    backgroundColor: '#F8F8FA',
  },
  scanRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  scanImageWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden' as const,
    backgroundColor: '#F2F2F7',
  },
  scanImage: {
    width: 48,
    height: 48,
  },
  scanImagePlaceholder: {
    width: 48,
    height: 48,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F2F2F7',
  },
  scanInfo: {
    flex: 1,
  },
  scanItemTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  scanItemSub: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 2,
  },
  scanBadgePill: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  scanBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  scanPrice: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  receiptIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptStoreIcon: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#16A34A',
  },
  receiptAmount: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  emptySubtext: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    textAlign: 'center' as const,
  },
});
