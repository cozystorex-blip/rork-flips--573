import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Tag,
  Package,
  Crown,
  Heart,
  Camera,
  Search,
  Bell,
  ChevronDown,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useScanHistory, ScanHistoryEntry } from '@/contexts/ScanHistoryContext';
import { useSavedItems, SavedDeal } from '@/contexts/SavedItemsContext';
import { usePremium } from '@/contexts/PremiumContext';
import SavedUpgradeModal from '@/components/SavedUpgradeModal';
import type { SmartScanResult } from '@/services/smartScanService';
import AdMobBanner from '@/components/ads/AdMobBanner';
import { useScreenWidth } from '@/hooks/useScreenWidth';

const FILTER_CHIPS = [
  { key: 'all', label: 'All Items' },
  { key: 'prices', label: 'Prices Dropped' },
  { key: 'deals', label: 'Deals' },
  { key: 'receipts', label: 'Receipts' },
] as const;

const GRID_GAP = 12;
const H_PAD = 16;

interface UnifiedItem {
  id: string;
  type: 'deal' | 'scan';
  title: string;
  subtitle: string;
  price: string | null;
  imageUri: string | null;
  source: string;
  savedAt: string;
  badge: string | null;
  badgeColor: string;
  raw: ScanHistoryEntry | SavedDeal;
}

function getDetailsRecord(r: SmartScanResult): Record<string, unknown> | null {
  if (r.fashion_details) return r.fashion_details as unknown as Record<string, unknown>;
  if (r.electronics_details) return r.electronics_details as unknown as Record<string, unknown>;
  if (r.food_details) return r.food_details as unknown as Record<string, unknown>;
  if (r.grocery_details) return r.grocery_details as unknown as Record<string, unknown>;
  if (r.household_details) return r.household_details as unknown as Record<string, unknown>;
  if (r.furniture_details) return r.furniture_details as unknown as Record<string, unknown>;
  return null;
}

function getScanPrice(entry: ScanHistoryEntry): string | null {
  const details = getDetailsRecord(entry.result);
  if (!details) return null;
  if (details.estimated_resale_value && typeof details.estimated_resale_value === 'string') return details.estimated_resale_value;
  if (details.estimated_retail_price && typeof details.estimated_retail_price === 'string') return details.estimated_retail_price;
  if (details.estimated_price && typeof details.estimated_price === 'string') return details.estimated_price;
  if (details.price_range && typeof details.price_range === 'string') return details.price_range;
  return null;
}

function getScanBadge(entry: ScanHistoryEntry): { label: string; color: string } | null {
  const details = getDetailsRecord(entry.result);
  if (!details) return null;
  const vv = details.value_verdict;
  if (vv && typeof vv === 'string') {
    const v = vv.toLowerCase();
    if (v.includes('good') || v.includes('great')) return { label: 'Good Deal', color: '#16A34A' };
    if (v.includes('low')) return { label: 'Low Price', color: '#16A34A' };
  }
  const rd = details.resale_demand;
  if (rd && typeof rd === 'string' && rd.toLowerCase().includes('high')) return { label: 'High Demand', color: '#EA580C' };
  return null;
}

