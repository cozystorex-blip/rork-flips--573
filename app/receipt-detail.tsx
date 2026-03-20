import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ReceiptText,
  ArrowLeft,
  Calendar,
  DollarSign,
  ShoppingCart,
  TrendingDown,
  FileText,
  AlertCircle,
  CheckCircle2,
  PieChart,
  Clock,
  CreditCard,
  Tag,
  Wallet,
  ChevronRight,
  Search,
  UtensilsCrossed,
  Car,
  Zap,
  ShoppingBag,
  Home,
  Tv,
  MoreHorizontal,
} from 'lucide-react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '@/contexts/ExpenseContext';
import { ExpenseCategoryLabels } from '@/types/expense';

import type { Expense, ExpenseCategoryType } from '@/types/expense';

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

interface ParsedReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ParsedReceiptData {
  items: ParsedReceiptItem[];
  subtotal: number | null;
  tax: number | null;
  tip: number | null;
  discount: number | null;
  paymentMethod: string | null;
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function parseFromRawExtraction(rawText: string | undefined): ParsedReceiptData | null {
  if (!rawText) return null;
  try {
    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object') return null;

    const items: ParsedReceiptItem[] = (parsed.items ?? [])
      .filter((i: { name?: string; total_price?: number; totalPrice?: number }) => {
        const name = i?.name ?? '';
        const price = i?.total_price ?? i?.totalPrice ?? 0;
        return name.length > 0 && price > 0;
      })
      .map((i: { name: string; quantity?: number; unit_price?: number; unitPrice?: number; total_price?: number; totalPrice?: number }) => ({
        name: i.name,
        quantity: i.quantity ?? 1,
        unitPrice: i.unit_price ?? i.unitPrice ?? 0,
        totalPrice: i.total_price ?? i.totalPrice ?? 0,
      }));

    return {
      items,
      subtotal: parsed.subtotal ?? null,
      tax: parsed.tax ?? null,
      tip: parsed.tip ?? null,
      discount: parsed.discount_amount ?? parsed.discount ?? null,
      paymentMethod: parsed.payment_method ?? parsed.paymentMethod ?? null,
    };
  } catch (e) {
    console.log('[ReceiptDetail] Failed to parse rawText:', e);
    return null;
  }
}

function parseFromPreview(preview: string | undefined): ParsedReceiptItem[] {
  if (!preview) return [];
  const lines = preview.split('\n').filter(Boolean);
  return lines
    .filter((line) => !line.startsWith('+'))
    .map((line) => {
      const dashMatch = line.match(/^(.+?)\s*[-–—]\s*\$?([\d.]+)$/);
      if (dashMatch) {
        const rawName = dashMatch[1].trim();
        const price = parseFloat(dashMatch[2]);
        const qtyMatch = rawName.match(/^(\d+)x\s+(.+)$/);
        if (qtyMatch) {
          const qty = parseInt(qtyMatch[1], 10);
          return { name: qtyMatch[2], quantity: qty, unitPrice: qty > 0 ? +(price / qty).toFixed(2) : price, totalPrice: price };
        }
        return { name: rawName, quantity: 1, unitPrice: price, totalPrice: price };
      }

      const commaItems = line.split(',').map((s) => s.trim()).filter(Boolean);
      if (commaItems.length > 1) {
        return commaItems.map((part) => {
          const partMatch = part.match(/^(.+?)\s+\$?([\d.]+)$/);
          if (partMatch) {
            const rawName = partMatch[1].trim();
            const price = parseFloat(partMatch[2]);
            const qtyMatch = rawName.match(/^(\d+)x\s+(.+)$/);
            if (qtyMatch) {
              const qty = parseInt(qtyMatch[1], 10);
              return { name: qtyMatch[2], quantity: qty, unitPrice: qty > 0 ? +(price / qty).toFixed(2) : price, totalPrice: price };
            }
            return { name: rawName, quantity: 1, unitPrice: price, totalPrice: price };
          }
          return null;
        }).filter((x): x is ParsedReceiptItem => x !== null);
      }

      const priceMatch = line.match(/\$?([\d.]+)/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
      const name = line.replace(/\$?[\d.]+/, '').replace(/[-–—]/, '').trim() || line;
      return { name, quantity: 1, unitPrice: price, totalPrice: price };
    })
    .flat()
    .filter((item) => item.totalPrice > 0);
}

export default function ReceiptDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ expenseId: string }>();
  const { expenses } = useExpenses();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [budgetTimeTab, setBudgetTimeTab] = useState<'week' | 'month' | 'all'>('week');
  const [budgetCategoryFilter, setBudgetCategoryFilter] = useState<ExpenseCategoryType | null>(null);
  const [budgetSearch, _setBudgetSearch] = useState<string>('');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const expense = useMemo<Expense | null>(() => {
    return expenses.find((e) => e.id === params.expenseId) ?? null;
  }, [expenses, params.expenseId]);

