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
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ScanLine,
  ChevronRight,
  Package,
  UtensilsCrossed,
  ShoppingCart,
  Car,
  Zap,
  ShoppingBag,
  Home,
  Tv,
  MoreHorizontal,
  SlidersHorizontal,
} from 'lucide-react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useRouter } from 'expo-router';
import type { ExpenseCategoryType } from '@/types/expense';
import { ExpenseCategoryLabels } from '@/types/expense';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { useExpenses } from '@/contexts/ExpenseContext';
import { useScanHistory, ScanHistoryEntry } from '@/contexts/ScanHistoryContext';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BUDGET_TIME_TABS = [
  { key: 'week' as const, label: 'Week' },
  { key: 'month' as const, label: 'Month' },
  { key: 'all' as const, label: 'All' },
];

const CATEGORY_CHIPS: { key: ExpenseCategoryType; label: string; color: string; icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }> }[] = [
  { key: 'food', label: 'Food', color: '#22C55E', icon: UtensilsCrossed },
  { key: 'grocery', label: 'Grocery', color: '#F59E0B', icon: ShoppingCart },
  { key: 'transport', label: 'Transport', color: '#3B82F6', icon: Car },
  { key: 'utility_bills', label: 'Utility Bills', color: '#F97316', icon: Zap },
  { key: 'shopping', label: 'Shopping', color: '#EC4899', icon: ShoppingBag },
  { key: 'home', label: 'Home', color: '#14B8A6', icon: Home },
  { key: 'subscriptions', label: 'Subscriptions', color: '#A855F7', icon: Tv },
  { key: 'other', label: 'Other', color: '#9CA3AF', icon: MoreHorizontal },
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

function getScanBrand(entry: ScanHistoryEntry): string {
  const r = entry.result;
  if (r.grocery_details?.brand) return r.grocery_details.brand;
  if (r.household_details?.brand) return r.household_details.brand;
  if (r.fashion_details?.brand) return r.fashion_details.brand;
  if (r.electronics_details?.brand) return r.electronics_details.brand;
  return r.category || 'Item';
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { expenses } = useExpenses();
  const { entries: scanEntries } = useScanHistory();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const [budgetTimeTab, setBudgetTimeTab] = useState<'week' | 'month' | 'all'>('week');

  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategoryType | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

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

  const thisWeekItems = useMemo(() => {
    let items = budgetFilteredExpenses
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (selectedCategory) {
      items = items.filter((e) => e.category === selectedCategory);
    }
    return items;
  }, [budgetFilteredExpenses, selectedCategory]);

  const recentScans = useMemo(() => scanEntries.slice(0, 8), [scanEntries]);

  const handleBudgetTimeTab = useCallback((key: 'week' | 'month' | 'all') => {
    void Haptics.selectionAsync();
    setBudgetTimeTab(key);
  }, []);

  const handleScanPress = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/smart-scan');
  }, [router]);

  const handleScanCardPress = useCallback((entry: ScanHistoryEntry) => {
    void Haptics.selectionAsync();
    router.push({
      pathname: '/smart-scan',
      params: { historyEntryId: entry.id },
    });
  }, [router]);

  const handleCategoryPress = useCallback((key: ExpenseCategoryType) => {
    void Haptics.selectionAsync();
    setSelectedCategory((prev) => (prev === key ? null : key));
  }, []);

  const periodLabel = budgetTimeTab === 'week' ? 'THIS WEEK' : budgetTimeTab === 'month' ? 'THIS MONTH' : 'ALL TIME';
  const sectionTitle = budgetTimeTab === 'week' ? 'This Week' : budgetTimeTab === 'month' ? 'This Month' : 'All Items';

  const CHART_WIDTH = SCREEN_WIDTH - 32 - 40;

  return (
    <View style={styles.container}>
      <View style={[styles.headerArea, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.brandTitle}>Flips</Text>
          <View style={styles.headerRight}>
            <View style={styles.headerTimeTabs}>
              {BUDGET_TIME_TABS.map((tab) => (
                <Pressable
                  key={tab.key}
                  style={[styles.headerTab, budgetTimeTab === tab.key && styles.headerTabActive]}
                  onPress={() => handleBudgetTimeTab(tab.key)}
                >
                  <Text style={[styles.headerTabText, budgetTimeTab === tab.key && styles.headerTabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [styles.filterBtn, pressed && { opacity: 0.6 }]}
              onPress={() => void Haptics.selectionAsync()}
            >
              <SlidersHorizontal size={18} color="#8E8E93" strokeWidth={1.8} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Weekly Summary Card */}
          <View style={styles.summaryCard} testID="budget-overview-card">
            <View style={styles.summaryTopRow}>
              <View style={styles.summaryLeft}>
                <Text style={styles.summaryPeriodLabel}>{periodLabel}</Text>
                <Text style={styles.summaryTotal}>${budgetTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRight}>
                <View style={styles.summaryMetaItem}>
                  <Text style={styles.summaryMetaValue}>{budgetFilteredExpenses.length}</Text>
                  <Text style={styles.summaryMetaLabel}>items</Text>
                </View>
                <View style={styles.summaryMetaDivider} />
                <View style={styles.summaryMetaItem}>
                  <Text style={styles.summaryMetaValue}>${budgetAvg.toFixed(2)}</Text>
                  <Text style={styles.summaryMetaLabel}>avg</Text>
                </View>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            {/* Chart Area */}
            <View style={styles.chartArea}>
              {(() => {
                const data = budgetDailyData;
                const maxVal = Math.max(...data.map((d) => d.total), 1);
                const allZero = data.every((d) => d.total === 0);
                const barCount = data.length;
                const barGap = 10;
                const totalGaps = barGap * (barCount - 1);
                const barWidth = Math.max(8, (CHART_WIDTH - totalGaps) / barCount);
                const chartHeight = 100;
                const svgWidth = CHART_WIDTH + 16;

                if (budgetTimeTab !== 'week') {
                  return (
                    <View style={styles.chartEmptyWrap}>
                      <Text style={styles.chartEmptyText}>
                        {budgetFilteredExpenses.length === 0 ? 'No data yet' : `${budgetFilteredExpenses.length} items tracked`}
                      </Text>
                    </View>
                  );
                }

                return (
                  <Svg width={svgWidth} height={chartHeight + 28} style={{ alignSelf: 'center' }}>
                    {data.map((day, i) => {
                      const barHeight = maxVal > 0 ? (day.total / maxVal) * chartHeight : 0;
                      const x = 8 + i * (barWidth + barGap);
                      const y = chartHeight - barHeight;
                      const isToday = i === new Date().getDay() - 1 || (new Date().getDay() === 0 && i === 6);
                      return (
                        <React.Fragment key={day.label + i}>
                          <Rect
                            x={x}
                            y={allZero ? chartHeight - 4 : Math.max(y, 2)}
                            width={barWidth}
                            height={allZero ? 4 : Math.max(barHeight, 4)}
                            rx={barWidth / 2}
                            fill={isToday ? '#1B7A45' : allZero ? '#E8E8ED' : '#A8DDB8'}
                            opacity={allZero ? 0.6 : isToday ? 1 : 0.7}
                          />
                          <SvgText
                            x={x + barWidth / 2}
                            y={chartHeight + 18}
                            fontSize={11}
                            fill={isToday ? '#1B7A45' : '#AEAEB2'}
                            textAnchor="middle"
                            fontWeight={isToday ? '600' : '400'}
                          >
                            {day.label}
                          </SvgText>
                        </React.Fragment>
                      );
                    })}
                    {allZero && (
                      <SvgText
                        x={svgWidth / 2}
                        y={chartHeight / 2 - 4}
                        fontSize={13}
                        fill="#C7C7CC"
                        textAnchor="middle"
                        fontWeight="500"
                      >
                        No data yet
                      </SvgText>
                    )}
                  </Svg>
                );
              })()}
            </View>
          </View>

          {/* Scan Preview Card */}
          <Pressable
            style={({ pressed }) => [
              styles.scanPreviewCard,
              pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
            ]}
            onPress={recentScans.length > 0 ? () => handleScanCardPress(recentScans[0]) : handleScanPress}
            testID="scan-preview-card"
          >
            <View style={styles.scanPreviewIcon}>
              <ScanLine size={20} color="#1B7A45" strokeWidth={2.2} />
            </View>
            <View style={styles.scanPreviewTextWrap}>
              <Text style={styles.scanPreviewTitle}>
                {recentScans.length > 0 ? getScanBrand(recentScans[0]) : 'No scans yet'}
              </Text>
              <Text style={styles.scanPreviewSubtitle}>
                {recentScans.length > 0
                  ? (recentScans[0].result.item_name || 'Tap to view scan')
                  : 'Scan an item to see it here'}
              </Text>
            </View>
            <ChevronRight size={18} color="#C7C7CC" strokeWidth={2} />
          </Pressable>


          {/* Category Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsScroll}
          >
            {CATEGORY_CHIPS.map((chip) => {
              const isActive = selectedCategory === chip.key;
              return (
                <Pressable
                  key={chip.key}
                  style={[styles.chip, isActive && { backgroundColor: chip.color + '18', borderColor: chip.color + '40' }]}
                  onPress={() => handleCategoryPress(chip.key)}
                >
                  <View style={[styles.chipDot, { backgroundColor: chip.color }]} />
                  <Text style={[styles.chipText, isActive && { color: chip.color, fontWeight: '600' as const }]}>
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* This Week Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{sectionTitle}</Text>
            {thisWeekItems.length > 0 && (
              <Text style={styles.sectionCount}>
                {thisWeekItems.length} {thisWeekItems.length === 1 ? 'item' : 'items'}
              </Text>
            )}
          </View>

          {thisWeekItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Package size={32} color="#C7C7CC" strokeWidth={1.3} />
              </View>
              <Text style={styles.emptyTitle}>No items yet</Text>
              <Text style={styles.emptySubtext}>
                Scan an item or log a find to start building your list
              </Text>
            </View>
          ) : (
            thisWeekItems.slice(0, 10).map((exp) => {
              const cColor = CATEGORY_COLORS[exp.category] ?? '#9CA3AF';
              const Icon = budgetIconMap[exp.category] ?? MoreHorizontal;
              const cLabel = ExpenseCategoryLabels[exp.category as ExpenseCategoryType] ?? 'Other';
              return (
                <Pressable
                  key={exp.id}
                  style={({ pressed }) => [
                    styles.txCard,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    router.push({ pathname: '/receipt-detail', params: { expenseId: exp.id } });
                  }}
                >
                  <View style={[styles.txIcon, { backgroundColor: cColor + '14' }]}>
                    <Icon size={18} color={cColor} strokeWidth={1.8} />
                  </View>
                  <View style={styles.txInfo}>
                    <View style={styles.txTopRow}>
                      <Text style={styles.txMerchant} numberOfLines={1}>{exp.merchant || exp.title}</Text>
                      <Text style={styles.txAmount}>-${exp.amount.toFixed(2)}</Text>
                    </View>
                    <View style={styles.txMetaRow}>
                      <View style={[styles.txCatPill, { backgroundColor: cColor + '12' }]}>
                        <Text style={[styles.txCatText, { color: cColor }]}>{cLabel}</Text>
                      </View>
                      <Text style={styles.txTime}>{timeAgoLabel(exp.createdAt)}</Text>
                    </View>
                  </View>
                  <ChevronRight size={14} color="#C7C7CC" strokeWidth={2} />
                </Pressable>
              );
            })
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
    backgroundColor: '#F4F5F7',
  },
  headerArea: {
    backgroundColor: '#F4F5F7',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#1B7A45',
    letterSpacing: -0.8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTimeTabs: {
    flexDirection: 'row',
    backgroundColor: '#EAEAEE',
    borderRadius: 9,
    padding: 2,
  },
  headerTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 7,
  },
  headerTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTabText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  headerTabTextActive: {
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  filterBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EAEAEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLeft: {
    flex: 1,
  },
  summaryPeriodLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#AEAEB2',
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryTotal: {
    fontSize: 38,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -1.5,
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  summaryMetaItem: {
    alignItems: 'flex-end',
  },
  summaryMetaValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  summaryMetaLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#AEAEB2',
    marginTop: 1,
  },
  summaryMetaDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E8E8ED',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F0F0F4',
    marginTop: 16,
    marginBottom: 12,
  },
  chartArea: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyWrap: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  chartEmptyText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#C7C7CC',
  },
  scanPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  scanPreviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#E8F5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  scanPreviewTextWrap: {
    flex: 1,
  },
  scanPreviewTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  scanPreviewSubtitle: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#AEAEB2',
    marginTop: 2,
  },

  chipsScroll: {
    marginBottom: 16,
  },
  chipsRow: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 7,
    borderWidth: 1,
    borderColor: '#EAEAEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#636366',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#AEAEB2',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 48,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F4F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#8E8E93',
  },
  emptySubtext: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#AEAEB2',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  txInfo: {
    flex: 1,
  },
  txTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
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
