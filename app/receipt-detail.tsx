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
  CreditCard,
  Tag,
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