  const receiptData = useMemo<ParsedReceiptData>(() => {
    const fromRaw = parseFromRawExtraction(expense?.receiptRawText);
    if (fromRaw && fromRaw.items.length > 0) {
      console.log('[ReceiptDetail] Parsed from raw extraction:', fromRaw.items.length, 'items');
      return fromRaw;
    }

    const previewItems = parseFromPreview(expense?.receiptItemsPreview);
    console.log('[ReceiptDetail] Parsed from preview:', previewItems.length, 'items');
    return {
      items: previewItems,
      subtotal: null,
      tax: null,
      tip: null,
      discount: null,
      paymentMethod: null,
    };
  }, [expense?.receiptRawText, expense?.receiptItemsPreview]);

  const catColor = expense ? (CATEGORY_COLORS[expense.category] ?? '#9CA3AF') : '#9CA3AF';
  const catLabel = expense ? (ExpenseCategoryLabels[expense.category as ExpenseCategoryType] ?? 'Other') : 'Other';

  const confidencePct = expense?.receiptConfidence
    ? Math.round(expense.receiptConfidence * 100)
    : null;

  const confidenceLabel = useMemo(() => {
    if (confidencePct === null) return '';
    if (confidencePct >= 80) return 'High';
    if (confidencePct >= 60) return 'Medium';
    return 'Low';
  }, [confidencePct]);

  const confidenceColor = useMemo(() => {
    if (confidencePct === null) return '#9CA3AF';
    if (confidencePct >= 80) return '#16A34A';
    if (confidencePct >= 60) return '#D97706';
    return '#EF4444';
  }, [confidencePct]);

