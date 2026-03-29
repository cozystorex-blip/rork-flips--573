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
  ArrowLeft,
  Share2,
  AlertCircle,
  Bookmark,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '@/contexts/ExpenseContext';

import type { Expense } from '@/types/expense';

interface ParsedReceiptItem {
  name: string;
  description: string;
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

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
      .map((i: { name: string; description?: string; category?: string; quantity?: number; unit_price?: number; unitPrice?: number; total_price?: number; totalPrice?: number; weight?: string; unit?: string }) => ({
        name: i.name,
        description: [i.weight, i.unit, i.category].filter(Boolean).join(' · ') || '',
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
          return { name: qtyMatch[2], description: '', quantity: qty, unitPrice: qty > 0 ? +(price / qty).toFixed(2) : price, totalPrice: price };
        }
        return { name: rawName, description: '', quantity: 1, unitPrice: price, totalPrice: price };
      }

      const commaItems = line.split(',').map((s) => s.trim()).filter(Boolean);
      if (commaItems.length > 1) {
        return commaItems.map((part) => {
          const partMatch = part.match(/^(.+?)\s+\$?([\d.]+)$/);
          if (partMatch) {
            const rawName = partMatch[1].trim();
            const price = parseFloat(partMatch[2]);
            return { name: rawName, description: '', quantity: 1, unitPrice: price, totalPrice: price };
          }
          return null;
        }).filter((x): x is ParsedReceiptItem => x !== null);
      }

      const priceMatch = line.match(/\$?([\d.]+)/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
      const name = line.replace(/\$?[\d.]+/, '').replace(/[-–—]/, '').trim() || line;
      return { name, description: '', quantity: 1, unitPrice: price, totalPrice: price };
    })
    .flat()
    .filter((item) => item.totalPrice > 0);
}

function getStoreColor(merchant: string): string {
  const m = (merchant || '').toLowerCase();
  if (m.includes('walmart')) return '#0071CE';
  if (m.includes('target')) return '#CC0000';
  if (m.includes('costco')) return '#E31837';
  if (m.includes('amazon')) return '#FF9900';
  if (m.includes('kroger')) return '#0033A0';
  if (m.includes('whole foods')) return '#00674B';
  if (m.includes('trader joe')) return '#BA2026';
  if (m.includes('aldi')) return '#00005F';
  return '#16A34A';
}

