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
  Grid3x3,
  Tag,
  Trash2,
  Heart,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';

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

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { expenses } = useExpenses();
  const { entries: scanEntries, deleteEntry } = useScanHistory();
  const { savedDeals, unsaveDeal } = useSavedItems();

  const recentReceipts = useMemo(() => {
    return expenses
      .filter((e) => e.amount > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [expenses]);

  const totalReceiptAmount = useMemo(() => {
    return recentReceipts.reduce((s, e) => s + e.amount, 0);
  }, [recentReceipts]);

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

  const handleReceiptPress = useCallback((expenseId: string) => {
    void Haptics.selectionAsync();
    router.push({ pathname: '/receipt-detail', params: { expenseId } });
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
      <View style={[styles.headerArea, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.brandTitle}>Flips</Text>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              router.push('/(tabs)/saved');
            }}
            style={({ pressed }) => [styles.gridBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Grid3x3 size={18} color="#8E8E93" strokeWidth={1.5} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section} testID="receipts-card">
          <View style={styles.sectionHeader}>
            <Receipt size={16} color="#34C759" strokeWidth={1.8} />
            <Text style={styles.sectionTitle}>Recent Receipts</Text>
          </View>

          {recentReceipts.length > 0 ? (
            <>
              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalAmount}>${totalReceiptAmount.toFixed(2)}</Text>
                <Text style={styles.receiptTotalLabel}> from {recentReceipts.length} receipt{recentReceipts.length !== 1 ? 's' : ''}</Text>
              </View>

              <View style={styles.listCard}>
                {recentReceipts.map((exp, index) => (
                  <Pressable
                    key={exp.id}
                    onPress={() => handleReceiptPress(exp.id)}
                    style={({ pressed }) => [
                      styles.listRow,
                      pressed && styles.listRowPressed,
                      index < recentReceipts.length - 1 && styles.listRowBorder,
                    ]}
                  >
                    <View style={styles.listIconWrap}>
                      <Receipt size={14} color="#34C759" strokeWidth={1.8} />
                    </View>
                    <View style={styles.listInfo}>
                      <Text style={styles.listPrimary} numberOfLines={1}>
                        {exp.merchant || exp.title}
                      </Text>
                      <Text style={styles.listSecondary}>{formatDate(exp.createdAt)}</Text>
                    </View>
                    <Text style={styles.listAmount}>${exp.amount.toFixed(2)}</Text>
                    <ChevronRight size={14} color="#48484A" strokeWidth={1.8} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Receipt size={28} color="#636366" strokeWidth={1.3} />
              <Text style={styles.emptyTitle}>No receipts yet</Text>
              <Text style={styles.emptySubtext}>Scan a receipt to start tracking</Text>
            </View>
          )}
        </View>

        <AdMobBanner />

        {savedItems.length > 0 && (
          <View style={styles.section} testID="saved-items-card">
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeader}>
                <Heart size={16} color="#34C759" strokeWidth={1.8} />
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
              {savedItems.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleSavedItemPress(item)}
                  style={({ pressed }) => [
                    styles.listRow,
                    pressed && styles.listRowPressed,
                    index < savedItems.length - 1 && styles.listRowBorder,
                  ]}
                >
                  <View style={styles.savedImageWrap}>
                    {item.imageUri ? (
                      <Image
                        source={{ uri: item.imageUri }}
                        style={styles.savedImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View style={styles.savedImagePlaceholder}>
                        {item.type === 'deal' ? (
                          <Tag size={14} color="#636366" strokeWidth={1.5} />
                        ) : (
                          <Package size={14} color="#636366" strokeWidth={1.5} />
                        )}
                      </View>
                    )}
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={styles.listPrimary} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.listSecondary} numberOfLines={1}>
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
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '800' as const,
    color: '#34C759',
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  gridBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#34C759',
  },
  seeAllText: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: '#34C759',
  },
  receiptTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  receiptTotalAmount: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#34C759',
    letterSpacing: -0.5,
  },
  receiptTotalLabel: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginLeft: 4,
  },
  listCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  listRowPressed: {
    backgroundColor: '#2C2C2E',
  },
  listRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
  },
  listIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listInfo: {
    flex: 1,
  },
  listPrimary: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: '#FFFFFF',
  },
  listSecondary: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 2,
  },
  listAmount: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#34C759',
    marginRight: 4,
  },
  savedImageWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden' as const,
    backgroundColor: '#2C2C2E',
  },
  savedImage: {
    width: 40,
    height: 40,
  },
  savedImagePlaceholder: {
    width: 40,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#2C2C2E',
  },
  deleteBtn: {
    padding: 6,
  },
  emptyState: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#34C759',
  },
  emptySubtext: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    textAlign: 'center' as const,
  },
});