  const itemsTotal = useMemo(() => {
    return receiptData.items.reduce((sum, i) => sum + i.totalPrice, 0);
  }, [receiptData.items]);

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
    if (budgetSearch.trim()) {
      const q = budgetSearch.toLowerCase();
      result = result.filter((e) => (e.title || '').toLowerCase().includes(q) || (e.merchant || '').toLowerCase().includes(q));
    }
    return result;
  }, [budgetFilteredExpenses, budgetCategoryFilter, budgetSearch]);

  const handleBudgetTimeTab = useCallback((key: 'week' | 'month' | 'all') => {
    void Haptics.selectionAsync();
    setBudgetTimeTab(key);
  }, []);

  const handleBudgetCategory = useCallback((key: ExpenseCategoryType) => {
    void Haptics.selectionAsync();
    setBudgetCategoryFilter((prev) => prev === key ? null : key);
  }, []);

  if (!expense) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.errorContainer, { paddingTop: insets.top + 60 }]}>
          <AlertCircle size={40} color="#C7C7CC" strokeWidth={1.5} />
          <Text style={styles.errorTitle}>Receipt not found</Text>
          <Text style={styles.errorSubtitle}>This receipt may have been deleted</Text>
          <Pressable
            onPress={() => router.back()}
            style={styles.errorBtn}
          >
            <Text style={styles.errorBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backBtn}
          hitSlop={12}
        >
          <ArrowLeft size={22} color="#00C853" strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Receipt Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <ReceiptText size={28} color="#00C853" strokeWidth={1.8} />
            </View>
            <Text style={styles.heroStore} numberOfLines={2}>
              {expense.merchant || expense.title || 'Receipt'}
            </Text>
            <Text style={styles.heroAmount}>${expense.amount.toFixed(2)}</Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaItem}>
                <Calendar size={13} color="#636366" strokeWidth={1.5} />
                <Text style={styles.heroMetaText}>{formatFullDate(expense.createdAt)}</Text>
              </View>
              <View style={styles.heroMetaItem}>
                <Clock size={13} color="#636366" strokeWidth={1.5} />
                <Text style={styles.heroMetaText}>{formatTime(expense.createdAt)}</Text>
              </View>
            </View>
            <View style={styles.heroBottomRow}>
              <View style={[styles.categoryPill, { backgroundColor: catColor + '18' }]}>
                <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                <Text style={[styles.categoryPillText, { color: catColor }]}>{catLabel}</Text>
              </View>
              {receiptData.paymentMethod && (
                <View style={styles.paymentPill}>
                  <CreditCard size={11} color="#636366" strokeWidth={1.5} />
                  <Text style={styles.paymentPillText}>{receiptData.paymentMethod}</Text>
                </View>
              )}
            </View>
          </View>

          {confidencePct !== null && (
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <View style={[styles.insightIconBadge, { backgroundColor: confidenceColor }]}>
                  <CheckCircle2 size={14} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Text style={styles.insightTitle}>Scan Confidence</Text>
                <View style={[styles.confidenceBadge, { backgroundColor: `${confidenceColor}15` }]}>
                  <View style={[styles.confidenceBadgeDot, { backgroundColor: confidenceColor }]} />
                  <Text style={[styles.confidenceBadgeText, { color: confidenceColor }]}>{confidenceLabel}</Text>
                </View>
              </View>
              <View style={styles.confidenceRow}>
                <View style={styles.confidenceBarBg}>
                  <View
                    style={[
                      styles.confidenceBarFill,
                      {
                        width: `${Math.min(confidencePct, 100)}%`,
                        backgroundColor: confidenceColor,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.confidenceText}>{confidencePct}%</Text>
              </View>
              <Text style={styles.confidenceHint}>
                {confidencePct >= 80
                  ? 'High confidence — details were clearly extracted'
                  : confidencePct >= 60
                  ? 'Moderate confidence — some details may need review'
                  : 'Low confidence — consider verifying the amounts'}
              </Text>
            </View>
          )}

          {receiptData.items.length > 0 && (
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <View style={[styles.insightIconBadge, { backgroundColor: '#D97706' }]}>
                  <ShoppingCart size={14} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Text style={styles.insightTitle}>Items</Text>
                <View style={styles.itemCountBadge}>
                  <Text style={styles.itemCountText}>{receiptData.items.length}</Text>
                </View>
              </View>
              <View style={styles.itemsList}>
                {receiptData.items.map((item, idx) => (
                  <View
                    key={`${item.name}-${idx}`}
                    style={[
                      styles.itemRow,
                      idx < receiptData.items.length - 1 && styles.itemRowBorder,
                    ]}
                  >
                    <View style={styles.itemLeft}>
                      <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                      {item.quantity > 1 && (
                        <Text style={styles.itemQty}>{item.quantity} × ${item.unitPrice.toFixed(2)}</Text>
                      )}
                    </View>
                    <Text style={styles.itemPrice}>${item.totalPrice.toFixed(2)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.breakdownSection}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Items Total</Text>
                  <Text style={styles.breakdownValue}>${itemsTotal.toFixed(2)}</Text>
                </View>
                {receiptData.subtotal !== null && receiptData.subtotal > 0 && Math.abs(receiptData.subtotal - itemsTotal) > 0.01 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Subtotal</Text>
                    <Text style={styles.breakdownValue}>${receiptData.subtotal.toFixed(2)}</Text>
                  </View>
                )}
                {receiptData.tax !== null && receiptData.tax > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Tax</Text>
                    <Text style={styles.breakdownValue}>${receiptData.tax.toFixed(2)}</Text>
                  </View>
                )}
                {receiptData.tip !== null && receiptData.tip > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Tip</Text>
                    <Text style={styles.breakdownValue}>${receiptData.tip.toFixed(2)}</Text>
                  </View>
                )}
                {receiptData.discount !== null && receiptData.discount > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Discount</Text>
                    <Text style={[styles.breakdownValue, { color: '#16A34A' }]}>-${receiptData.discount.toFixed(2)}</Text>
                  </View>
                )}
                <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                  <Text style={styles.breakdownTotalLabel}>Total Paid</Text>
                  <Text style={styles.breakdownTotalValue}>${expense.amount.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View style={[styles.insightIconBadge, { backgroundColor: '#3B82F6' }]}>
                <PieChart size={14} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text style={styles.insightTitle}>Quick Insights</Text>
            </View>
            <View style={styles.insightsGrid}>
              <View style={styles.insightTile}>
                <DollarSign size={18} color="#00C853" strokeWidth={2} />
                <Text style={styles.insightTileValue}>${expense.amount.toFixed(2)}</Text>
                <Text style={styles.insightTileLabel}>Total Spent</Text>
              </View>
              <View style={styles.insightTile}>
                <ShoppingCart size={18} color="#D97706" strokeWidth={2} />
                <Text style={styles.insightTileValue}>{receiptData.items.length || '—'}</Text>
                <Text style={styles.insightTileLabel}>Items</Text>
              </View>
              <View style={styles.insightTile}>
                <TrendingDown size={18} color="#3B82F6" strokeWidth={2} />
                <Text style={styles.insightTileValue}>
                  {receiptData.items.length > 0
                    ? `$${(expense.amount / receiptData.items.length).toFixed(2)}`
                    : '—'}
                </Text>
                <Text style={styles.insightTileLabel}>Avg / Item</Text>
              </View>
            </View>
          </View>

          {receiptData.discount !== null && receiptData.discount > 0 && (
            <View style={styles.savingsCard}>
              <View style={styles.savingsHeader}>
                <View style={[styles.insightIconBadge, { backgroundColor: '#16A34A' }]}>
                  <Tag size={14} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Text style={styles.insightTitle}>Savings</Text>
              </View>
              <Text style={styles.savingsAmount}>You saved ${receiptData.discount.toFixed(2)}</Text>
              <Text style={styles.savingsHint}>Discounts and coupons applied to this receipt</Text>
            </View>
          )}

          {(() => {
            const rawNote = expense.notes || expense.note || '';
            const displayNote = rawNote.startsWith('Scanned:') && receiptData.items.length > 0 ? '' : rawNote;
            if (!displayNote) return null;
            return (
              <View style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <View style={[styles.insightIconBadge, { backgroundColor: '#8E8E93' }]}>
                    <FileText size={14} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <Text style={styles.insightTitle}>Notes</Text>
                </View>
                <Text style={styles.notesText}>{displayNote}</Text>
              </View>
            );
          })()}

          {/* Budget Overview Section */}
          <View style={budgetStyles.divider}>
            <View style={budgetStyles.dividerLine} />
            <Text style={budgetStyles.dividerText}>Budget Overview</Text>
            <View style={budgetStyles.dividerLine} />
          </View>

          <View style={budgetStyles.budgetCard}>
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
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#E8F5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D1ECDD',
  },
  heroStore: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    textAlign: 'center' as const,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#1B7A45',
    letterSpacing: -0.8,
    marginBottom: 12,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroMetaText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  paymentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  paymentPillText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#636366',
  },
  insightCard: {
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
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  insightIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
    flex: 1,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  confidenceBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  confidenceBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  confidenceBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F2F2F7',
    overflow: 'hidden' as const,
  },
  confidenceBarFill: {
    height: 8,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    minWidth: 40,
    textAlign: 'right' as const,
  },
  confidenceHint: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#8E8E93',
    lineHeight: 17,
  },
  itemCountBadge: {
    backgroundColor: '#262626',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  itemCountText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  itemsList: {
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  itemLeft: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    lineHeight: 18,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  breakdownSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
    marginTop: 4,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 8,
    marginTop: 4,
  },
  breakdownTotalLabel: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#1C1C1E',
  },
  breakdownTotalValue: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#166534',
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  insightTile: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  insightTileValue: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  insightTileLabel: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#8E8E93',
  },
  savingsCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  savingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  savingsAmount: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#166534',
    marginBottom: 4,
  },
  savingsHint: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#6B7280',
  },
  notesText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#3C3C43',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    marginTop: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  errorBtn: {
    backgroundColor: '#1B7A45',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  errorBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});

const budgetStyles = StyleSheet.create({
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8E8E93',
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
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
    alignItems: 'flex-end',
    gap: 3,
  },
  budgetMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 9,
    padding: 2,
  },
  timeTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 7,
    alignItems: 'center',
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
  searchRow: {
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    paddingRight: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    gap: 6,
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