export default function ReceiptDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ expenseId: string }>();
  const { expenses } = useExpenses();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
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

  const storeColor = useMemo(() => getStoreColor(expense?.merchant || ''), [expense?.merchant]);

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

  const storeName = expense.merchant || expense.title || 'Receipt';
  const itemCount = receiptData.items.length;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <ArrowLeft size={22} color="#1C1C1E" strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <Share2 size={20} color="#1C1C1E" strokeWidth={1.8} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.storeSection}>
            <View style={[styles.storeIconWrap, { backgroundColor: storeColor + '14' }]}>
              <Text style={[styles.storeInitial, { color: storeColor }]}>
                {storeName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.storeName}>{storeName}</Text>
            <Text style={styles.storeDate}>
              {formatRelativeDate(expense.createdAt)} · {formatTime(expense.createdAt)}
            </Text>
          </View>

          <View style={styles.totalSection}>
            <Text style={styles.totalAmount}>${expense.amount.toFixed(2)}</Text>
            {itemCount > 0 && (
              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCountText}>{itemCount} items</Text>
              </View>
            )}
          </View>

          {receiptData.items.length > 0 && (
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>Purchased Items</Text>
              <View style={styles.itemsCard}>
                {receiptData.items.map((item, idx) => (
                  <View
                    key={`${item.name}-${idx}`}
                    style={[
                      styles.itemRow,
                      idx < receiptData.items.length - 1 && styles.itemRowBorder,
                    ]}
                  >
                    <View style={styles.itemImagePlaceholder}>
                      <Text style={styles.itemEmoji}>
                        {getItemEmoji(item.name)}
                      </Text>
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                      {item.description ? (
                        <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
                      ) : item.quantity > 1 ? (
                        <Text style={styles.itemDesc}>${item.unitPrice.toFixed(2)}/ea · {item.quantity}x</Text>
                      ) : null}
                    </View>
                    <Text style={styles.itemPrice}>${item.totalPrice.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.totalsCard}>
            {receiptData.subtotal !== null && receiptData.subtotal > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalRowLabel}>Subtotal</Text>
                <Text style={styles.totalRowValue}>${receiptData.subtotal.toFixed(2)}</Text>
              </View>
            ) : itemsTotal > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalRowLabel}>Subtotal</Text>
                <Text style={styles.totalRowValue}>${itemsTotal.toFixed(2)}</Text>
              </View>
            ) : null}
            {receiptData.tax !== null && receiptData.tax > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalRowLabel}>Tax</Text>
                <Text style={styles.totalRowValue}>${receiptData.tax.toFixed(2)}</Text>
              </View>
            )}
            {receiptData.tip !== null && receiptData.tip > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalRowLabel}>Tip</Text>
                <Text style={styles.totalRowValue}>${receiptData.tip.toFixed(2)}</Text>
              </View>
            )}
            {receiptData.discount !== null && receiptData.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalRowLabel}>Discount</Text>
                <Text style={[styles.totalRowValue, { color: '#16A34A' }]}>-${receiptData.discount.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.totalRowFinal]}>
              <Text style={styles.totalFinalLabel}>Total</Text>
              <Text style={styles.totalFinalValue}>${expense.amount.toFixed(2)}</Text>
            </View>
          </View>

          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            style={({ pressed }) => [styles.addToSavedBtn, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
            testID="receipt-add-to-saved"
          >
            <Bookmark size={18} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.addToSavedText}>Add to Saved</Text>
          </Pressable>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function getItemEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('banana')) return '🍌';
  if (n.includes('apple')) return '🍎';
  if (n.includes('milk')) return '🥛';
  if (n.includes('bread')) return '🍞';
  if (n.includes('egg')) return '🥚';
  if (n.includes('chicken') || n.includes('beef') || n.includes('meat') || n.includes('ground')) return '🥩';
  if (n.includes('cheese')) return '🧀';
  if (n.includes('butter')) return '🧈';
  if (n.includes('rice')) return '🍚';
  if (n.includes('pasta') || n.includes('noodle')) return '🍝';
  if (n.includes('water') || n.includes('drink') || n.includes('soda') || n.includes('juice')) return '🥤';
  if (n.includes('coffee')) return '☕';
  if (n.includes('tea')) return '🍵';
  if (n.includes('cookie') || n.includes('candy') || n.includes('chocolate') || n.includes('m&m')) return '🍬';
  if (n.includes('cereal') || n.includes('crunch') || n.includes('oat')) return '🥣';
  if (n.includes('paper') || n.includes('towel') || n.includes('tissue') || n.includes('bounty')) return '🧻';
  if (n.includes('soap') || n.includes('detergent') || n.includes('clean')) return '🧴';
  if (n.includes('peanut') || n.includes('nut') || n.includes('almond')) return '🥜';
  if (n.includes('yogurt')) return '🥛';
  if (n.includes('fish') || n.includes('salmon') || n.includes('tuna')) return '🐟';
  if (n.includes('pizza')) return '🍕';
  if (n.includes('tomato') || n.includes('sauce')) return '🍅';
  if (n.includes('potato') || n.includes('chip') || n.includes('fries')) return '🥔';
  if (n.includes('onion')) return '🧅';
  if (n.includes('pepper')) return '🌶️';
  if (n.includes('carrot')) return '🥕';
  if (n.includes('lettuce') || n.includes('salad')) return '🥬';
  if (n.includes('ice cream') || n.includes('frozen')) return '🍦';
  if (n.includes('protein') || n.includes('supplement')) return '💪';
  return '🛒';
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  storeSection: {
    flexDirection: 'column',
    marginBottom: 4,
  },
  storeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  storeInitial: {
    fontSize: 22,
    fontWeight: '800' as const,
  },
  storeName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  storeDate: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 3,
  },
  totalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  totalAmount: {
    fontSize: 34,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -1,
  },
  itemCountBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  itemCountText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#16A34A',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    marginBottom: 12,
  },
  itemsSection: {
    marginBottom: 16,
  },
  itemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  itemRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  itemImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F8F8FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemEmoji: {
    fontSize: 20,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    lineHeight: 19,
  },
  itemDesc: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  totalsCard: {
    backgroundColor: '#F8F8FA',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRowLabel: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: '#8E8E93',
  },
  totalRowValue: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#1C1C1E',
  },
  totalRowFinal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 10,
    marginTop: 4,
  },
  totalFinalLabel: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  totalFinalValue: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#1C1C1E',
  },
  addToSavedBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  addToSavedText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
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
    backgroundColor: '#16A34A',
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
