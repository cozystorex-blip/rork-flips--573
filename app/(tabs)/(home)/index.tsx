import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
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
  Dimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { ScanLine, ChevronRight, Package, RefreshCw, Wallet, Calendar, TrendingDown, Search, DollarSign, UtensilsCrossed, ShoppingCart, Car, Zap, ShoppingBag, Home, Tv, MoreHorizontal } from 'lucide-react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { AppIllustrations } from '@/constants/illustrations';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExpenseCategoryLabels } from '@/types/expense';
import type { ExpenseCategoryType } from '@/types/expense';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { useExpenses } from '@/contexts/ExpenseContext';
import { useScanHistory, ScanHistoryEntry } from '@/contexts/ScanHistoryContext';
import { generateAISuggestions, AISuggestion } from '@/services/aiSuggestionsService';

import * as Haptics from 'expo-haptics';
import AdMobBanner from '@/components/ads/AdMobBanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUDGET_CHART_WIDTH = SCREEN_WIDTH - 64 - 32;

const BUDGET_TIME_TABS = [
  { key: 'week' as const, label: 'Week' },
  { key: 'month' as const, label: 'Month' },
  { key: 'all' as const, label: 'All' },
];

const BUDGET_CATEGORY_CHIPS: { key: ExpenseCategoryType; label: string; color: string }[] = [
  { key: 'food', label: 'Food', color: '#22C55E' },
  { key: 'grocery', label: 'Grocery', color: '#F59E0B' },
  { key: 'transport', label: 'Transport', color: '#3B82F6' },
  { key: 'utility_bills', label: 'Utility Bills', color: '#F97316' },
  { key: 'shopping', label: 'Shopping', color: '#EC4899' },
  { key: 'home', label: 'Home', color: '#14B8A6' },
  { key: 'subscriptions', label: 'Subs', color: '#A855F7' },
  { key: 'other', label: 'Other', color: '#9CA3AF' },
];

const CATEGORY_COLORS: Record<string, string> = {
  food: '#22C55E',
  grocery: '#F59E0B',
  transport: '#3B82F6',
  utility_bills: '#F97316',
  shopping: '#EC4899',
  home: '#14B8A6',
  subscriptions: '#A855F7',
  other: '#9CA3AF',
};

