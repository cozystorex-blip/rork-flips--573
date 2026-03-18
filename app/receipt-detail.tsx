import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
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
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '@/contexts/ExpenseContext';
import AdMobBanner from '@/components/ads/AdMobBanner';
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

function parseReceiptItems(preview: string | undefined): { name: string; price: number }[] {
  if (!preview) return [];
  const lines = preview.split('\n').filter(Boolean);
  return lines.map((line) => {
    const match = line.match(/^(.+?)\s*[-–—:]\s*\$?([\d.]+)$/);
    if (match) {
      return { name: match[1].trim(), price: parseFloat(match[2]) };
    }
    const priceMatch = line.match(/\$?([\d.]+)/);
    return {
      name: line.replace(/\$?[\d.]+/, '').trim() || line,
      price: priceMatch ? parseFloat(priceMatch[1]) : 0,
    };
  });
}

export default function ReceiptDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ expenseId: string }>();
  const { expenses } = useExpenses();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const expense = useMemo<Expense | null>(() => {
    return expenses.find((e) => e.id === params.expenseId) ?? null;
  }, [expenses, params.expenseId]);

  const receiptItems = useMemo(() => {
    return parseReceiptItems(expense?.receiptItemsPreview);
  }, [expense?.receiptItemsPreview]);

  const catColor = expense ? (CATEGORY_COLORS[expense.category] ?? '#9CA3AF') : '#9CA3AF';
  const catLabel = expense ? (ExpenseCategoryLabels[expense.category as ExpenseCategoryType] ?? 'Other') : 'Other';

  const confidencePct = expense?.receiptConfidence
    ? Math.round(expense.receiptConfidence * 100)
    : null;

  const itemsTotal = useMemo(() => {
    return receiptItems.reduce((sum, i) => sum + i.price, 0);
  }, [receiptItems]);

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
            <View style={[styles.categoryPill, { backgroundColor: catColor + '18' }]}>
              <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
              <Text style={[styles.categoryPillText, { color: catColor }]}>{catLabel}</Text>
            </View>
          </View>

          {confidencePct !== null && (
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <View style={styles.insightIconBadge}>
                  <CheckCircle2 size={14} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Text style={styles.insightTitle}>Scan Confidence</Text>
              </View>
              <View style={styles.confidenceRow}>
                <View style={styles.confidenceBarBg}>
                  <View
                    style={[
                      styles.confidenceBarFill,
                      {
                        width: `${Math.min(confidencePct, 100)}%`,
                        backgroundColor: confidencePct >= 80 ? '#16A34A' : confidencePct >= 50 ? '#D97706' : '#EF4444',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.confidenceText}>{confidencePct}%</Text>
              </View>
              <Text style={styles.confidenceHint}>
                {confidencePct >= 80
                  ? 'High confidence — details were clearly extracted'
                  : confidencePct >= 50
                  ? 'Moderate confidence — some details may need review'
                  : 'Low confidence — consider verifying the amounts'}
              </Text>
            </View>
          )}

          {receiptItems.length > 0 && (
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <View style={[styles.insightIconBadge, { backgroundColor: '#D97706' }]}>
                  <ShoppingCart size={14} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Text style={styles.insightTitle}>Items ({receiptItems.length})</Text>
              </View>
              <View style={styles.itemsList}>
                {receiptItems.map((item, idx) => (
                  <View
                    key={`${item.name}-${idx}`}
                    style={[
                      styles.itemRow,
                      idx < receiptItems.length - 1 && styles.itemRowBorder,
                    ]}
                  >
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    {item.price > 0 && (
                      <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                    )}
                  </View>
                ))}
              </View>
              {itemsTotal > 0 && (
                <View style={styles.itemsTotalRow}>
                  <Text style={styles.itemsTotalLabel}>Items Total</Text>
                  <Text style={styles.itemsTotalValue}>${itemsTotal.toFixed(2)}</Text>
                </View>
              )}
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
                <Text style={styles.insightTileValue}>{receiptItems.length || '—'}</Text>
                <Text style={styles.insightTileLabel}>Items</Text>
              </View>
              <View style={styles.insightTile}>
                <TrendingDown size={18} color="#3B82F6" strokeWidth={2} />
                <Text style={styles.insightTileValue}>
                  {receiptItems.length > 0
                    ? `$${(expense.amount / receiptItems.length).toFixed(2)}`
                    : '—'}
                </Text>
                <Text style={styles.insightTileLabel}>Avg / Item</Text>
              </View>
            </View>
          </View>

          {(expense.notes || expense.note) && (
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <View style={[styles.insightIconBadge, { backgroundColor: '#8E8E93' }]}>
                  <FileText size={14} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Text style={styles.insightTitle}>Notes</Text>
              </View>
              <Text style={styles.notesText}>{expense.notes || expense.note}</Text>
            </View>
          )}

          <AdMobBanner />

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
    textAlign: 'center',
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
    overflow: 'hidden',
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
  itemsList: {},
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
  itemName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1C1C1E',
    flex: 1,
    marginRight: 12,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  itemsTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  itemsTotalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8E8E93',
  },
  itemsTotalValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1B7A45',
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