export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const screenWidth = useScreenWidth();
  const cardWidth = (screenWidth - H_PAD * 2 - GRID_GAP) / 2;
  const { entries: scanEntries, isLoading: scanLoading } = useScanHistory();
  const {
    savedDeals, isLoading: dealsLoading,
    totalSavedCount, isAtFreeLimit, freeLimit,
  } = useSavedItems();
  const { isPremium } = usePremium();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const scanItems: UnifiedItem[] = scanEntries.map((e) => {
      const badge = getScanBadge(e);
      return {
        id: `scan-${e.id}`,
        type: 'scan' as const,
        title: e.result.item_name || 'Scanned Item',
        subtitle: e.result.item_type || 'Item',
        price: getScanPrice(e),
        imageUri: e.imageUri,
        source: e.result.category || 'Scanned Item',
        savedAt: e.scannedAt,
        badge: badge?.label ?? null,
        badgeColor: badge?.color ?? '#8E8E93',
        raw: e,
      };
    });

    const dealItems: UnifiedItem[] = savedDeals.map((d) => ({
      id: `deal-${d.id}`,
      type: 'deal' as const,
      title: d.title,
      subtitle: d.category || 'Deal',
      price: d.price != null ? `$${d.price.toFixed(2)}` : null,
      imageUri: d.photoUrl,
      source: d.storeName,
      savedAt: d.savedAt,
      badge: d.savingsAmount ? `${Math.round((d.savingsAmount / (d.price ?? 1)) * 100)}% Off` : null,
      badgeColor: '#16A34A',
      raw: d,
    }));

    return [...scanItems, ...dealItems].sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
  }, [scanEntries, savedDeals]);

  const filteredItems = useMemo(() => {
    let items = unifiedItems;
    if (activeFilter === 'deals') {
      items = items.filter(i => i.type === 'deal');
    } else if (activeFilter === 'prices') {
      items = items.filter(i => i.badge !== null);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(q) || i.source.toLowerCase().includes(q));
    }
    return items;
  }, [unifiedItems, activeFilter, searchText]);

  const handleCardPress = useCallback((item: UnifiedItem) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.type === 'scan') {
      const scanEntry = item.raw as ScanHistoryEntry;
      router.push({ pathname: '/smart-scan', params: { historyEntryId: scanEntry.id } });
    } else if (item.type === 'deal') {
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
  }, [router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void queryClient.invalidateQueries({ queryKey: ['scan_history'] });
    void queryClient.invalidateQueries({ queryKey: ['saved_deals'] });
    setTimeout(() => setRefreshing(false), 800);
  }, [queryClient]);

  const isLoading = scanLoading || dealsLoading;

  return (
    <View style={styles.root}>
      <View style={[styles.screenHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTopRow}>
          <Text style={styles.screenTitle}>Saved</Text>
          <Pressable style={styles.notifBtn} hitSlop={8}>
            <Bell size={18} color="#1C1C1E" strokeWidth={1.5} />
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <Search size={16} color="#8E8E93" strokeWidth={1.5} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search saved items..."
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
          {FILTER_CHIPS.map((chip) => {
            const isActive = activeFilter === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setActiveFilter(chip.key);
                }}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16A34A" />
        }
      >
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Heart size={32} color="#C7C7CC" strokeWidth={1.3} />
            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
            <Text style={styles.emptySubtitle}>Scan items or save deals to build your collection</Text>
            <View style={styles.emptyActions}>
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/smart-scan');
                }}
                style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.8 }]}
              >
                <Camera size={15} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.emptyBtnText}>Scan an Item</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.countRow}>
              <Text style={styles.countLabel}>{filteredItems.length} items saved</Text>
              <Pressable style={styles.sortBtn}>
                <Text style={styles.sortText}>Recently Added</Text>
                <ChevronDown size={12} color="#8E8E93" strokeWidth={1.5} />
              </Pressable>
            </View>

            <View style={styles.grid}>
              {filteredItems.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleCardPress(item)}
                  style={({ pressed }) => [
                    styles.gridCard,
                    { width: cardWidth },
                    pressed && { opacity: 0.85 },
                  ]}
                  testID={`saved-card-${item.id}`}
                >
                  <View style={[styles.gridImageWrap, { width: cardWidth, height: cardWidth * 0.85 }]}>
                    {item.imageUri ? (
                      <Image
                        source={{ uri: item.imageUri }}
                        style={[styles.gridImage, { width: cardWidth, height: cardWidth * 0.85 }]}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        recyclingKey={`saved-${item.id}`}
                      />
                    ) : (
                      <View style={[styles.gridImagePlaceholder, { width: cardWidth, height: cardWidth * 0.85 }]}>
                        {item.type === 'deal' ? (
                          <Tag size={24} color="#C7C7CC" strokeWidth={1.5} />
                        ) : (
                          <Package size={24} color="#C7C7CC" strokeWidth={1.5} />
                        )}
                      </View>
                    )}
                  </View>
                  <View style={styles.gridCardBody}>
                    <Text style={styles.gridCardTitle} numberOfLines={2}>{item.title}</Text>
                    {item.price && (
                      <Text style={styles.gridCardPrice}>{item.price}</Text>
                    )}
                    {item.badge && (
                      <View style={[styles.gridBadge, { backgroundColor: item.badgeColor + '14' }]}>
                        <Text style={[styles.gridBadgeText, { color: item.badgeColor }]}>{item.badge}</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>

            <AdMobBanner />

            {!isPremium && isAtFreeLimit && (
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setUpgradeVisible(true);
                }}
                style={({ pressed }) => [styles.upgradeCard, pressed && { opacity: 0.8 }]}
              >
                <Crown size={18} color="#16A34A" strokeWidth={1.8} />
                <View style={styles.upgradeCardBody}>
                  <Text style={styles.upgradeCardTitle}>Save more items</Text>
                  <Text style={styles.upgradeCardSub}>Upgrade for unlimited saves</Text>
                </View>
                <View style={styles.upgradeCardBtn}>
                  <Text style={styles.upgradeCardBtnText}>Upgrade</Text>
                </View>
              </Pressable>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <SavedUpgradeModal
        visible={upgradeVisible}
        onClose={() => setUpgradeVisible(false)}
        currentCount={totalSavedCount}
        freeLimit={freeLimit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  screenHeader: {
    paddingHorizontal: H_PAD,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
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
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 12,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  countLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center' as const,
    lineHeight: 20,
    maxWidth: 260,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 0,
  },
  gridImageWrap: {
    backgroundColor: '#F2F2F7',
    overflow: 'hidden',
  },
  gridImage: {
    backgroundColor: '#F2F2F7',
  },
  gridImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  gridCardBody: {
    padding: 10,
    gap: 2,
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    lineHeight: 17,
  },
  gridCardPrice: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    marginTop: 2,
  },
  gridBadge: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  gridBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  upgradeCardBody: {
    flex: 1,
  },
  upgradeCardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#16A34A',
  },
  upgradeCardSub: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 1,
  },
  upgradeCardBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upgradeCardBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
