import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 12,
        }),
      ]),
    ]).start();
  }, [fadeAnim, slideAnim, headerFade]);

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

  const renderSavedCard = useCallback((item: UnifiedItem) => {
    return (
      <Pressable
        key={item.id}
        onPress={() => handleCardPress(item)}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
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
                <Tag size={20} color="#B5B0A8" strokeWidth={1.5} />
              ) : (
                <Package size={20} color="#B5B0A8" strokeWidth={1.5} />
              )}
            </View>
          )}
          {item.type === 'scan' && (
            <View style={styles.scanDot}>
              <ScanLine size={10} color="#2D6A4F" strokeWidth={2} />
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
              <Trash2 size={14} color="#C8C4BC" strokeWidth={1.5} />
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
              <Wrench size={10} color="#A0A59A" strokeWidth={1.5} />
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
        style={styles.upgradeCard}
        testID="saved-upgrade-card"
      >
        <View style={styles.upgradeCardIcon}>
          <Crown size={20} color="#D4A017" strokeWidth={2} />
        </View>
        <View style={styles.upgradeCardBody}>
          <Text style={styles.upgradeCardTitle}>Save more items</Text>
          <Text style={styles.upgradeCardSub}>Upgrade for unlimited saves and full history</Text>
        </View>
        <View style={styles.upgradeCardArrow}>
          <Text style={styles.upgradeCardArrowText}>Upgrade</Text>
        </View>
      </Pressable>
    );
  }, [isPremium, isAtFreeLimit]);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.screenHeaderWrap, { paddingTop: insets.top + 16, opacity: headerFade }]}>
        <Text style={styles.screenTitle}>Saved</Text>
        <Text style={styles.screenSubtitle}>Your scans & saved deals</Text>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D6A4F" />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : filteredItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconArea}>
                <View style={styles.emptyIconCircle}>
                  <Heart size={28} color="#2D6A4F" strokeWidth={1.5} />
                </View>
              </View>
              <Text style={styles.emptyTitle}>Nothing saved yet</Text>
              <Text style={styles.emptySubtitle}>Scan items or save deals to build your collection</Text>
              <View style={styles.emptyActions}>
                <Pressable
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/smart-scan');
                  }}
                  style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
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
                  style={({ pressed }) => [styles.emptyBtnOutline, pressed && { opacity: 0.7 }]}
                  testID="saved-empty-finds"
                >
                  <ShoppingBag size={15} color="#4A5044" strokeWidth={2} />
                  <Text style={styles.emptyBtnOutlineText}>Browse Deals</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.contentArea}>
              <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>Your Items</Text>
                <View style={styles.headerCountBadge}>
                  <Text style={styles.headerCountText}>{filteredItems.length}</Text>
                </View>
              </View>

              <View style={styles.cardList}>
                {filteredItems.map(renderSavedCard)}
              </View>

              <AdMobBanner />
              {savedUpgradeCard}
            </View>
          )}

          <View style={{ height: 32 }} />
        </Animated.View>
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
    backgroundColor: '#EDEFE8',
  },
  screenHeaderWrap: {
    paddingHorizontal: 22,
    paddingBottom: 6,
    backgroundColor: '#EDEFE8',
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#1A1F16',
    letterSpacing: -0.8,
  },
  screenSubtitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#8A8F82',
    marginTop: 2,
    letterSpacing: -0.1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1A1F16',
    letterSpacing: -0.4,
  },
  headerCountBadge: {
    backgroundColor: '#E4EDE6',
    minWidth: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerCountText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#2D6A4F',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 36,
    alignItems: 'center',
    shadowColor: '#3C4A33',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    marginTop: 8,
  },
  emptyIconArea: {
    marginBottom: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#E4EDE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#1A1F16',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8A8F82',
    textAlign: 'center' as const,
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 8,
    maxWidth: 260,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 10,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  emptyBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DDE0D6',
  },
  emptyBtnOutlineText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#3C4A33',
  },
  loadingText: {
    fontSize: 14,
    color: '#8A8F82',
  },
  contentArea: {
    gap: 0,
  },
  cardList: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#3C4A33',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
    padding: 14,
    gap: 14,
    alignItems: 'flex-start',
  },
  cardPressed: {
    backgroundColor: '#F8FAF5',
    transform: [{ scale: 0.98 }],
  },
  cardImageWrap: {
    width: 76,
    height: 76,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: {
    width: 76,
    height: 76,
  },
  cardImagePlaceholder: {
    width: 76,
    height: 76,
    backgroundColor: '#F2F4EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(45, 106, 79, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 76,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1A1F16',
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  deleteBtn: {
    padding: 6,
    marginTop: -4,
    marginRight: -4,
  },
  cardPrice: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#2D6A4F',
    letterSpacing: -0.3,
    marginTop: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  cardSubtext: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#A0A59A',
    flex: 1,
    marginRight: 8,
  },
  cardTime: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#C0BDB5',
  },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  relatedText: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#A0A59A',
    flex: 1,
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF5',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F5E6A3',
    gap: 12,
    marginTop: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  upgradeCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeCardBody: {
    flex: 1,
  },
  upgradeCardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1A1F16',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  upgradeCardSub: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#8A8F82',
  },
  upgradeCardArrow: {
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  upgradeCardArrowText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
