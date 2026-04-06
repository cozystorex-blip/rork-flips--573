import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Animated as RNAnimated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Package,
  Camera,
  Tag,
  ScanLine,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useScanHistory, ScanHistoryEntry } from '@/contexts/ScanHistoryContext';
import { useSavedItems, SavedDeal } from '@/contexts/SavedItemsContext';
import { Alert } from 'react-native';
import { useScanProcess } from '@/contexts/ScanProcessContext';
import type { SmartScanResult } from '@/services/smartScanService';
import { useScreenWidth } from '@/hooks/useScreenWidth';


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

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const screenWidth = useScreenWidth();
  const cardWidth = (screenWidth - H_PAD * 2 - GRID_GAP) / 2;
  const { entries: scanEntries, isLoading: scanLoading } = useScanHistory();
  const { saveDeal, isDealSaved, isLoading: dealsLoading } = useSavedItems();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { loadHistoryEntry } = useScanProcess();

  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideAnim = useRef(new RNAnimated.Value(18)).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      RNAnimated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

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

    return scanItems.sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
  }, [scanEntries]);

  const handleCardPress = useCallback((item: UnifiedItem) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.type === 'scan') {
      const scanEntry = item.raw as ScanHistoryEntry;
      console.log('[Home] Opening scan entry:', scanEntry.id, scanEntry.result.item_name);
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

  const handleLongPress = useCallback((item: UnifiedItem) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const scanEntry = item.raw as ScanHistoryEntry;
    const dealId = `scan-${scanEntry.id}`;

    if (isDealSaved(dealId)) {
      Alert.alert('Already Saved', 'This item is already in your saved collection.');
      return;
    }

    let price: number | null = null;
    const priceStr = getScanPrice(scanEntry);
    if (priceStr) {
      const num = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) price = num;
    }

    const result = saveDeal({
      dealId,
      title: scanEntry.result.item_name || 'Scanned Item',
      storeName: scanEntry.result.category || 'Scanned Item',
      price,
      originalPrice: null,
      savingsAmount: null,
      photoUrl: scanEntry.imageUri,
      category: scanEntry.result.category || null,
      sourceType: 'scan',
    });

    if (result === 'saved') {
      Alert.alert('Saved!', `"${scanEntry.result.item_name || 'Item'}" added to your saved collection.`);
    } else if (result === 'limit_reached') {
      Alert.alert('Limit Reached', 'Upgrade to Premium to save more items.');
    }
  }, [saveDeal, isDealSaved]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void queryClient.invalidateQueries({ queryKey: ['scan_history'] });
    void queryClient.invalidateQueries({ queryKey: ['saved_deals'] });
    setTimeout(() => setRefreshing(false), 800);
  }, [queryClient]);

  const isLoading = scanLoading || dealsLoading;

  return (
    <View style={styles.root}>
      <View style={[styles.screenHeader, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Image
            source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/oy0bdlmcx7kprxgc9gyo5.jpeg' }}
            style={styles.flipsLogoImage}
            contentFit="cover"
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
        <RNAnimated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : unifiedItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <ScanLine size={32} color="#16A34A" strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No items scanned yet</Text>
              <Text style={styles.emptySubtitle}>Scan items to see price, details, resale value, and matching products</Text>
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
                {unifiedItems.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleCardPress(item)}
                    onLongPress={() => handleLongPress(item)}
                    delayLongPress={400}
                    style={({ pressed }) => [
                      styles.gridCard,
                      { width: cardWidth },
                      pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                    ]}
                    testID={`home-card-${item.id}`}
                  >
                    <View style={[styles.gridImageWrap, { width: cardWidth }]}>
                      {item.imageUri ? (
                        <Image
                          source={{ uri: item.imageUri }}
                          style={[styles.gridImage, { width: cardWidth, height: cardWidth * 0.75 }]}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          recyclingKey={`home-${item.id}`}
                        />
                      ) : (
                        <View style={[styles.gridImagePlaceholder, { width: cardWidth, height: cardWidth * 0.75 }]}>
                          {item.type === 'deal' ? (
                            <Tag size={28} color="#C7C7CC" strokeWidth={1.5} />
                          ) : (
                            <Package size={28} color="#C7C7CC" strokeWidth={1.5} />
                          )}
                        </View>
                      )}
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                      <View style={styles.cardMetaRow}>
                        <Text style={styles.cardSubtitle} numberOfLines={1}>{item.source}</Text>
                        {item.price ? <Text style={styles.cardPrice}>{item.price}</Text> : null}
                      </View>
                      {item.badge ? (
                        <View style={[styles.cardBadge, { backgroundColor: `${item.badgeColor}14` }]}>
                          <Text style={[styles.cardBadgeText, { color: item.badgeColor }]}>{item.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 32 }} />
        </RNAnimated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  screenHeader: {
    paddingHorizontal: H_PAD,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flipsLogoImage: {
    width: 90,
    height: 90,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 21,
    fontWeight: '700' as const,
    color: '#0A0A0A',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6D6D72',
    textAlign: 'center' as const,
    lineHeight: 21,
    maxWidth: 260,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
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
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  gridImageWrap: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderRadius: 18,
  },
  gridImage: {
    backgroundColor: '#F5F5F5',
  },
  gridImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
  },
  cardInfo: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    gap: 3,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#0A0A0A',
    letterSpacing: -0.2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#6D6D72',
    flex: 1,
    marginRight: 4,
  },
  cardPrice: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#12903F',
  },
  cardBadge: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
});
