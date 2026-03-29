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
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronRight,
  Package,
  Receipt,
  Grid3x3,
  Camera,
  Lightbulb,
  RefreshCw,
  ScanLine,
  Bookmark,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { useExpenses } from '@/contexts/ExpenseContext';
import { useScanHistory, ScanHistoryEntry } from '@/contexts/ScanHistoryContext';
import { useSavedItems, SavedDeal } from '@/contexts/SavedItemsContext';
import { generateAISuggestions, AISuggestion } from '@/services/aiSuggestionsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCANNED_ITEM_WIDTH = (SCREEN_WIDTH - 48 - 24) / 3;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { expenses } = useExpenses();
  const { entries: scanEntries } = useScanHistory();
  const { savedDeals } = useSavedItems();
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

  const recentScans = useMemo(() => {
    return scanEntries
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
      .slice(0, 6);
  }, [scanEntries]);

  const suggestionQuery = useQuery({
    queryKey: ['ai_suggestions', scanEntries.length, expenses.length],
    queryFn: () => generateAISuggestions(scanEntries, expenses),
    staleTime: 1000 * 60 * 5,
    enabled: scanEntries.length > 0 || expenses.length > 0,
  });

  const currentSuggestion = useMemo<AISuggestion | null>(() => {
    const suggestions = suggestionQuery.data;
    if (!suggestions || suggestions.length === 0) return null;
    return suggestions[0];
  }, [suggestionQuery.data]);

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

  const handleSeeAllScans = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/(tabs)/saved');
  }, [router]);

  const handleRefreshSuggestions = useCallback(() => {
    void Haptics.selectionAsync();
    void suggestionQuery.refetch();
  }, [suggestionQuery]);

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

          <View style={styles.card} testID="scanned-items-card">
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <View style={styles.cardIconWrap}>
                  <ScanLine size={15} color="#2D6A4F" strokeWidth={2} />
                </View>
                <Text style={styles.cardTitle}>Scanned Items</Text>
              </View>
              {recentScans.length > 0 && (
                <Pressable onPress={handleSeeAllScans} hitSlop={8} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                  <Text style={styles.seeAllText}>See all</Text>
                </Pressable>
              )}
            </View>

            {recentScans.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scannedScrollContent}
              >
                {recentScans.map((entry) => (
                  <Pressable
                    key={entry.id}
                    onPress={() => handleScanItemPress(entry)}
                    style={({ pressed }) => [
                      styles.scannedItem,
                      pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                    ]}
                  >
                    <View style={styles.scannedImageWrap}>
                      {entry.imageUri ? (
                        <Image
                          source={{ uri: entry.imageUri }}
                          style={styles.scannedImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View style={styles.scannedImagePlaceholder}>
                          <Package size={20} color="#C8C4BC" strokeWidth={1.5} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.scannedCategory} numberOfLines={1}>
                      {entry.result.category || entry.result.item_type || 'Item'}
                    </Text>
                    <Text style={styles.scannedName} numberOfLines={1}>
                      {entry.result.item_name || 'Scanned Item'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyCardContent}>
                <View style={styles.emptyIconCircle}>
                  <ScanLine size={20} color="#2D6A4F" strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyCardText}>No scanned items</Text>
                <Text style={styles.emptyCardSubtext}>Point your camera at any item to identify it</Text>
              </View>
            )}
          </View>

          <View style={styles.card} testID="suggestions-card">
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#FFF8E7' }]}>
                  <Sparkles size={15} color="#D4A017" strokeWidth={2} />
                </View>
                <Text style={styles.cardTitle}>You May Also Need</Text>
              </View>
              {(scanEntries.length > 0 || expenses.length > 0) && (
                <Pressable onPress={handleRefreshSuggestions} hitSlop={8} style={({ pressed }) => [pressed && { opacity: 0.5 }]}>
                  <RefreshCw size={15} color="#A09B93" strokeWidth={2} />
                </Pressable>
              )}
            </View>

            {suggestionQuery.isLoading ? (
              <View style={styles.suggestionLoading}>
                <ActivityIndicator size="small" color="#2D6A4F" />
                <Text style={styles.suggestionLoadingText}>Finding suggestions...</Text>
              </View>
            ) : currentSuggestion ? (
              <View style={styles.suggestionContent}>
                <View style={styles.suggestionBox}>
                  {currentSuggestion.image ? (
                    <Image
                      source={{ uri: currentSuggestion.image }}
                      style={styles.suggestionImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={styles.suggestionImagePlaceholder}>
                      <Lightbulb size={18} color="#2D6A4F" strokeWidth={1.5} />
                    </View>
                  )}
                  <View style={styles.suggestionTextWrap}>
                    <Text style={styles.suggestionTitle}>{currentSuggestion.title}</Text>
                    {currentSuggestion.reason ? (
                      <Text style={styles.suggestionReason} numberOfLines={2}>{currentSuggestion.reason}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.emptyCardContent}>
                <View style={[styles.emptyIconCircle, { backgroundColor: '#FFF8E7' }]}>
                  <Sparkles size={20} color="#D4A017" strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyCardText}>Smart suggestions</Text>
                <Text style={styles.emptyCardSubtext}>Scan items to get personalized recommendations</Text>
              </View>
            )}
          </View>

          {(() => {
            const recentSaved: { id: string; type: 'scan' | 'deal'; title: string; imageUri: string | null; time: string; raw: ScanHistoryEntry | SavedDeal }[] = [
              ...scanEntries.map((e) => ({
                id: `scan-${e.id}`,
                type: 'scan' as const,
                title: e.result.item_name || 'Scanned Item',
                imageUri: e.imageUri,
                time: e.scannedAt,
                raw: e as ScanHistoryEntry | SavedDeal,
              })),
              ...savedDeals.map((d) => ({
                id: `deal-${d.id}`,
                type: 'deal' as const,
                title: d.title,
                imageUri: d.photoUrl,
                time: d.savedAt,
                raw: d as ScanHistoryEntry | SavedDeal,
              })),
            ]
              .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
              .slice(0, 5);

            if (recentSaved.length === 0) return null;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <View style={[styles.cardIconWrap, { backgroundColor: '#EDE9FE' }]}>
                      <Bookmark size={15} color="#7C3AED" strokeWidth={2} />
                    </View>
                    <Text style={styles.cardTitle}>Saved</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      void Haptics.selectionAsync();
                      router.push('/(tabs)/saved');
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.seeAllText}>See all</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.savedScrollContent}
                >
                  {recentSaved.map((item) => (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [
                        styles.savedCard,
                        pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                      ]}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        if (item.type === 'scan') {
                          const scanEntry = item.raw as ScanHistoryEntry;
                          router.push({ pathname: '/smart-scan', params: { historyEntryId: scanEntry.id } });
                        } else {
                          const deal = item.raw as SavedDeal;
                          router.push({
                            pathname: '/post-detail',
                            params: {
                              dealId: deal.dealId,
                              title: deal.title,
                              storeName: deal.storeName,
                              imageUrl: deal.photoUrl ?? '',
                              category: deal.category ?? '',
                              sourceType: deal.sourceType ?? '',
                              price: deal.price != null ? String(deal.price) : '',
                              originalPrice: deal.originalPrice != null ? String(deal.originalPrice) : '',
                              savingsAmount: deal.savingsAmount != null ? String(deal.savingsAmount) : '',
                            },
                          });
                        }
                      }}
                    >
                      <View style={styles.savedCardImageWrap}>
                        {item.imageUri ? (
                          <Image
                            source={{ uri: item.imageUri }}
                            style={styles.savedCardImage}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                        ) : (
                          <View style={styles.savedCardPlaceholder}>
                            <Package size={18} color="#C8C4BC" strokeWidth={1.5} />
                          </View>
                        )}
                      </View>
                      <Text style={styles.savedCardTitle} numberOfLines={2}>{item.title}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            );
          })()}

          <Pressable
            onPress={handleScanPress}
            style={({ pressed }) => [
              styles.scanCta,
              pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
            ]}
            testID="home-scan-cta"
          >
            <View style={styles.scanCtaLeft}>
              <View style={styles.scanCtaIconWrap}>
                <Camera size={22} color="#FFFFFF" strokeWidth={1.8} />
              </View>
              <View style={styles.scanCtaTextWrap}>
                <Text style={styles.scanCtaTitle}>Scan Something</Text>
                <Text style={styles.scanCtaSubtitle}>Items, receipts, food — just point and go</Text>
              </View>
            </View>
            <ArrowRight size={18} color="rgba(255,255,255,0.6)" strokeWidth={2.2} />
          </Pressable>

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

  scannedScrollContent: {
    gap: 12,
    paddingRight: 4,
  },
  scannedItem: {
    width: SCANNED_ITEM_WIDTH,
  },
  scannedImageWrap: {
    width: SCANNED_ITEM_WIDTH,
    height: SCANNED_ITEM_WIDTH,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F2F4EE',
    marginBottom: 8,
  },
  scannedImage: {
    width: '100%',
    height: '100%',
  },
  scannedImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannedCategory: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1A1F16',
    letterSpacing: -0.1,
  },
  scannedName: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#A0A59A',
    marginTop: 2,
    lineHeight: 16,
  },

  suggestionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  suggestionLoadingText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#A0A59A',
  },
  suggestionContent: {},
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E4EDE6',
    borderRadius: 16,
    padding: 14,
    gap: 14,
  },
  suggestionImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#D0DFD3',
  },
  suggestionImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#D0DFD3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1F16',
    letterSpacing: -0.2,
  },
  suggestionReason: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#4A5044',
    marginTop: 3,
    lineHeight: 18,
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

  savedScrollContent: {
    gap: 10,
    paddingRight: 4,
  },
  savedCard: {
    width: 114,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F6F8F3',
  },
  savedCardImageWrap: {
    width: 114,
    height: 90,
  },
  savedCardImage: {
    width: 114,
    height: 90,
  },
  savedCardPlaceholder: {
    width: 114,
    height: 90,
    backgroundColor: '#E8EBE3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedCardTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#1A1F16',
    paddingHorizontal: 8,
    paddingVertical: 8,
    lineHeight: 16,
  },

  scanCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2D6A4F',
    borderRadius: 22,
    padding: 20,
    marginBottom: 4,
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  scanCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  scanCtaIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanCtaTextWrap: {
    flex: 1,
  },
  scanCtaTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  scanCtaSubtitle: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 3,
    lineHeight: 17,
  },
});
