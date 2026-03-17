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
  Bookmark,
  Tag,
  ScanLine,
  TrendingUp,
  Trash2,
  Package,
  Crown,
  ChevronRight,
  Wrench,
  ShoppingBag,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { AppIllustrations } from '@/constants/illustrations';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useScanHistory, ScanHistoryEntry } from '@/contexts/ScanHistoryContext';
import { useSavedItems, SavedDeal } from '@/contexts/SavedItemsContext';
import { usePremium } from '@/contexts/PremiumContext';
import SavedUpgradeModal from '@/components/SavedUpgradeModal';
import type { SmartScanResult } from '@/services/smartScanService';

type FilterKey = 'all' | 'scans' | 'value';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'scans', label: 'Scans' },
  { key: 'value', label: 'Good Values' },
];

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

function isThisWeek(dateStr: string): boolean {
  const now = new Date();
  const then = new Date(dateStr);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return then >= weekStart;
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

function getValueRating(entry: ScanHistoryEntry): string | null {
  const details = getDetailsRecord(entry.result);
  if (!details) return null;
  if (details.value_rating && typeof details.value_rating === 'string') return details.value_rating;
  return null;
}

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { entries: scanEntries, deleteEntry, isLoading: scanLoading } = useScanHistory();
  const {
    savedDeals, unsaveDeal, isLoading: dealsLoading,
    totalSavedCount, isAtFreeLimit, freeLimit,
  } = useSavedItems();
  const { isPremium } = usePremium();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

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

  const filteredItems = useMemo(() => {
    switch (activeFilter) {
      case 'scans':
        return unifiedItems.filter((i) => i.type === 'scan');
      case 'value':
        return unifiedItems.filter((i) => i.hasResaleValue || (i.price !== null));
      default:
        return unifiedItems;
    }
  }, [unifiedItems, activeFilter]);

  const handleFilterPress = useCallback((key: FilterKey) => {
    void Haptics.selectionAsync();
    setActiveFilter(key);
  }, []);

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
      router.push({ pathname: '/smart-scan' as any, params: { historyEntryId: scanEntry.id } });
    } else if (item.type === 'deal') {
      const deal = item.raw as SavedDeal;
      router.push({
        pathname: '/post-detail' as any,
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

  const counts = useMemo(() => ({
    all: unifiedItems.length,
    scans: unifiedItems.filter((i) => i.type === 'scan').length,
    value: unifiedItems.filter((i) => i.hasResaleValue || i.price !== null).length,
  }), [unifiedItems]);

  const getCategoryColor = useCallback((cat: string): string => {
    const lower = cat.toLowerCase();
    if (lower.includes('furniture') || lower.includes('home')) return '#D97706';
    if (lower.includes('electronic')) return '#0284C7';
    if (lower.includes('fashion')) return '#E11D48';
    if (lower.includes('food') || lower.includes('grocery')) return '#16A34A';
    if (lower.includes('tool')) return '#7C3AED';
    return '#6B7280';
  }, []);

  const getValueBadgeStyle = useCallback((rating: string | null) => {
    if (rating === 'great') return { bg: '#ECFDF5', text: '#059669', label: 'Great Value' };
    if (rating === 'good') return { bg: '#F0FDF4', text: '#16A34A', label: 'Good Value' };
    if (rating === 'average') return { bg: '#FFF7ED', text: '#D97706', label: 'Fair Value' };
    return null;
  }, []);

  const renderSavedCard = useCallback((item: UnifiedItem) => {
    const scanEntry = item.type === 'scan' ? item.raw as ScanHistoryEntry : null;
    const valueRating = scanEntry ? getValueRating(scanEntry) : null;
    const valueBadge = getValueBadgeStyle(valueRating);
    const isRecent = isThisWeek(item.savedAt);
    const catColor = getCategoryColor(item.category);

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
        <View style={styles.cardImageSection}>
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
                <Tag size={22} color="#C7C7CC" strokeWidth={1.5} />
              ) : (
                <Package size={22} color="#C7C7CC" strokeWidth={1.5} />
              )}
            </View>
          )}
          {isRecent && (
            <View style={styles.recentBadge}>
              <Text style={styles.recentBadgeText}>New</Text>
            </View>
          )}
          {item.type === 'scan' && (
            <View style={styles.scanBadge}>
              <ScanLine size={9} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

          <View style={styles.cardChipRow}>
            <View style={[styles.categoryChip, { backgroundColor: catColor + '14' }]}>
              <Text style={[styles.categoryChipText, { color: catColor }]}>{item.category}</Text>
            </View>
            {valueBadge && (
              <View style={[styles.valueChip, { backgroundColor: valueBadge.bg }]}>
                <Sparkles size={9} color={valueBadge.text} strokeWidth={2} />
                <Text style={[styles.valueChipText, { color: valueBadge.text }]}>{valueBadge.label}</Text>
              </View>
            )}
            {item.hasResaleValue && !valueBadge && (
              <View style={styles.resaleChip}>
                <TrendingUp size={9} color="#16A34A" strokeWidth={2} />
                <Text style={styles.resaleChipText}>Resale</Text>
              </View>
            )}
          </View>

          {item.price && (
            <Text style={styles.cardPrice}>{item.price}</Text>
          )}

          <View style={styles.cardFooter}>
            <Text style={styles.cardSource} numberOfLines={1}>{item.source}</Text>
            <View style={styles.cardTimeRow}>
              <Clock size={10} color="#AEAEB2" strokeWidth={1.5} />
              <Text style={styles.cardTime}>{formatTimeAgo(item.savedAt)}</Text>
            </View>
          </View>

          {item.relatedNeeds.length > 0 && (
            <View style={styles.relatedRow}>
              <Wrench size={10} color="#9CA3AF" strokeWidth={1.5} />
              <Text style={styles.relatedText} numberOfLines={1}>
                May need: {item.relatedNeeds.join(', ')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          <Pressable
            onPress={() => handleDelete(item)}
            style={styles.deleteBtn}
            hitSlop={10}
            testID={`saved-delete-${item.id}`}
          >
            <Trash2 size={14} color="#D1D5DB" strokeWidth={1.5} />
          </Pressable>
          <ChevronRight size={14} color="#D1D5DB" strokeWidth={1.8} />
        </View>
      </Pressable>
    );
  }, [handleCardPress, handleDelete, getCategoryColor, getValueBadgeStyle]);

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
      <View style={[styles.headerBar, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerBrand}>Saved</Text>
          {unifiedItems.length > 0 && (
            <View style={styles.countBubble}>
              <Text style={styles.countText}>{unifiedItems.length}</Text>
            </View>
          )}
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Crown size={11} color="#D4A017" strokeWidth={2.2} />
              <Text style={styles.premiumBadgeText}>PRO</Text>
            </View>
          )}
        </View>
        <Text style={styles.headerSubtitle}>Your scans, finds & saved items</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B5E3B" />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map((f) => {
              const isActive = activeFilter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => handleFilterPress(f.key)}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  testID={`saved-filter-${f.key}`}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                  {counts[f.key] > 0 && (
                    <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                      <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                        {counts[f.key]}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : filteredItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <Image
                source={{ uri: AppIllustrations.savedTags }}
                style={styles.emptyIllustration}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
              <Text style={styles.emptyTitle}>
                {activeFilter === 'all'
                  ? 'Nothing saved yet'
                  : activeFilter === 'scans'
                  ? 'No saved scans'
                  : 'No good-value items yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeFilter === 'scans'
                  ? 'Scan items to check their value and save them here'
                  : activeFilter === 'value'
                  ? 'Items with strong value or resale potential will appear here'
                  : 'Save scans and items here to build your collection'}
              </Text>
              <View style={styles.emptyActions}>
                <Pressable
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/smart-scan' as any);
                  }}
                  style={styles.emptyBtn}
                  testID="saved-empty-scan"
                >
                  <ScanLine size={15} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.emptyBtnText}>Scan an Item</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/(tabs)/discover' as any);
                  }}
                  style={styles.emptyBtnOutline}
                  testID="saved-empty-finds"
                >
                  <ShoppingBag size={15} color="#6B7280" strokeWidth={2} />
                  <Text style={styles.emptyBtnOutlineText}>Browse Finds</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.contentArea}>
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.sectionIconBadge}>
                      <Bookmark size={14} color="#FFFFFF" strokeWidth={2} />
                    </View>
                    <Text style={styles.sectionTitle}>
                      {activeFilter === 'all' ? 'All Items' : activeFilter === 'scans' ? 'Scanned Items' : 'Good Values'}
                    </Text>
                  </View>
                  <Text style={styles.sectionCount}>{filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}</Text>
                </View>

                <View style={styles.cardList}>
                  {filteredItems.map(renderSavedCard)}
                </View>
              </View>
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
    backgroundColor: '#F2F2F7',
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    zIndex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBrand: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 2,
  },
  countBubble: {
    backgroundColor: '#1B7A45',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F5E6A3',
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#B8860B',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingRight: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterChipActive: {
    backgroundColor: '#1B7A45',
    borderColor: '#1B7A45',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterCount: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#8E8E93',
  },
  filterCountTextActive: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 52,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIllustration: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center' as const,
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1B7A45',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  emptyBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  emptyBtnOutlineText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#3C3C43',
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  contentArea: {
    gap: 12,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#1B7A45',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
  },
  cardList: {
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  cardPressed: {
    backgroundColor: '#F2F2F7',
    transform: [{ scale: 0.98 }],
  },
  cardImageSection: {
    width: 80,
    height: 96,
    position: 'relative',
  },
  cardImage: {
    width: 80,
    height: 96,
  },
  cardImagePlaceholder: {
    width: 80,
    height: 96,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#1B7A45',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recentBadgeText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  scanBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: '#1B7A45',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cardBody: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
    marginBottom: 4,
    lineHeight: 19,
  },
  cardChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 4,
  },
  categoryChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  valueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  valueChipText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  resaleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resaleChipText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#16A34A',
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1B7A45',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSource: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#8E8E93',
    flex: 1,
    marginRight: 6,
  },
  cardTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cardTime: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: '#AEAEB2',
  },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    paddingTop: 3,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  relatedText: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: '#8E8E93',
    flex: 1,
  },
  cardActions: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingRight: 10,
    paddingLeft: 2,
  },
  deleteBtn: {
    padding: 6,
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F5E6A3',
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  upgradeCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeCardBody: {
    flex: 1,
  },
  upgradeCardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  upgradeCardSub: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#8E8E93',
  },
  upgradeCardArrow: {
    backgroundColor: '#1B7A45',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  upgradeCardArrowText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
