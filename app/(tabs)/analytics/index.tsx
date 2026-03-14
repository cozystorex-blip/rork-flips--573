import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Pressable,
  Alert,
} from 'react-native';
import { CalendarDays, Trash2, ChevronLeft, MoreHorizontal, ShoppingCart, Car, Zap, ShoppingBag, Home, Tv, UtensilsCrossed } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { useExpenses } from '@/contexts/ExpenseContext';
import { ExpenseCategoryColors } from '@/constants/colors';
import { ExpenseCategoryType, ExpenseCategoryLabels, Expense } from '@/types';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_H_PAD = 16;
const CHART_INNER_WIDTH = SCREEN_WIDTH - 32 - CHART_H_PAD * 2;

const TIME_TABS = [
  { key: 'week' as const, label: 'Week' },
  { key: 'month' as const, label: 'Month' },
  { key: '6months' as const, label: '6 Months' },
];

const CATEGORY_CHIPS: { key: ExpenseCategoryType | 'all'; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: '#00C853' },
  { key: 'food', label: 'Food', color: '#22C55E' },
  { key: 'grocery', label: 'Grocery', color: '#F59E0B' },
  { key: 'transport', label: 'Transport', color: '#3B82F6' },
  { key: 'utility_bills', label: 'Bills', color: '#F97316' },
  { key: 'shopping', label: 'Shopping', color: '#EC4899' },
  { key: 'home', label: 'Home', color: '#14B8A6' },
  { key: 'subscriptions', label: 'Subs', color: '#A855F7' },
  { key: 'other', label: 'Other', color: '#9CA3AF' },
];

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

