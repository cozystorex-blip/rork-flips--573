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
  ActivityIndicator,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Receipt, ReceiptText, ScanLine, ChevronRight, Package, FileText, RefreshCw } from 'lucide-react-native';
import { AppIllustrations } from '@/constants/illustrations';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { useExpenses } from '@/contexts/ExpenseContext';
import { useScanHistory, ScanHistoryEntry } from '@/contexts/ScanHistoryContext';
import { generateAISuggestions, AISuggestion } from '@/services/aiSuggestionsService';

import * as Haptics from 'expo-haptics';

function buildSuggestionKey(scans: ScanHistoryEntry[], receipts: { id: string; category: string }[]): string {
  const scanPart = scans.slice(0, 5).map(s => `${s.id}-${s.result.item_type}`).join('|');
  const receiptPart = receipts.slice(0, 5).map(r => `${r.id}-${r.category}`).join('|');
  return `${scanPart}::${receiptPart}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getScanBrand(entry: ScanHistoryEntry): string {
  const r = entry.result;
  if (r.grocery_details?.brand) return r.grocery_details.brand;
  if (r.household_details?.brand) return r.household_details.brand;
  if (r.fashion_details?.brand) return r.fashion_details.brand;
  if (r.electronics_details?.brand) return r.electronics_details.brand;
  return r.category || 'Item';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { expenses } = useExpenses();
  const { entries: scanEntries } = useScanHistory();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const recentReceipts = useMemo(() => {
    return expenses
      .filter(e => e.amount > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [expenses]);

  const receiptsTotal = useMemo(() => {
    return recentReceipts.reduce((sum, e) => sum + e.amount, 0);
  }, [recentReceipts]);

  const recentScans = useMemo(() => {
    return scanEntries.slice(0, 8);
  }, [scanEntries]);

  const hasData = recentScans.length > 0 || recentReceipts.length > 0;

  const suggestionKey = useMemo(() => {
    return buildSuggestionKey(recentScans, recentReceipts);
  }, [recentScans, recentReceipts]);

  const queryClient = useQueryClient();

  const suggestionsQuery = useQuery<AISuggestion[]>({
    queryKey: ['ai_suggestions', suggestionKey],
    queryFn: () => generateAISuggestions(recentScans, recentReceipts),
    enabled: hasData,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });

  const suggestions = suggestionsQuery.data ?? [];
  const suggestionsLoading = suggestionsQuery.isLoading || suggestionsQuery.isFetching;
  const suggestionsError = suggestionsQuery.isError;

  const handleRefreshSuggestions = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void queryClient.invalidateQueries({ queryKey: ['ai_suggestions'] });
  }, [queryClient]);

  const handleScanCardPress = useCallback((entry: ScanHistoryEntry) => {
    void Haptics.selectionAsync();
    router.push({
      pathname: '/smart-scan',
      params: { historyEntryId: entry.id },
    });
  }, [router]);

  const handleScanPress = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/smart-scan');
  }, [router]);

  const handleReceiptPress = useCallback((expenseId: string) => {
    void Haptics.selectionAsync();
    router.push({ pathname: '/receipt-detail', params: { expenseId } });
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 6 }]}>
        <Text style={styles.headerBrand}>Flips</Text>
        <Text style={styles.headerSubtitle}>Your scan & save companion</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Recent Receipts */}
          <View style={styles.sectionCard} testID="recent-receipts-card">
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionIconBadge}>
                  <Receipt size={14} color="#000000" strokeWidth={2} />
                </View>
                <Text style={styles.sectionTitle}>Recent Receipts</Text>
              </View>
              {recentReceipts.length > 3 && (
                <Pressable onPress={() => router.push('/(tabs)/analytics')} hitSlop={8}>
                  <Text style={styles.seeAllText}>See all</Text>
                </Pressable>
              )}
            </View>

            {recentReceipts.length > 0 && (
              <Text style={styles.receiptSummary}>
                <Text style={styles.receiptSummaryAmount}>${receiptsTotal.toFixed(2)}</Text>
                <Text style={styles.receiptSummaryLabel}> from {recentReceipts.length} receipt{recentReceipts.length !== 1 ? 's' : ''}</Text>
              </Text>
            )}

            {recentReceipts.length === 0 ? (
              <View style={styles.emptyState}>
                <ExpoImage
                  source={{ uri: AppIllustrations.receipt }}
                  style={styles.emptyIllustration}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
                <Text style={styles.emptyText}>No receipts yet</Text>
                <Text style={styles.emptySubtext}>Scan a receipt to track your spending</Text>
              </View>
            ) : (
              <View style={styles.receiptList}>
                {recentReceipts.slice(0, 4).map((expense, idx) => (
                  <Pressable
                    key={expense.id}
                    style={({ pressed }) => [
                      styles.receiptRow,
                      idx < Math.min(recentReceipts.length, 4) - 1 && styles.receiptRowBorder,
                      pressed && styles.receiptRowPressed,
                    ]}
                    onPress={() => handleReceiptPress(expense.id)}
                    testID={`receipt-row-${expense.id}`}
                  >
                    <View style={[
                      styles.receiptThumb,
                      expense.receiptConfidence ? styles.receiptThumbScanned : undefined,
                    ]}>
                      {expense.receiptConfidence ? (
                        <ReceiptText size={18} color="#00C853" strokeWidth={1.8} />
                      ) : (
                        <FileText size={16} color="#636366" strokeWidth={1.5} />
                      )}
                    </View>
                    <View style={styles.receiptInfo}>
                      <Text style={styles.receiptStore} numberOfLines={1}>{expense.title || 'Receipt'}</Text>
                      <Text style={styles.receiptDate}>{formatDate(expense.createdAt)}</Text>
                    </View>
                    <View style={styles.receiptAmountRow}>
                      <Text style={styles.receiptAmount}>${expense.amount.toFixed(2)}</Text>
                      <ChevronRight size={14} color="#48484A" strokeWidth={2} />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Scanned Items */}
          <View style={styles.sectionCard} testID="scanned-items-card">
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIconBadge, { backgroundColor: '#00C853' }]}>
                  <ScanLine size={14} color="#000000" strokeWidth={2} />
                </View>
                <Text style={styles.sectionTitle}>Scanned Items</Text>
              </View>
              {scanEntries.length > 4 && (
                <Pressable onPress={handleScanPress} hitSlop={8}>
                  <Text style={styles.seeAllText}>See all</Text>
                </Pressable>
              )}
            </View>

            {recentScans.length === 0 ? (
              <Pressable style={styles.scanEmptyRow} onPress={handleScanPress}>
                <ExpoImage
                  source={{ uri: AppIllustrations.scanner }}
                  style={styles.scanEmptyIllustration}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
                <View style={styles.scanEmptyTextWrap}>
                  <Text style={styles.scanEmptyTitle}>No Scanned Items</Text>
                  <Text style={styles.emptySubtext}>Point your camera at a receipt or product</Text>
                </View>
                <ChevronRight size={16} color="#48484A" strokeWidth={2} />
              </Pressable>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scannedItemsRow}
              >
                {recentScans.map((entry) => (
                  <Pressable
                    key={entry.id}
                    style={({ pressed }) => [
                      styles.scannedItemCard,
                      pressed && styles.scannedItemPressed,
                    ]}
                    onPress={() => handleScanCardPress(entry)}
                    testID={`scanned-item-${entry.id}`}
                  >
                    {entry.imageUri ? (
                      <ExpoImage
                        source={{ uri: entry.imageUri }}
                        style={styles.scannedItemImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        recyclingKey={`scan-${entry.id}`}
                      />
                    ) : (
                      <View style={styles.scannedItemPlaceholder}>
                        <Package size={24} color="#48484A" strokeWidth={1.5} />
                      </View>
                    )}
                    <Text style={styles.scannedItemTitle} numberOfLines={1}>
                      {getScanBrand(entry)}
                    </Text>
                    <Text style={styles.scannedItemSubtitle} numberOfLines={1}>
                      {entry.result.item_name || 'Item'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          {/* You May Also Need — AI-powered */}
          {hasData ? (
            <View style={styles.sectionCard} testID="suggestions-card">
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <ExpoImage
                    source={{ uri: AppIllustrations.greatValue }}
                    style={styles.sectionIllustrationBadge}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                  <Text style={styles.sectionTitle}>You May Also Need</Text>
                </View>
                {suggestions.length > 0 && (
                  <Pressable
                    onPress={handleRefreshSuggestions}
                    hitSlop={12}
                    style={({ pressed }) => [styles.refreshButton, pressed && { opacity: 0.6 }]}
                  >
                    <RefreshCw size={14} color="#8E8E93" strokeWidth={2} />
                  </Pressable>
                )}
              </View>

              {suggestionsLoading && suggestions.length === 0 ? (
                <View style={styles.suggestionsLoadingWrap}>
                  <ActivityIndicator size="small" color="#D97706" />
                  <Text style={styles.suggestionsLoadingText}>Analyzing your scans...</Text>
                </View>
              ) : suggestionsError && suggestions.length === 0 ? (
                <Pressable style={styles.suggestionsErrorWrap} onPress={handleRefreshSuggestions}>
                  <Text style={styles.emptyText}>Could not load suggestions</Text>
                  <Text style={styles.suggestionsRetryText}>Tap to retry</Text>
                </Pressable>
              ) : suggestions.length > 0 ? (
                <View style={styles.suggestionInnerCard}>
                  <View style={styles.suggestionContentRow}>
                    <ExpoImage
                      source={{ uri: suggestions[0].image }}
                      style={styles.suggestionImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    <Text style={styles.suggestionTitle} numberOfLines={2}>{suggestions[0].title}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.sectionCard} testID="suggestions-card">
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <ExpoImage
                    source={{ uri: AppIllustrations.greatValue }}
                    style={styles.sectionIllustrationBadge}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                  <Text style={styles.sectionTitle}>You May Also Need</Text>
                </View>
              </View>
              <View style={styles.emptyState}>
                <ExpoImage
                  source={{ uri: AppIllustrations.package }}
                  style={styles.emptyIllustration}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
                <Text style={styles.emptyText}>Scan an item to get smart suggestions</Text>
                <Text style={styles.emptySubtext}>AI will recommend related items you may need</Text>
              </View>
            </View>
          )}

          {/* Quick Action */}
          <Pressable
            style={({ pressed }) => [
              styles.quickActionCard,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleScanPress}
            testID="quick-scan-action"
          >
            <ExpoImage
              source={{ uri: AppIllustrations.scanner }}
              style={styles.quickActionIllustration}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
            <View style={styles.quickActionTextWrap}>
              <Text style={styles.quickActionTitle}>Scan Something</Text>
              <Text style={styles.quickActionSubtitle}>Items, receipts, food — just point and scan</Text>
            </View>
            <ChevronRight size={18} color="#FFFFFF" strokeWidth={2} />
          </Pressable>

        </Animated.View>

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
  headerBar: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  headerBrand: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#1B7A45',
  },
  receiptSummary: {
    marginBottom: 12,
    marginTop: -2,
  },
  receiptSummaryAmount: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  receiptSummaryLabel: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#8E8E93',
  },
  receiptList: {},
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  receiptRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  receiptThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptThumbScanned: {
    backgroundColor: '#E8F5EE',
    borderWidth: 1,
    borderColor: '#D1ECDD',
  },
  receiptInfo: {
    flex: 1,
    marginLeft: 12,
  },
  receiptStore: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  receiptDate: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 1,
  },
  receiptAmount: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  receiptAmountRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  receiptRowPressed: {
    backgroundColor: '#F2F2F7',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#8E8E93',
    marginTop: 6,
  },
  emptySubtext: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#AEAEB2',
    marginTop: 2,
  },
  scanEmptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  scanEmptyIllustration: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  scanEmptyTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  scannedItemsRow: {
    gap: 10,
    paddingRight: 4,
  },
  scannedItemCard: {
    width: 110,
    alignItems: 'center',
  },
  scannedItemPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  scannedItemImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  scannedItemPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannedItemTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    marginTop: 6,
    textAlign: 'center' as const,
    letterSpacing: -0.1,
  },
  scannedItemSubtitle: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 1,
    textAlign: 'center' as const,
  },
  suggestionInnerCard: {
    backgroundColor: '#F0FAF3',
    borderRadius: 12,
    padding: 12,
    overflow: 'hidden' as const,
  },
  suggestionContentRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  suggestionImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#E0F2E8',
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1B7A45',
    letterSpacing: -0.2,
    flex: 1,
  },
  aiPoweredLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#D97706',
    marginTop: 1,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  suggestionsLoadingWrap: {
    alignItems: 'center' as const,
    paddingVertical: 24,
    gap: 8,
  },
  suggestionsLoadingText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
  },
  suggestionsErrorWrap: {
    alignItems: 'center' as const,
    paddingVertical: 20,
    gap: 4,
  },
  suggestionsRetryText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#D97706',
    marginTop: 4,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B7A45',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    shadowColor: '#1B7A45',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  quickActionIllustration: {
    width: 46,
    height: 46,
    borderRadius: 12,
  },
  quickActionTextWrap: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  quickActionSubtitle: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  emptyIllustration: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  scanEmptyTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  sectionIllustrationBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
});
