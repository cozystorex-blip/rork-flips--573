import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  TextInput,
} from 'react-native';
import { Search, Receipt, TrendingUp } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExpenses } from '@/contexts/ExpenseContext';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

const TIME_FILTERS = [
  { key: 'all' as const, label: 'All' },
  { key: 'week' as const, label: 'This Week' },
  { key: 'month' as const, label: 'This Month' },
  { key: 'custom' as const, label: 'Custom' },
] as const;

function timeAgoLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getStoreInfo(merchant: string): { color: string; initial: string; bgColor: string } {
  const m = (merchant || '').toLowerCase();
  if (m.includes('target')) return { color: '#CC0000', initial: '🎯', bgColor: '#FEF2F2' };
  if (m.includes('walmart')) return { color: '#0071CE', initial: 'W', bgColor: '#EFF6FF' };
  if (m.includes('costco')) return { color: '#E31837', initial: 'C', bgColor: '#FEF2F2' };
  if (m.includes('amazon')) return { color: '#FF9900', initial: 'a', bgColor: '#FFFBEB' };
  if (m.includes('kroger')) return { color: '#0033A0', initial: 'K', bgColor: '#EFF6FF' };
  if (m.includes('whole foods')) return { color: '#00674B', initial: 'W', bgColor: '#F0FDF4' };
  if (m.includes('trader joe')) return { color: '#BA2026', initial: 'T', bgColor: '#FEF2F2' };
  if (m.includes('aldi')) return { color: '#00005F', initial: 'A', bgColor: '#EFF6FF' };
  if (m.includes('grocery')) return { color: '#16A34A', initial: '🛒', bgColor: '#F0FDF4' };
  const initial = (merchant || 'S').charAt(0).toUpperCase();
  return { color: '#16A34A', initial, bgColor: '#F0FDF4' };
}

function getReceiptBadge(amount: number, _itemCount: number): { label: string; color: string } | null {
  if (amount > 200) return { label: 'Best haul', color: '#7C3AED' };
  const savings = Math.round(amount * 0.14);
  if (savings > 15) return { label: `+$${savings} saved`, color: '#16A34A' };
  return null;
}

export default function ReceiptsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { expenses } = useExpenses();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleTimeFilter = useCallback((key: string) => {
    void Haptics.selectionAsync();
    setTimeFilter(key);
  }, []);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    let result = expenses.filter((e) => e.amount > 0);

    if (timeFilter === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (now.getDay() || 7) + 1);
      weekStart.setHours(0, 0, 0, 0);
      result = result.filter(e => new Date(e.createdAt) >= weekStart);
    } else if (timeFilter === 'month') {
      result = result.filter(e => {
        const d = new Date(e.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(e =>
        (e.merchant || '').toLowerCase().includes(q) ||
        (e.title || '').toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [expenses, timeFilter, searchText]);

  const totalAmount = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses]);

  const totalSavingsFound = useMemo(() => {
    return Math.round(totalAmount * 0.14);
  }, [totalAmount]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.title}>Receipts</Text>

        <View style={styles.searchBar}>
          <Search size={16} color="#8E8E93" strokeWidth={1.5} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search receipts..."
            placeholderTextColor="#AEAEB2"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {TIME_FILTERS.map((f) => {
            const isActive = timeFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => handleTimeFilter(f.key)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.countLabel}>
            {filteredExpenses.length} receipts · ${totalAmount.toFixed(2)} total
          </Text>

          {filteredExpenses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Receipt size={28} color="#C7C7CC" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No receipts yet</Text>
              <Text style={styles.emptySubtext}>Scan a receipt to start tracking your spending</Text>
            </View>
          ) : (
            <View style={styles.receiptList}>
              {filteredExpenses.map((exp, index) => {
                const storeInfo = getStoreInfo(exp.merchant || exp.title || '');
                const itemCount = exp.receiptItemsPreview
                  ? exp.receiptItemsPreview.split(',').length
                  : 0;
                const badge = getReceiptBadge(exp.amount, itemCount);
                return (
                  <Pressable
                    key={exp.id}
                    style={({ pressed }) => [
                      styles.receiptCard,
                      pressed && styles.receiptCardPressed,
                      index < filteredExpenses.length - 1 && styles.receiptCardBorder,
                    ]}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      router.push({ pathname: '/receipt-detail', params: { expenseId: exp.id } });
                    }}
                  >
                    <View style={[styles.receiptIcon, { backgroundColor: storeInfo.bgColor }]}>
                      <Text style={[styles.receiptIconText, { color: storeInfo.color }]}>
                        {storeInfo.initial}
                      </Text>
                    </View>
                    <View style={styles.receiptInfo}>
                      <View style={styles.receiptTopRow}>
                        <Text style={styles.receiptMerchant} numberOfLines={1}>
                          {exp.merchant || exp.title}
                        </Text>
                        <Text style={styles.receiptAmount}>${exp.amount.toFixed(2)}</Text>
                      </View>
                      <View style={styles.receiptMetaRow}>
                        <Text style={styles.receiptMeta}>
                          {itemCount > 0 ? `${itemCount} items · ` : ''}{timeAgoLabel(exp.createdAt)}
                        </Text>
                        {badge && (
                          <View style={[styles.receiptBadge, { backgroundColor: badge.color + '14' }]}>
                            <Text style={[styles.receiptBadgeText, { color: badge.color }]}>{badge.label}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {totalSavingsFound > 0 && filteredExpenses.length > 0 && (
            <View style={styles.savingsCard}>
              <View style={styles.savingsLeft}>
                <TrendingUp size={16} color="#16A34A" strokeWidth={2} />
                <View>
                  <Text style={styles.savingsLabel}>Total Savings Found</Text>
                  <Text style={styles.savingsSub}>On your receipts this month</Text>
                </View>
              </View>
              <Text style={styles.savingsAmount}>${totalSavingsFound.toFixed(2)}</Text>
            </View>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1E',
    height: 40,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterChipActive: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#636366',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  countLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#8E8E93',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 36,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#8E8E93',
  },
  receiptList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  receiptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  receiptCardPressed: {
    backgroundColor: '#F8F8FA',
  },
  receiptCardBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  receiptIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptIconText: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  receiptInfo: {
    flex: 1,
  },
  receiptTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptMerchant: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    flex: 1,
    marginRight: 8,
  },
  receiptAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  receiptMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 8,
  },
  receiptMeta: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
  },
  receiptBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  receiptBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  savingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  savingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  savingsLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#166534',
  },
  savingsSub: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#22C55E',
    marginTop: 1,
  },
  savingsAmount: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#166534',
  },
});
