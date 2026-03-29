import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 12,
        }),
      ]),
    ]).start();
  }, [fadeAnim, slideAnim, headerFade]);

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
      <Animated.View style={[styles.headerArea, { paddingTop: insets.top + 16, opacity: headerFade }]}>
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
            style={({ pressed }) => [styles.gridBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] }]}
            hitSlop={8}
          >
            <Grid3x3 size={18} color="#6B7266" strokeWidth={1.8} />
          </Pressable>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          <View style={styles.card} testID="receipts-card">
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <View style={styles.cardIconWrap}>
                  <Receipt size={15} color="#2D6A4F" strokeWidth={2} />
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
                      pressed && { backgroundColor: '#F6F7F4' },
                      index < recentReceipts.length - 1 && styles.receiptRowBorder,
                    ]}
                  >
                    <View style={styles.receiptIconWrap}>
                      <Receipt size={13} color="#2D6A4F" strokeWidth={1.8} />
                    </View>
                    <View style={styles.receiptInfo}>
                      <Text style={styles.receiptMerchant} numberOfLines={1}>
                        {exp.merchant || exp.title}
                      </Text>
                      <Text style={styles.receiptDate}>{formatDate(exp.createdAt)}</Text>
                    </View>
                    <Text style={styles.receiptAmount}>${exp.amount.toFixed(2)}</Text>
                    <ChevronRight size={14} color="#CBD5C0" strokeWidth={2} />
                  </Pressable>
                ))}
              </>
            ) : (
              <View style={styles.emptyCardContent}>
                <View style={styles.emptyIconCircle}>
                  <Receipt size={20} color="#2D6A4F" strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyCardText}>No receipts yet</Text>
                <Text style={styles.emptyCardSubtext}>Scan a receipt to start tracking your spending</Text>
              </View>
            )}
          </View>

          {savedItems.length > 0 && (
            <View style={styles.card} testID="saved-items-card">
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.cardIconWrap}>
                    <Heart size={15} color="#2D6A4F" strokeWidth={2} />
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
                    pressed && { backgroundColor: '#F6F7F4' },
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
                          <Tag size={14} color="#B5B0A8" strokeWidth={1.5} />
                        ) : (
                          <Package size={14} color="#B5B0A8" strokeWidth={1.5} />
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
                    <Trash2 size={14} color="#C8C4BC" strokeWidth={1.5} />
                  </Pressable>
                </Pressable>
              ))}
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
    backgroundColor: '#EDEFE8',
  },
  headerArea: {
    backgroundColor: '#EDEFE8',
    paddingHorizontal: 22,
    paddingBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#1A1F16',
    letterSpacing: -0.8,
  },
  brandSubtitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#8A8F82',
    marginTop: 2,
    letterSpacing: -0.1,
  },
  gridBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#3C4A33',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E4EDE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1A1F16',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2D6A4F',
    letterSpacing: -0.1,
  },

  savedRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    gap: 12,
    borderRadius: 10,
  },
  savedRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFF1EB',
  },
  savedImageWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden' as const,
    backgroundColor: '#F2F4EE',
  },
  savedImage: {
    width: 44,
    height: 44,
  },
  savedImagePlaceholder: {
    width: 44,
    height: 44,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F2F4EE',
  },
  savedInfo: {
    flex: 1,
  },
  savedTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1A1F16',
    letterSpacing: -0.2,
  },
  savedSubtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#A0A59A',
    marginTop: 2,
  },
  savedDeleteBtn: {
    padding: 6,
  },

  receiptTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  receiptTotalAmount: {
    fontSize: 34,
    fontWeight: '700' as const,
    color: '#1A1F16',
    letterSpacing: -1.4,
  },
  receiptTotalLabel: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#8A8F82',
    marginLeft: 4,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#EFF1EB',
    marginBottom: 4,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
    borderRadius: 10,
  },
  receiptRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFF1EB',
  },
  receiptIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#E4EDE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptInfo: {
    flex: 1,
  },
  receiptMerchant: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1A1F16',
    letterSpacing: -0.2,
  },
  receiptDate: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#A0A59A',
    marginTop: 2,
  },
  receiptAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1F16',
    letterSpacing: -0.3,
    marginRight: 2,
  },

  emptyCardContent: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#F6F8F3',
    borderRadius: 16,
    marginTop: 2,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#E4EDE6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyCardText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#3C4A33',
    letterSpacing: -0.2,
  },
  emptyCardSubtext: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8A8F82',
    marginTop: 4,
    textAlign: 'center' as const,
    lineHeight: 18,
    maxWidth: 240,
  },


});