const budgetIconMap: Record<ExpenseCategoryType, React.ComponentType<{ size: number; color: string; strokeWidth?: number }>> = {
  food: UtensilsCrossed,
  grocery: ShoppingCart,
  transport: Car,
  utility_bills: Zap,
  shopping: ShoppingBag,
  home: Home,
  subscriptions: Tv,
  other: MoreHorizontal,
};

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function timeAgoLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function buildSuggestionKey(scans: ScanHistoryEntry[], receipts: { id: string; category: string }[]): string {
  const scanPart = scans.slice(0, 5).map(s => `${s.id}-${s.result.item_type}`).join('|');
  const receiptPart = receipts.slice(0, 5).map(r => `${r.id}-${r.category}`).join('|');
  return `${scanPart}::${receiptPart}`;
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
  const [budgetTimeTab, setBudgetTimeTab] = useState<'week' | 'month' | 'all'>('week');
  const [budgetCategoryFilter, setBudgetCategoryFilter] = useState<ExpenseCategoryType | null>(null);

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


  const budgetFilteredExpenses = useMemo(() => {
    const weekStart = getWeekStart();
    const monthStart = getMonthStart();
    let filtered = expenses.filter((e) => e.amount > 0);
    if (budgetTimeTab === 'week') {
      filtered = filtered.filter((e) => new Date(e.createdAt) >= weekStart);
    } else if (budgetTimeTab === 'month') {
      filtered = filtered.filter((e) => new Date(e.createdAt) >= monthStart);
    }
    return filtered;
  }, [expenses, budgetTimeTab]);

  const budgetTotal = useMemo(() => budgetFilteredExpenses.reduce((s, e) => s + e.amount, 0), [budgetFilteredExpenses]);
  const budgetAvg = useMemo(() => {
    if (budgetFilteredExpenses.length === 0) return 0;
    return budgetTotal / Math.max(budgetFilteredExpenses.length, 1);
  }, [budgetFilteredExpenses, budgetTotal]);

  const budgetDailyData = useMemo(() => {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const weekStart = getWeekStart();
    const result: { label: string; total: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(weekStart);
      dayStart.setDate(weekStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      const total = budgetFilteredExpenses
        .filter((e) => {
          const d = new Date(e.createdAt);
          return d >= dayStart && d < dayEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      result.push({ label: days[i], total });
    }
    return result;
  }, [budgetFilteredExpenses]);

  const budgetDisplayExpenses = useMemo(() => {
    let result = budgetFilteredExpenses
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (budgetCategoryFilter) {
      result = result.filter((e) => e.category === budgetCategoryFilter);
    }
    return result;
  }, [budgetFilteredExpenses, budgetCategoryFilter]);

  const handleBudgetTimeTab = useCallback((key: 'week' | 'month' | 'all') => {
    void Haptics.selectionAsync();
    setBudgetTimeTab(key);
  }, []);

  const handleBudgetCategory = useCallback((key: ExpenseCategoryType) => {
    void Haptics.selectionAsync();
    setBudgetCategoryFilter((prev) => prev === key ? null : key);
  }, []);

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

          {/* Budget Overview */}
          <View style={budgetStyles.budgetCard} testID="budget-overview-card">
            <View style={budgetStyles.budgetHeaderRow}>
              <View style={budgetStyles.budgetIconWrap}>
                <Wallet size={16} color="#1B7A45" strokeWidth={2} />
              </View>
              <Text style={budgetStyles.budgetPeriodLabel}>
                {budgetTimeTab === 'week' ? 'THIS WEEK' : budgetTimeTab === 'month' ? 'THIS MONTH' : 'ALL TIME'}
              </Text>
              <View style={budgetStyles.budgetMetaRight}>
                <View style={budgetStyles.budgetMetaRow}>
                  <Calendar size={11} color="#8E8E93" strokeWidth={1.5} />
                  <Text style={budgetStyles.budgetMetaText}>{budgetFilteredExpenses.length} items</Text>
                </View>
                <View style={budgetStyles.budgetMetaRow}>
                  <TrendingDown size={11} color="#8E8E93" strokeWidth={1.5} />
                  <Text style={budgetStyles.budgetMetaText}>${budgetAvg.toFixed(2)} avg</Text>
                </View>
              </View>
            </View>
            <Text style={budgetStyles.budgetTotal}>${budgetTotal.toFixed(2)}</Text>

            <View style={budgetStyles.timeTabsRow}>
              {BUDGET_TIME_TABS.map((tab) => (
                <Pressable
                  key={tab.key}
                  style={[budgetStyles.timeTab, budgetTimeTab === tab.key && budgetStyles.timeTabActive]}
                  onPress={() => handleBudgetTimeTab(tab.key)}
                >
                  <Text style={[budgetStyles.timeTabText, budgetTimeTab === tab.key && budgetStyles.timeTabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {budgetTimeTab === 'week' && (
            <View style={budgetStyles.chartCard}>
              {(() => {
                const data = budgetDailyData;
                const maxVal = Math.max(...data.map((d) => d.total), 1);
                const barCount = data.length;
                const barGap = 8;
                const totalGaps = barGap * (barCount - 1);
                const availW = BUDGET_CHART_WIDTH - 32;
                const barWidth = Math.max(4, (availW - totalGaps) / barCount);
                const chartHeight = 120;
                const avgVal = data.reduce((s, d) => s + d.total, 0) / data.length;
                const allZero = data.every((d) => d.total === 0);
                const svgWidth = availW + 40;

                return (
                  <Svg width={svgWidth} height={chartHeight + 30} style={{ alignSelf: 'center' }}>
                    {!allZero && (
                      <Line
                        x1={32}
                        y1={chartHeight * (1 - avgVal / maxVal)}
                        x2={svgWidth - 8}
                        y2={chartHeight * (1 - avgVal / maxVal)}
                        stroke="#D1D5DB"
                        strokeWidth={1}
                        strokeDasharray="3,3"
                      />
                    )}
                    {data.map((day, i) => {
                      const barHeight = maxVal > 0 ? (day.total / maxVal) * chartHeight : 0;
                      const x = 32 + i * (barWidth + barGap);
                      const y = chartHeight - barHeight;
                      const isLast = i === data.length - 1;
                      const opacity = isLast ? 1 : 0.55 + (i / data.length) * 0.35;
                      return (
                        <React.Fragment key={day.label + i}>
                          <Rect
                            x={x}
                            y={Math.max(y, 2)}
                            width={barWidth}
                            height={Math.max(barHeight, 4)}
                            rx={5}
                            fill={isLast ? '#1B5E3B' : '#3D9B63'}
                            opacity={opacity}
                          />
                          <SvgText
                            x={x + barWidth / 2}
                            y={chartHeight + 18}
                            fontSize={11}
                            fill="#8E8E93"
                            textAnchor="middle"
                            fontWeight="500"
                          >
                            {day.label}
                          </SvgText>
                        </React.Fragment>
                      );
                    })}
                    {allZero && (
                      <SvgText
                        x={svgWidth / 2}
                        y={chartHeight / 2}
                        fontSize={13}
                        fill="#C7C7CC"
                        textAnchor="middle"
                      >
                        No data yet
                      </SvgText>
                    )}
                  </Svg>
                );
              })()}
            </View>
          )}

          {/* Scans row */}
          <Pressable style={budgetStyles.noScansRow} onPress={handleScanPress} testID="no-scans-row">
            <View style={budgetStyles.noScansIcon}>
              <ScanLine size={18} color="#1B7A45" strokeWidth={2} />
            </View>
            <View style={budgetStyles.noScansTextWrap}>
              <Text style={budgetStyles.noScansTitle}>
                {recentScans.length === 0 ? 'No scans yet' : `${recentScans.length} scan${recentScans.length !== 1 ? 's' : ''}`}
              </Text>
              <Text style={budgetStyles.noScansSubtext}>
                {recentScans.length === 0 ? 'Scan an item to see it here' : 'Tap to scan another item'}
              </Text>
            </View>
            <ChevronRight size={16} color="#C7C7CC" strokeWidth={2} />
          </Pressable>

          {/* Search & Category Filters */}
          <View style={budgetStyles.searchRow}>
            <View style={budgetStyles.searchBox}>
              <Search size={15} color="#8E8E93" strokeWidth={1.5} />
              <Text style={budgetStyles.searchPlaceholder}>Search items...</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={budgetStyles.chipRow}
          >
            {BUDGET_CATEGORY_CHIPS.map((chip) => {
              const isActive = budgetCategoryFilter === chip.key;
              return (
                <Pressable
                  key={chip.key}
                  style={[
                    budgetStyles.chip,
                    isActive && { backgroundColor: chip.color + '18' },
                  ]}
                  onPress={() => handleBudgetCategory(chip.key)}
                >
                  <View style={[budgetStyles.chipDot, { backgroundColor: chip.color }]} />
                  <Text style={[
                    budgetStyles.chipText,
                    isActive && { color: chip.color, fontWeight: '600' as const },
                  ]}>{chip.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={budgetStyles.sectionLabel}>
            {budgetTimeTab === 'week' ? 'This Week' : budgetTimeTab === 'month' ? 'This Month' : 'All Time'}
          </Text>

          {budgetDisplayExpenses.length === 0 ? (
            <View style={budgetStyles.emptyCard}>
              <DollarSign size={28} color="#C7C7CC" strokeWidth={1.5} />
              <Text style={budgetStyles.emptyTitle}>No items yet</Text>
              <Text style={budgetStyles.emptySubtext}>Scan an item or log a find to start building your list</Text>
            </View>
          ) : (
            budgetDisplayExpenses.slice(0, 10).map((exp) => {
              const cColor = CATEGORY_COLORS[exp.category] ?? '#9CA3AF';
              const Icon = budgetIconMap[exp.category] ?? MoreHorizontal;
              const cLabel = ExpenseCategoryLabels[exp.category as ExpenseCategoryType] ?? 'Other';
              return (
                <Pressable
                  key={exp.id}
                  style={({ pressed }) => [
                    budgetStyles.txCard,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    router.push({ pathname: '/receipt-detail', params: { expenseId: exp.id } });
                  }}
                >
                  <View style={[budgetStyles.txIcon, { backgroundColor: cColor + '14' }]}>
                    <Icon size={18} color={cColor} strokeWidth={1.8} />
                  </View>
                  <View style={budgetStyles.txInfo}>
                    <View style={budgetStyles.txTopRow}>
                      <Text style={budgetStyles.txMerchant} numberOfLines={1}>{exp.merchant || exp.title}</Text>
                      <Text style={budgetStyles.txAmount}>-${exp.amount.toFixed(2)}</Text>
                    </View>
                    <View style={budgetStyles.txMetaRow}>
                      <View style={[budgetStyles.txCatPill, { backgroundColor: cColor + '12' }]}>
                        <Text style={[budgetStyles.txCatText, { color: cColor }]}>{cLabel}</Text>
                      </View>
                      <Text style={budgetStyles.txTime}>{timeAgoLabel(exp.createdAt)}</Text>
                    </View>
                  </View>
                  <ChevronRight size={14} color="#C7C7CC" strokeWidth={2} />
                </Pressable>
              );
            })
          )}

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

          <AdMobBanner />

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

const budgetStyles = StyleSheet.create({
  budgetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  budgetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#E8F5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  budgetPeriodLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#8E8E93',
    letterSpacing: 0.5,
    flex: 1,
  },
  budgetMetaRight: {
    alignItems: 'flex-end' as const,
    gap: 3,
  },
  budgetMetaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  budgetMetaText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  budgetTotal: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -1,
    marginBottom: 14,
  },
  timeTabsRow: {
    flexDirection: 'row' as const,
    backgroundColor: '#F2F2F7',
    borderRadius: 9,
    padding: 2,
  },
  timeTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 7,
    alignItems: 'center' as const,
  },
  timeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  timeTabText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  timeTabTextActive: {
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  noScansRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  noScansIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8F5EE',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  noScansTextWrap: {
    flex: 1,
  },
  noScansTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  noScansSubtext: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 1,
  },
  searchRow: {
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchPlaceholder: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#C7C7CC',
  },
  chipRow: {
    flexDirection: 'row' as const,
    gap: 6,
    marginBottom: 14,
    paddingRight: 4,
  },
  chip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  chipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 36,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#8E8E93',
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#AEAEB2',
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 10,
  },
  txInfo: {
    flex: 1,
  },
  txTopRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  txMerchant: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    flex: 1,
    marginRight: 8,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  txMetaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  txCatPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txCatText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  txTime: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '400' as const,
  },
});
