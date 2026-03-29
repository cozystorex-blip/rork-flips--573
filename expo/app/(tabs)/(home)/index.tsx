import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Package,
  Receipt,
  Bell,
  Flame,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import ScanFrameIcon from '@/components/ScanFrameIcon';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { useExpenses } from '@/contexts/ExpenseContext';
import { useScanHistory, ScanHistoryEntry } from '@/contexts/ScanHistoryContext';
import { useSavedItems } from '@/contexts/SavedItemsContext';
import AdMobBanner from '@/components/ads/AdMobBanner';

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
  }
  if (d.resale_demand && typeof d.resale_demand === 'string') {
    const rd = d.resale_demand.toLowerCase();
    if (rd.includes('high')) return { label: 'High Demand', color: '#16A34A' };
  }
  return null;
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
      <View style={[styles.headerArea, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.brandTitle}>Flip</Text>
          {streakDays > 0 && (
            <View style={styles.streakBadge}>
              <Flame size={12} color="#FF9500" strokeWidth={2} />
              <Text style={styles.streakText}>{streakDays}-day streak</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => { void Haptics.selectionAsync(); }}
            style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Bell size={18} color="#1C1C1E" strokeWidth={1.5} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Pressable
          onPress={handleScanPress}
          style={({ pressed }) => [styles.scanCard, pressed && styles.scanCardPressed]}
          testID="home-scan-card"
        >
          <View style={styles.scanCardInner}>
            <ScanFrameIcon size={40} color="#FFFFFF" strokeWidth={2} />
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
                const category = entry.result.category || entry.result.item_type || '';
                const subtitle = category ? `${category} · ${entry.result.item_type || ''}` : '';
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
                          <Package size={16} color="#C7C7CC" strokeWidth={1.5} />
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
                        <View style={[styles.scanBadgePill, { backgroundColor: badge.color + '14' }]}>
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
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Saved</Text>
            <Text style={styles.statValue}>${totalSavings > 0 ? totalSavings.toFixed(0) : '0'}</Text>
            <Text style={styles.statPeriod}>This month</Text>
          </View>
          <View style={styles.statCard}>
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
                  router.push('/(tabs)/analytics');
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
              {recentReceipts.map((exp, index) => (
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
                    <Receipt size={16} color="#16A34A" strokeWidth={1.8} />
                  </View>
                  <View style={styles.scanInfo}>
                    <Text style={styles.scanItemTitle} numberOfLines={1}>
                      {exp.merchant || exp.title}
                    </Text>
                    <Text style={styles.scanItemSub}>
                      {exp.receiptItemsPreview ? `${exp.receiptItemsPreview.split(',').length} items` : ''} · {formatDate(exp.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.receiptAmount}>${exp.amount.toFixed(2)}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Receipt size={24} color="#C7C7CC" strokeWidth={1.3} />
              <Text style={styles.emptyTitle}>No receipts yet</Text>
              <Text style={styles.emptySubtext}>Scan a receipt to start tracking</Text>
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
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
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTitle: {
    fontSize: 32,
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600' as const,
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
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  scanCardPressed: {
    backgroundColor: '#15803D',
  },
  scanCardInner: {
    alignItems: 'center',
    gap: 6,
  },
  scanCardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginTop: 4,
  },
  scanCardSub: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.8)',
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
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  statPeriod: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#AEAEB2',
    marginTop: 1,
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
    backgroundColor: '#F2F2F7',
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
