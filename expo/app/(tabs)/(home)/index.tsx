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
  ChevronRight,
  Package,
  Receipt,
  Tag,
  Trash2,
  Heart,
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
import { useSavedItems, SavedDeal } from '@/contexts/SavedItemsContext';
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

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { expenses } = useExpenses();
  const { entries: scanEntries, deleteEntry } = useScanHistory();
  const { savedDeals, unsaveDeal } = useSavedItems();

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
      .slice(0, 4);
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

  const savedItems = useMemo(() => {
    const scanItems = scanEntries.map((e) => ({
      id: `scan-${e.id}`,
      type: 'scan' as const,
      title: e.result.item_name || 'Scanned Item',
      subtitle: e.result.category || e.result.item_type || 'Item',
      imageUri: e.imageUri,
      savedAt: e.scannedAt,
      rawScan: e,
      rawDeal: null as SavedDeal | null,
    }));
    const dealItems = savedDeals.map((d) => ({
      id: `deal-${d.id}`,
      type: 'deal' as const,
      title: d.title,
      subtitle: d.storeName,
      imageUri: d.photoUrl,
      savedAt: d.savedAt,
      rawScan: null as ScanHistoryEntry | null,
      rawDeal: d,
    }));
    return [...scanItems, ...dealItems].sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
  }, [scanEntries, savedDeals]);

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

  const handleSavedItemPress = useCallback((item: typeof savedItems[number]) => {
    void Haptics.selectionAsync();
    if (item.type === 'scan' && item.rawScan) {
      router.push({ pathname: '/smart-scan', params: { historyEntryId: item.rawScan.id } });
    } else if (item.type === 'deal' && item.rawDeal) {
      router.push({
        pathname: '/post-detail',
        params: {
          dealId: item.rawDeal.dealId,
          title: item.rawDeal.title,
          storeName: item.rawDeal.storeName,
          imageUrl: item.rawDeal.photoUrl ?? '',
          category: item.rawDeal.category ?? '',
          sourceType: item.rawDeal.sourceType ?? '',
        },
      });
    }
  }, [router]);

  const handleDeleteSavedItem = useCallback((item: typeof savedItems[number]) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (item.type === 'scan' && item.rawScan) {
      deleteEntry(item.rawScan.id);
    } else if (item.type === 'deal' && item.rawDeal) {
      unsaveDeal(item.rawDeal.dealId);
    }
  }, [deleteEntry, unsaveDeal]);

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
            onPress={() => {
              void Haptics.selectionAsync();
            }}
            style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Bell size={18} color="#FFFFFF" strokeWidth={1.5} />
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
                const category = entry.result.category || entry.result.item_type || '';
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
                          <Package size={16} color="#8E8E93" strokeWidth={1.5} />
                        </View>
                      )}
                    </View>
                    <View style={styles.scanInfo}>
                      <Text style={styles.scanItemTitle} numberOfLines={1}>
                        {entry.result.item_name || 'Scanned Item'}
                      </Text>
                      <Text style={styles.scanItemSub} numberOfLines={1}>
                        {category}{category ? ' · ' : ''}{formatTimeAgo(entry.scannedAt)}
                      </Text>
                    </View>
                    {price && (
                      <Text style={styles.scanPrice}>{price}</Text>
                    )}
                    <ChevronRight size={14} color="#48484A" strokeWidth={1.5} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${totalSavings > 0 ? totalSavings.toFixed(0) : '0'}</Text>
            <Text style={styles.statLabel}>Total Saved</Text>
            <Text style={styles.statPeriod}>This month</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{itemsScannedCount}</Text>
            <Text style={styles.statLabel}>Items Scanned</Text>
            <Text style={styles.statPeriod}>This week</Text>
          </View>
        </View>

        <AdMobBanner />

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Receipt size={15} color="#34C759" strokeWidth={1.8} />
              <Text style={styles.sectionTitle}>Recent Receipts</Text>
            </View>
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
                    <Receipt size={16} color="#34C759" strokeWidth={1.8} />
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
                  <ChevronRight size={14} color="#48484A" strokeWidth={1.5} />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Receipt size={24} color="#636366" strokeWidth={1.3} />
              <Text style={styles.emptyTitle}>No receipts yet</Text>
              <Text style={styles.emptySubtext}>Scan a receipt to start tracking</Text>
            </View>
          )}
        </View>

        {savedItems.length > 0 && (
          <View style={styles.section} testID="saved-items-card">
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Heart size={15} color="#34C759" strokeWidth={1.8} />
                <Text style={styles.sectionTitle}>Saved</Text>
              </View>
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
              {savedItems.slice(0, 4).map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleSavedItemPress(item)}
                  style={({ pressed }) => [
                    styles.scanRow,
                    pressed && styles.scanRowPressed,
                    index < Math.min(savedItems.length, 4) - 1 && styles.scanRowBorder,
                  ]}
                >
                  <View style={styles.scanImageWrap}>
                    {item.imageUri ? (
                      <Image
                        source={{ uri: item.imageUri }}
                        style={styles.scanImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View style={styles.scanImagePlaceholder}>
                        {item.type === 'deal' ? (
                          <Tag size={14} color="#636366" strokeWidth={1.5} />
                        ) : (
                          <Package size={14} color="#636366" strokeWidth={1.5} />
                        )}
                      </View>
                    )}
                  </View>
                  <View style={styles.scanInfo}>
                    <Text style={styles.scanItemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.scanItemSub} numberOfLines={1}>
                      {item.subtitle} · {formatTimeAgo(item.savedAt)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleDeleteSavedItem(item)}
                    style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.4 }]}
                    hitSlop={10}
                  >
                    <Trash2 size={14} color="#48484A" strokeWidth={1.5} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerArea: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FF9500',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  scanCard: {
    backgroundColor: '#34C759',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  scanCardPressed: {
    backgroundColor: '#2DA44E',
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#34C759',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8E8E93',
    marginTop: 2,
  },
  statPeriod: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#636366',
    marginTop: 1,
  },
  listCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  scanRowPressed: {
    backgroundColor: '#2C2C2E',
  },
  scanRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
  },
  scanImageWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden' as const,
    backgroundColor: '#2C2C2E',
  },
  scanImage: {
    width: 44,
    height: 44,
  },
  scanImagePlaceholder: {
    width: 44,
    height: 44,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#2C2C2E',
  },
  scanInfo: {
    flex: 1,
  },
  scanItemTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#FFFFFF',
  },
  scanItemSub: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 2,
  },
  scanPrice: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginRight: 4,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  receiptIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptAmount: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginRight: 4,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyState: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  emptySubtext: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    textAlign: 'center' as const,
  },
});