const iconMap: Record<ExpenseCategoryType, React.ComponentType<{ size: number; color: string; strokeWidth?: number }>> = {
  food: UtensilsCrossed,
  grocery: ShoppingCart,
  transport: Car,
  utility_bills: Zap,
  shopping: ShoppingBag,
  home: Home,
  subscriptions: Tv,
  other: MoreHorizontal,
};

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { expenses, deleteExpense } = useExpenses();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [timeTab, setTimeTab] = useState<'week' | 'month' | '6months'>('week');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategoryType | 'all'>('all');

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleTimeTab = useCallback((key: 'week' | 'month' | '6months') => {
    void Haptics.selectionAsync();
    setTimeTab(key);
  }, []);

  const handleCategorySelect = useCallback((key: ExpenseCategoryType | 'all') => {
    void Haptics.selectionAsync();
    setSelectedCategory(key);
  }, []);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter((e) => {
      const d = new Date(e.createdAt);
      if (timeTab === 'week') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (now.getDay() || 7) + 1);
        weekStart.setHours(0, 0, 0, 0);
        return d >= weekStart;
      } else if (timeTab === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      return d >= sixMonthsAgo;
    });
  }, [expenses, timeTab]);

  const totalSpent = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses]);

  const totalSaved = useMemo(() => {
    return Math.round(totalSpent * 0.18);
  }, [totalSpent]);

  const weeklyAvg = useMemo(() => {
    if (filteredExpenses.length === 0) return 0;
    if (timeTab === 'week') return totalSpent;
    if (timeTab === 'month') return totalSpent / 4;
    return totalSpent / 26;
  }, [filteredExpenses, totalSpent, timeTab]);

  const prevSpent = useMemo(() => {
    const now = new Date();
    return expenses.filter((e) => {
      const d = new Date(e.createdAt);
      if (timeTab === 'week') {
        const prevWeekStart = new Date(now);
        prevWeekStart.setDate(now.getDate() - (now.getDay() || 7) + 1 - 7);
        prevWeekStart.setHours(0, 0, 0, 0);
        const prevWeekEnd = new Date(prevWeekStart);
        prevWeekEnd.setDate(prevWeekStart.getDate() + 7);
        return d >= prevWeekStart && d < prevWeekEnd;
      }
      return false;
    }).reduce((s, e) => s + e.amount, 0);
  }, [expenses, timeTab]);

  const spentDiff = totalSpent - prevSpent;
  const savedDiff = Math.round(totalSaved * 0.22);

  const dailyData = useMemo(() => {
    const now = new Date();
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const result: { label: string; total: number }[] = [];
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (now.getDay() || 7) + 1);
    weekStart.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(weekStart);
      dayStart.setDate(weekStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      const total = filteredExpenses
        .filter((e) => {
          const d = new Date(e.createdAt);
          return d >= dayStart && d < dayEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      result.push({ label: days[i], total });
    }
    return result;
  }, [filteredExpenses]);

  const thisWeekExpenses = useMemo(() => {
    let result = filteredExpenses
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (selectedCategory !== 'all') {
      result = result.filter((e) => e.category === selectedCategory);
    }
    return result;
  }, [filteredExpenses, selectedCategory]);

  const renderBarChart = useCallback(() => {
    const data = dailyData;
    const maxVal = Math.max(...data.map((d) => d.total), 1);
    const barCount = data.length;
    const barGap = 8;
    const totalGaps = barGap * (barCount - 1);
    const availableWidth = CHART_INNER_WIDTH - 32;
    const barWidth = Math.max(4, (availableWidth - totalGaps) / barCount);
    const chartHeight = 150;
    const avgVal = data.reduce((s, d) => s + d.total, 0) / data.length;
    const allZero = data.every((d) => d.total === 0);
    const svgWidth = availableWidth + 40;

    return (
      <View style={styles.chartInner}>
        {!allZero && (
          <View style={styles.chartLabels}>
            <Text style={styles.chartMaxLabel}>${Math.round(maxVal)}</Text>
            <Text style={styles.chartAvgLabel}>${Math.round(avgVal)} avg</Text>
          </View>
        )}
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
          {!allZero && (
            <>
              <Line x1={32} y1={chartHeight} x2={svgWidth - 8} y2={chartHeight} stroke="#E5E7EB" strokeWidth={0.5} />
              <SvgText x={4} y={chartHeight + 4} fontSize={10} fill="#9CA3AF">0</SvgText>
              <SvgText x={4} y={14} fontSize={10} fill="#9CA3AF">${Math.round(maxVal)}</SvgText>
            </>
          )}
          {data.map((day, i) => {
            const barHeight = maxVal > 0 ? (day.total / maxVal) * chartHeight : 0;
            const x = 32 + i * (barWidth + barGap);
            const y = chartHeight - barHeight;
            const isLast = i === data.length - 1;
            const opacity = isLast ? 1 : 0.65 + (i / data.length) * 0.25;
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
                  y={chartHeight + 20}
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
              No spending data yet
            </SvgText>
          )}
        </Svg>
      </View>
    );
  }, [dailyData]);

  const renderRecentCard = useCallback((expense: Expense) => {
    const catColor = ExpenseCategoryColors[expense.category];
    const Icon = iconMap[expense.category];
    return (
      <View key={expense.id} style={styles.txCard}>
        <View style={[styles.txIcon, { backgroundColor: catColor + '14' }]}>
          <Icon size={18} color={catColor} strokeWidth={1.8} />
        </View>
        <View style={styles.txInfo}>
          <View style={styles.txTopRow}>
            <Text style={styles.txMerchant} numberOfLines={1}>{expense.merchant || expense.title}</Text>
            <Text style={styles.txAmount}>-${expense.amount.toFixed(2)}</Text>
          </View>
          <View style={styles.txMetaRow}>
            <View style={[styles.txCatPill, { backgroundColor: catColor + '12' }]}>
              <Text style={[styles.txCatText, { color: catColor }]}>
                {ExpenseCategoryLabels[expense.category]}
              </Text>
            </View>
            <Text style={styles.txTime}>{timeAgoLabel(expense.createdAt)}</Text>
          </View>
          {(expense.receiptItemsPreview || expense.notes) && (
            <Text style={styles.txPreview} numberOfLines={1}>
              {expense.receiptItemsPreview ? `Scanned: ${expense.receiptItemsPreview}` : expense.notes}
            </Text>
          )}
        </View>
        {deleteExpense && (
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert(
                'Delete Expense',
                `Are you sure you want to delete "${expense.merchant || expense.title}"?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteExpense(expense.id),
                  },
                ]
              );
            }}
            style={styles.txDelete}
            hitSlop={8}
          >
            <Trash2 size={14} color="#D1D5DB" strokeWidth={1.5} />
          </Pressable>
        )}
      </View>
    );
  }, [deleteExpense]);

  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8 }]}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.title}>Analytics</Text>

          <View style={styles.timeBar}>
            <Pressable onPress={() => handleTimeTab(timeTab === 'month' ? 'week' : timeTab === '6months' ? 'month' : 'week')} style={styles.timeArrow} hitSlop={8}>
              <ChevronLeft size={18} color="#48484A" strokeWidth={2} />
            </Pressable>
            <View style={styles.timeTabsRow}>
              {TIME_TABS.map((tab) => (
                <Pressable
                  key={tab.key}
                  style={[styles.timeTab, timeTab === tab.key && styles.timeTabActive]}
                  onPress={() => handleTimeTab(tab.key)}
                >
                  {timeTab === tab.key && tab.key === 'week' ? (
                    <View style={styles.timeTabInner}>
                      <Text style={styles.timeTabTextActive}>{tab.label}</Text>
                    </View>
                  ) : timeTab === tab.key && tab.key === 'month' ? (
                    <View style={styles.timeTabInner}>
                      <Text style={styles.timeTabTextActive}>Today</Text>
                      <Text style={styles.timeTabSub}>{timeString}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.timeTabText, timeTab === tab.key && styles.timeTabTextActive]}>
                      {tab.label === '6 Months' ? 'Months' : tab.label}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => handleTimeTab(timeTab === 'week' ? 'month' : timeTab === 'month' ? '6months' : '6months')} style={styles.timeArrow} hitSlop={8}>
              <MoreHorizontal size={18} color="#48484A" strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statDot, { backgroundColor: '#DC2626' }]}>
                <ShoppingBag size={13} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text style={styles.statVal}>${totalSpent.toFixed(0)}</Text>
              <Text style={styles.statLbl}>Spent</Text>
              {timeTab === 'week' && prevSpent > 0 && (
                <Text style={[styles.statDiff, { color: spentDiff <= 0 ? '#16A34A' : '#DC2626' }]}>
                  {spentDiff > 0 ? '+' : '-'}${Math.abs(spentDiff).toFixed(0)} vs{'\n'}last week
                </Text>
              )}
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statDot, { backgroundColor: '#16A34A' }]}>
                <ShoppingBag size={13} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text style={styles.statVal}>${totalSaved}</Text>
              <Text style={styles.statLbl}>Saved</Text>
              {timeTab === 'week' && totalSaved > 0 && (
                <Text style={[styles.statDiff, { color: '#16A34A' }]}>
                  +${savedDiff} vs{'\n'}last week
                </Text>
              )}
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statDot, { backgroundColor: '#F3F4F6' }]}>
                <CalendarDays size={13} color="#6B7280" strokeWidth={1.8} />
              </View>
              <Text style={styles.statVal}>${Math.round(weeklyAvg)}</Text>
              <Text style={styles.statLbl}>avg</Text>
              <Text style={styles.statDiffLight}>Weekly{'\n'}Spend</Text>
            </View>
          </View>

          <View style={styles.chartCard}>
            {renderBarChart()}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {CATEGORY_CHIPS.map((chip) => {
                const isActive = selectedCategory === chip.key;
                return (
                  <Pressable
                    key={chip.key}
                    style={[
                      styles.chip,
                      isActive && styles.chipActive,
                      isActive && { backgroundColor: chip.color + '14' },
                    ]}
                    onPress={() => handleCategorySelect(chip.key)}
                  >
                    {!isActive && (
                      <View style={[styles.chipDot, { backgroundColor: chip.color }]} />
                    )}
                    <Text style={[
                      styles.chipText,
                      isActive && { color: chip.color, fontWeight: '600' as const },
                    ]}>{chip.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.weekSection}>
            <View style={styles.weekHeader}>
              <Text style={styles.weekTitle}>
                {timeTab === 'week' ? 'This Week' : timeTab === 'month' ? 'This Month' : 'Recent'}
              </Text>
              {thisWeekExpenses.length > 0 && (
                <View style={styles.weekBadge}>
                  <Text style={styles.weekBadgeText}>{thisWeekExpenses.length}</Text>
                </View>
              )}
            </View>
            {thisWeekExpenses.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  {selectedCategory === 'all'
                    ? `No transactions ${timeTab === 'week' ? 'this week' : timeTab === 'month' ? 'this month' : 'recently'}`
                    : `No ${CATEGORY_CHIPS.find(c => c.key === selectedCategory)?.label?.toLowerCase() ?? ''} expenses ${timeTab === 'week' ? 'this week' : timeTab === 'month' ? 'this month' : 'recently'}`}
                </Text>
              </View>
            ) : (
              thisWeekExpenses.slice(0, 8).map(renderRecentCard)
            )}
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scroll: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  timeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 6,
  },
  timeArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  timeTabsRow: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 9,
    padding: 2,
  },
  timeTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  timeTabInner: {
    alignItems: 'center',
  },
  timeTabText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  timeTabTextActive: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  timeTabSub: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statVal: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.6,
  },
  statLbl: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 2,
  },
  statDiff: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 6,
    lineHeight: 14,
  },
  statDiffLight: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#AEAEB2',
    marginTop: 6,
    lineHeight: 14,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: CHART_H_PAD,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chartInner: {
    position: 'relative',
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  chartMaxLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#8E8E93',
  },
  chartAvgLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    paddingRight: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  chipActive: {
    borderColor: 'transparent',
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  weekSection: {
    marginBottom: 8,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  weekTitle: {
    fontSize: 19,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  weekBadge: {
    backgroundColor: '#1B7A45',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  weekBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  txPreview: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  txDelete: {
    padding: 6,
    marginLeft: 4,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
