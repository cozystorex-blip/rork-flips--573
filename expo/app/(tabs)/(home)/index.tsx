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
      <View style={[styles.headerArea, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brandTitle}>Flips</Text>
            <Text style={styles.brandSubtitle}>Your scan & save companion</Text>
          </View>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              router.push('/(tabs)/saved');
            }}
            style={({ pressed }) => [styles.gridBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            <Grid3x3 size={18} color="#22C55E" strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card} testID="receipts-card">
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardIconWrap}>
                <Receipt size={15} color="#22C55E" strokeWidth={2} />
              </View>
              <Text style={styles.cardTitle}>Recent Receipts</Text>
            </View>
          </View>

          {recentReceipts.length > 0 ? (
            <>
              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalAmount}>${totalReceiptAmount.toFixed(2)}</Text>
                <Text style={styles.receiptTotalLabel}> from {recentReceipts.length} receipt{recentReceipts.length !== 1 ? 's' : ''}</Text>
              </View>

              <View style={styles.receiptDivider} />

              {recentReceipts.map((exp, index) => (
                <Pressable
                  key={exp.id}
                  onPress={() => handleReceiptPress(exp.id)}
                  style={({ pressed }) => [
                    styles.receiptRow,
                    pressed && { backgroundColor: '#222222' },
                    index < recentReceipts.length - 1 && styles.receiptRowBorder,
                  ]}
                >
                  <View style={styles.receiptIconWrap}>
                    <Receipt size={13} color="#22C55E" strokeWidth={1.8} />
                  </View>
                  <View style={styles.receiptInfo}>
                    <Text style={styles.receiptMerchant} numberOfLines={1}>
                      {exp.merchant || exp.title}
                    </Text>
                    <Text style={styles.receiptDate}>{formatDate(exp.createdAt)}</Text>
                  </View>
                  <Text style={styles.receiptAmount}>${exp.amount.toFixed(2)}</Text>
                  <ChevronRight size={14} color="#444444" strokeWidth={2} />
                </Pressable>
              ))}
            </>
          ) : (
            <View style={styles.emptyCardContent}>
              <View style={styles.emptyIconCircle}>
                <Receipt size={22} color="#22C55E" strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyCardText}>No receipts yet</Text>
              <Text style={styles.emptyCardSubtext}>Scan a receipt to start tracking your spending</Text>
            </View>
          )}
        </View>

        <AdMobBanner />

        {savedItems.length > 0 && (
          <View style={styles.card} testID="saved-items-card">
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <View style={styles.cardIconWrap}>
                  <Heart size={15} color="#22C55E" strokeWidth={2} />
                </View>
                <Text style={styles.cardTitle}>Saved</Text>
              </View>
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  router.push('/(tabs)/saved');
                }}
                hitSlop={8}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.seeAllText}>See all</Text>
              </Pressable>
            </View>

            {savedItems.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => handleSavedItemPress(item)}
                style={({ pressed }) => [
                  styles.savedRow,
                  pressed && { backgroundColor: '#222222' },
                  index < savedItems.length - 1 && styles.savedRowBorder,
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
                        <Tag size={14} color="#555555" strokeWidth={1.5} />
                      ) : (
                        <Package size={14} color="#555555" strokeWidth={1.5} />
                      )}
                    </View>
                  )}
                </View>
                <View style={styles.savedInfo}>
                  <Text style={styles.savedTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.savedSubtitle} numberOfLines={1}>
                    {item.subtitle} · {formatTimeAgo(item.savedAt)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDeleteSavedItem(item)}
                  style={({ pressed }) => [styles.savedDeleteBtn, pressed && { opacity: 0.4 }]}
                  hitSlop={10}
                >
                  <Trash2 size={14} color="#444444" strokeWidth={1.5} />
                </Pressable>
              </Pressable>
            ))}
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
    backgroundColor: '#0A0A0A',
  },
  headerArea: {
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 22,
    paddingBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#F5F5F5',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#22C55E',
    marginTop: 2,
  },
  gridBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#22C55E18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#F5F5F5',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#22C55E',
  },
  savedRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    gap: 12,
  },
  savedRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  savedImageWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    overflow: 'hidden' as const,
    backgroundColor: '#111111',
  },
  savedImage: {
    width: 42,
    height: 42,
  },
  savedImagePlaceholder: {
    width: 42,
    height: 42,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#111111',
  },
  savedInfo: {
    flex: 1,
  },
  savedTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#F5F5F5',
  },
  savedSubtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#666666',
    marginTop: 2,
  },
  savedDeleteBtn: {
    padding: 6,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  receiptTotalAmount: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#22C55E',
    letterSpacing: -1,
  },
  receiptTotalLabel: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#666666',
    marginLeft: 4,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginBottom: 4,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  receiptRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  receiptIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#22C55E18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptInfo: {
    flex: 1,
  },
  receiptMerchant: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#F5F5F5',
  },
  receiptDate: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#666666',
    marginTop: 2,
  },
  receiptAmount: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#F5F5F5',
    marginRight: 2,
  },
  emptyCardContent: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 12,
    marginTop: 2,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#22C55E18',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyCardText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#F5F5F5',
  },
  emptyCardSubtext: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#666666',
    marginTop: 4,
    textAlign: 'center' as const,
    lineHeight: 18,
    maxWidth: 240,
  },
});
