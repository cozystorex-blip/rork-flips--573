import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Tag,
  Package,
  Heart,
  Camera,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useScanHistory, ScanHistoryEntry } from '@/contexts/ScanHistoryContext';
import { useSavedItems, SavedDeal } from '@/contexts/SavedItemsContext';
import { useScanProcess } from '@/contexts/ScanProcessContext';
import type { SmartScanResult } from '@/services/smartScanService';

const GRID_GAP = 12;
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

  const filteredItems = unifiedItems;

  const { loadHistoryEntry } = useScanProcess();

  const handleCardPress = useCallback((item: UnifiedItem) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.type === 'scan') {
      const scanEntry = item.raw as ScanHistoryEntry;
      console.log('[Saved] Opening scan entry:', scanEntry.id, scanEntry.result.item_name);
      loadHistoryEntry({
        result: scanEntry.result,
        imageUri: scanEntry.imageUri,
        id: scanEntry.id,
      });
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
  }, [router, loadHistoryEntry]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void queryClient.invalidateQueries({ queryKey: ['scan_history'] });
    void queryClient.invalidateQueries({ queryKey: ['saved_deals'] });
    setTimeout(() => setRefreshing(false), 800);
  }, [queryClient]);

  const isLoading = scanLoading || dealsLoading;

  return (
    <View style={styles.root}>
      <View style={[styles.screenHeader, { paddingTop: insets.top + 28 }]}>
        <Text style={styles.screenTitle}>{''}</Text>
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

            <View style={styles.grid}>
              {filteredItems.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleCardPress(item)}
                  style={({ pressed }) => [
                    styles.gridCard,
                    { width: cardWidth },
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  testID={`saved-card-${item.id}`}
                >
                  <View style={[styles.gridImageWrap, { width: cardWidth, height: cardWidth }]}>
                    {item.imageUri ? (
                      <Image
                        source={{ uri: item.imageUri }}
                        style={[styles.gridImage, { width: cardWidth, height: cardWidth }]}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        recyclingKey={`saved-${item.id}`}
                      />
                    ) : (
                      <View style={[styles.gridImagePlaceholder, { width: cardWidth, height: cardWidth }]}>
                        {item.type === 'deal' ? (
                          <Tag size={28} color="#C7C7CC" strokeWidth={1.5} />
                        ) : (
                          <Package size={28} color="#C7C7CC" strokeWidth={1.5} />
                        )}
                      </View>
                    )}
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
  screenHeader: {
    paddingHorizontal: H_PAD,
    paddingBottom: 14,
    backgroundColor: '#F2F2F7',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
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
    backgroundColor: 'transparent',
    borderRadius: 16,
    overflow: 'hidden',
  },
  gridImageWrap: {
    backgroundColor: '#F2F2F7',
    overflow: 'hidden',
    borderRadius: 16,
  },
  gridImage: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
  },
  gridImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },

});
