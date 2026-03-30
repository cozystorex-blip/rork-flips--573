import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Tag,
  Package,
  Heart,
  Camera,
  Search,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useScanHistory, ScanHistoryEntry } from '@/contexts/ScanHistoryContext';
import { useSavedItems, SavedDeal } from '@/contexts/SavedItemsContext';
import type { SmartScanResult } from '@/services/smartScanService';

const GRID_GAP = 10;
const H_PAD = 16;
const SCREEN_WIDTH = Dimensions.get('window').width;

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
  const cardWidth = (SCREEN_WIDTH - H_PAD * 2 - GRID_GAP) / 2;
  const { entries: scanEntries, isLoading: scanLoading } = useScanHistory();
  const { savedDeals, isLoading: dealsLoading } = useSavedItems();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

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
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(q) || i.source.toLowerCase().includes(q));
    }
    return items;
  }, [unifiedItems, searchText]);

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
      <View style={[styles.headerArea, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Saved</Text>
        <View style={styles.searchBar}>
          <Search size={16} color="#8E8E93" strokeWidth={1.8} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            placeholderTextColor="#AEAEB2"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
        </View>
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
            <View style={styles.emptyIconWrap}>
              <Heart size={28} color="#16A34A" strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchText.trim() ? 'No results found' : 'Nothing saved yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchText.trim()
                ? 'Try a different search term'
                : 'Scan items or save deals to build your collection'}
            </Text>
            {!searchText.trim() && (
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/smart-scan');
                }}
                style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              >
                <Camera size={15} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.emptyBtnText}>Scan an Item</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View>
            <Text style={styles.countLabel}>
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            </Text>

            <View style={styles.grid}>
              {filteredItems.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleCardPress(item)}
                  style={({ pressed }) => [
                    styles.gridCard,
                    { width: cardWidth },
                    pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                  ]}
                  testID={`saved-card-${item.id}`}
                >
                  <View style={[styles.gridImageWrap, { width: cardWidth, height: cardWidth * 0.9 }]}>
                    {item.imageUri ? (
                      <Image
                        source={{ uri: item.imageUri }}
                        style={[styles.gridImage, { width: cardWidth, height: cardWidth * 0.9 }]}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        recyclingKey={`saved-${item.id}`}
                      />
                    ) : (
                      <View style={[styles.gridImagePlaceholder, { width: cardWidth, height: cardWidth * 0.9 }]}>
                        {item.type === 'deal' ? (
                          <Tag size={24} color="#D1D1D6" strokeWidth={1.5} />
                        ) : (
                          <Package size={24} color="#D1D1D6" strokeWidth={1.5} />
                        )}
                      </View>
                    )}
                    {item.badge && (
                      <View style={[styles.cardBadge, { backgroundColor: item.badgeColor }]}>
                        <Text style={styles.cardBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.gridCardBody}>
                    <Text style={styles.gridCardTitle} numberOfLines={2}>{item.title}</Text>
                    {item.price && (
                      <Text style={styles.gridCardPrice}>{item.price}</Text>
                    )}
                    <Text style={styles.gridCardSource} numberOfLines={1}>{item.source}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  headerArea: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: H_PAD,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1E',
    height: 40,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 14,
  },
  countLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8E8E93',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
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
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
  cardBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  gridCardBody: {
    padding: 10,
    gap: 2,
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    lineHeight: 18,
  },
  gridCardPrice: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    marginTop: 2,
  },
  gridCardSource: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#AEAEB2',
    marginTop: 2,
  },
});
