import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Tag,
  ScanLine,
  Trash2,
  Package,
  Crown,
  Wrench,
  ShoppingBag,
  Heart,
  Camera,
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

const RELATED_ITEMS: Record<string, string[]> = {
  drill: ['Drill bits', 'Battery pack'],
  shelf: ['Wall anchors', 'Screws'],
  lamp: ['Light bulb', 'Extension cord'],
  furniture: ['Assembly tools', 'Hardware kit'],
  chair: ['Floor protectors', 'Cushion'],
  desk: ['Cable management', 'Desk mat'],
  table: ['Coasters', 'Placemats'],
  mirror: ['Wall anchors', 'Level tool'],
  cabinet: ['Shelf liners', 'Handles'],
  bookshelf: ['Bookends', 'Wall anchor kit'],
};

interface UnifiedItem {
  id: string;
  type: 'deal' | 'scan';
  title: string;
  subtitle: string;
  price: string | null;
  imageUri: string | null;
  source: string;
  savedAt: string;
  hasResaleValue: boolean;
  category: string;
  tags: string[];
  relatedNeeds: string[];
  raw: ScanHistoryEntry | SavedDeal;
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return '';
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

function getScanSource(entry: ScanHistoryEntry): string {
  const r = entry.result;
  const details = getDetailsRecord(r);
  if (details?.brand && typeof details.brand === 'string') return details.brand;
  if (r.category) return r.category;
  return 'Scanned Item';
}

function getScanCategory(entry: ScanHistoryEntry): string {
  const r = entry.result;
  if (r.item_type === 'furniture') return 'Furniture';
  if (r.item_type === 'household') {
    const details = r.household_details;
    if (details?.subcategory) {
      const sub = details.subcategory;
      return sub.charAt(0).toUpperCase() + sub.slice(1).replace('_', ' ');
    }
    return 'Home';
  }
  if (r.item_type === 'electronics') return 'Electronics';
  if (r.item_type === 'fashion') return 'Fashion';
  if (r.item_type === 'food') return 'Food';
  if (r.item_type === 'grocery') return 'Grocery';
  return 'Item';
}

function getScanTags(entry: ScanHistoryEntry): string[] {
  const details = getDetailsRecord(entry.result);
  if (details?.tags && Array.isArray(details.tags)) {
    return (details.tags as string[]).slice(0, 3);
  }
  return [];
}

function getRelatedNeeds(entry: ScanHistoryEntry): string[] {
  const r = entry.result;
  if (r.grocery_details?.what_else_needed && Array.isArray(r.grocery_details.what_else_needed)) {
    return (r.grocery_details.what_else_needed as string[]).slice(0, 2);
  }
  if (r.furniture_details) {
    const fd = r.furniture_details as Record<string, unknown>;
    if (fd.extra_purchase_items && Array.isArray(fd.extra_purchase_items)) {
      return (fd.extra_purchase_items as Array<{ item?: string }>).slice(0, 2).map(i => i.item || 'Accessory');
    }
  }
  const name = (r.item_name || '').toLowerCase();
  for (const [keyword, needs] of Object.entries(RELATED_ITEMS)) {
    if (name.includes(keyword)) return needs;
  }
  return [];
}

function hasResale(entry: ScanHistoryEntry): boolean {
  const details = getDetailsRecord(entry.result);
  if (!details) return false;
  return !!(details.estimated_resale_value || details.resale_demand || details.best_selling_platform || details.estimated_retail_price);
}

export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { entries: scanEntries, deleteEntry, isLoading: scanLoading } = useScanHistory();
  const {
    savedDeals, unsaveDeal, isLoading: dealsLoading,
    totalSavedCount, isAtFreeLimit, freeLimit,
  } = useSavedItems();
  const { isPremium } = usePremium();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);

  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const scanItems: UnifiedItem[] = scanEntries.map((e) => ({
      id: `scan-${e.id}`,
      type: 'scan' as const,
      title: e.result.item_name || 'Scanned Item',
      subtitle: e.result.item_type || 'Item',
      price: getScanPrice(e),
      imageUri: e.imageUri,
      source: getScanSource(e),
      savedAt: e.scannedAt,
      hasResaleValue: hasResale(e),
      category: getScanCategory(e),
      tags: getScanTags(e),
      relatedNeeds: getRelatedNeeds(e),
      raw: e,
    }));

    const dealItems: UnifiedItem[] = savedDeals.map((d) => ({
      id: `deal-${d.id}`,
      type: 'deal' as const,
      title: d.title,
      subtitle: d.category || 'Deal',
      price: d.price != null ? `$${d.price.toFixed(2)}` : null,
      imageUri: d.photoUrl,
      source: d.storeName,
      savedAt: d.savedAt,
      hasResaleValue: false,
      category: d.category || 'Deal',
      tags: [],
      relatedNeeds: [],
      raw: d,
    }));

    return [...scanItems, ...dealItems].sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
  }, [scanEntries, savedDeals]);

  const filteredItems = unifiedItems;

  const handleDelete = useCallback((item: UnifiedItem) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (item.type === 'scan') {
      const scanEntry = item.raw as ScanHistoryEntry;
      deleteEntry(scanEntry.id);
    } else {
      const deal = item.raw as SavedDeal;
      unsaveDeal(deal.dealId);
    }
  }, [deleteEntry, unsaveDeal]);

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
    console.log('[Saved] Pull-to-refresh triggered');
    void queryClient.invalidateQueries({ queryKey: ['scan_history'] });
    void queryClient.invalidateQueries({ queryKey: ['saved_deals'] });
    setTimeout(() => setRefreshing(false), 800);
  }, [queryClient]);

  const isLoading = scanLoading || dealsLoading;

  const renderSavedCard = useCallback((item: UnifiedItem, index: number, arr: UnifiedItem[]) => {
    return (
      <Pressable
        key={item.id}
        onPress={() => handleCardPress(item)}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
          index < arr.length - 1 && styles.cardBorder,
        ]}
        testID={`saved-card-${item.id}`}
      >
        <View style={styles.cardImageWrap}>
          {item.imageUri ? (
            <Image
              source={{ uri: item.imageUri }}
              style={styles.cardImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={`saved-${item.id}`}
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              {item.type === 'deal' ? (
                <Tag size={18} color="#636366" strokeWidth={1.5} />
              ) : (
                <Package size={18} color="#636366" strokeWidth={1.5} />
              )}
            </View>
          )}
          {item.type === 'scan' && (
            <View style={styles.scanBadge}>
              <ScanLine size={8} color="#34C759" strokeWidth={2} />
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Pressable
              onPress={() => handleDelete(item)}
              style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.4 }]}
              hitSlop={12}
              testID={`saved-delete-${item.id}`}
            >
              <Trash2 size={14} color="#48484A" strokeWidth={1.5} />
            </Pressable>
          </View>

          {item.price && (
            <Text style={styles.cardPrice}>{item.price}</Text>
          )}

          <View style={styles.cardMetaRow}>
            <Text style={styles.cardSubtext} numberOfLines={1}>{item.source.toLowerCase()}</Text>
            <Text style={styles.cardTime}>{formatTimeAgo(item.savedAt)}</Text>
          </View>

          {item.relatedNeeds.length > 0 && (
            <View style={styles.relatedRow}>
              <Wrench size={10} color="#8E8E93" strokeWidth={1.5} />
              <Text style={styles.relatedText} numberOfLines={1}>
                May need: {item.relatedNeeds.join(', ')}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }, [handleCardPress, handleDelete]);

  const savedUpgradeCard = useMemo(() => {
    if (isPremium || !isAtFreeLimit) return null;
    return (
      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setUpgradeVisible(true);
        }}
        style={({ pressed }) => [styles.upgradeCard, pressed && { opacity: 0.8 }]}
        testID="saved-upgrade-card"
      >
        <Crown size={18} color="#34C759" strokeWidth={1.8} />
        <View style={styles.upgradeCardBody}>
          <Text style={styles.upgradeCardTitle}>Save more items</Text>
          <Text style={styles.upgradeCardSub}>Upgrade for unlimited saves</Text>
        </View>
        <View style={styles.upgradeCardBtn}>
          <Text style={styles.upgradeCardBtnText}>Upgrade</Text>
        </View>
      </Pressable>
    );
  }, [isPremium, isAtFreeLimit]);

  return (
    <View style={styles.root}>
      <View style={[styles.screenHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.screenTitle}>Saved</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#34C759" />
        }
      >
        <View>
          {isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : filteredItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <Heart size={32} color="#636366" strokeWidth={1.3} />
              <Text style={styles.emptyTitle}>Nothing saved yet</Text>
              <Text style={styles.emptySubtitle}>Scan items or save deals to build your collection</Text>
              <View style={styles.emptyActions}>
                <Pressable
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/smart-scan');
                  }}
                  style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.8 }]}
                  testID="saved-empty-scan"
                >
                  <Camera size={15} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.emptyBtnText}>Scan an Item</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/(tabs)/discover');
                  }}
                  style={({ pressed }) => [styles.emptyBtnSecondary, pressed && { opacity: 0.7 }]}
                  testID="saved-empty-finds"
                >
                  <ShoppingBag size={15} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.emptyBtnSecondaryText}>Browse Deals</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.countRow}>
                <Text style={styles.countLabel}>{filteredItems.length} items</Text>
              </View>

              <View style={styles.cardList}>
                {filteredItems.map((item, index) => renderSavedCard(item, index, filteredItems))}
              </View>

              <AdMobBanner />
              {savedUpgradeCard}
            </View>
          )}

          <View style={{ height: 32 }} />
        </View>
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
    backgroundColor: '#000000',
  },
  screenHeader: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: '#000000',
  },
  screenTitle: {
    fontSize: 34,
    fontWeight: '800' as const,
    color: '#34C759',
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  countRow: {
    marginBottom: 12,
  },
  countLabel: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#34C759',
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
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  emptyBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  cardList: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  cardPressed: {
    backgroundColor: '#2C2C2E',
  },
  cardBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
  },
  cardImageWrap: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#2C2C2E',
  },
  cardImage: {
    width: 64,
    height: 64,
  },
  cardImagePlaceholder: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 64,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  deleteBtn: {
    padding: 6,
    marginTop: -4,
    marginRight: -4,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#34C759',
    marginTop: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardSubtext: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    flex: 1,
    marginRight: 8,
  },
  cardTime: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#636366',
  },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  relatedText: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#8E8E93',
    flex: 1,
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 14,
  },
  upgradeCardBody: {
    flex: 1,
  },
  upgradeCardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#34C759',
  },
  upgradeCardSub: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 1,
  },
  upgradeCardBtn: {
    backgroundColor: '#34C759',
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
