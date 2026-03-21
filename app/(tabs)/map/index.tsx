import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Clock,
  AlertCircle,
  ShoppingBag,
  Store,
  DollarSign,
  TrendingDown,
  Tag,
  Camera,
  Flame,
  ChevronRight,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import Colors, { CategoryColors } from '@/constants/colors';
import type { CategoryType } from '@/types';
import type { VerifiedDealRow } from '@/types';
import { useRouter } from 'expo-router';
import { syncStoreBrandDeals, shouldSync, computeDealTrust, type DealTrustInfo } from '@/services/dealIngestionService';
import { SEED_DEALS, DEAL_POSTER_MAP } from '@/mocks/seedDeals';
import { getProductImageUrl } from '@/constants/productImages';
import { mockProfiles } from '@/mocks/data';
import { getLocalDeals } from '@/services/localDealsService';
import AdMobBanner from '@/components/ads/AdMobBanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PHOTO_HEIGHT = (SCREEN_WIDTH - 32) * 0.48;

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
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

function getCategoryColor(cat: string | null): string {
  if (!cat) return Colors.textTertiary;
  const key = cat.toLowerCase() as CategoryType;
  return CategoryColors[key] ?? Colors.textTertiary;
}

async function fetchDeals(): Promise<VerifiedDealRow[]> {
  console.log('[Deals] Fetching deals from Supabase...');
  let supabaseDeals: VerifiedDealRow[] = [];

  try {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.log('[Deals] Supabase error:', error.message);
    } else {
      supabaseDeals = (data ?? []) as VerifiedDealRow[];
      console.log('[Deals] Fetched', supabaseDeals.length, 'deals from Supabase');
    }
  } catch (err) {
    console.log('[Deals] Supabase fetch failed:', err);
  }

  const localDeals = await getLocalDeals();
  console.log('[Deals] Fetched', localDeals.length, 'local deals');

  const supabaseIds = new Set(supabaseDeals.map((d) => d.id));
  const uniqueLocalDeals = localDeals.filter((d) => !supabaseIds.has(d.id));

  const combined = [...supabaseDeals, ...uniqueLocalDeals];
  console.log('[Deals] Combined total:', combined.length, '(supabase:', supabaseDeals.length, '+ local:', uniqueLocalDeals.length, ')');
  return combined;
}

function mergeWithSeedDeals(supabaseDeals: VerifiedDealRow[]): VerifiedDealRow[] {
  const realTitles = new Set(
    supabaseDeals.map((d) => `${(d.store_name ?? '').toLowerCase()}::${(d.title ?? '').toLowerCase()}`)
  );

  const missingSeeds = SEED_DEALS.filter((seed) => {
    const key = `${(seed.store_name ?? '').toLowerCase()}::${(seed.title ?? '').toLowerCase()}`;
    return !realTitles.has(key);
  });

  const combined = [...supabaseDeals, ...missingSeeds];
  console.log('[Deals] Merged:', supabaseDeals.length, 'real +', missingSeeds.length, 'seed =', combined.length);
  return combined;
}

function isValidPhotoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.length < 10) return false;
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('file://');
}

function isVerifiedDeal(deal: VerifiedDealRow): boolean {
  return deal.is_verified === true && !!deal.source_url;
}

function isExpiredDeal(deal: VerifiedDealRow): boolean {
  if (!deal.deal_expires_at) return false;
  return new Date(deal.deal_expires_at).getTime() < Date.now();
}

function getDealDisplayTime(deal: VerifiedDealRow): string {
  if (deal.is_verified && deal.last_verified) {
    return formatTimeAgo(deal.last_verified);
  }
  return formatTimeAgo(deal.created_at);
}

function getTrustBadgeConfig(trust: DealTrustInfo): { label: string; color: string; bgColor: string; borderColor: string } {
  switch (trust.level) {
    case 'high':
      return { label: 'Store Verified', color: '#166534', bgColor: '#F0FDF4', borderColor: '#DCFCE7' };
    case 'medium':
      return { label: 'Likely Accurate', color: '#92400E', bgColor: '#FFFBEB', borderColor: '#FDE68A' };
    case 'low':
      return { label: 'Estimate', color: '#9A3412', bgColor: '#FFF7ED', borderColor: '#FED7AA' };
    default:
      return { label: 'Unverified', color: '#6B7280', bgColor: '#F9FAFB', borderColor: '#E5E7EB' };
  }
}

function getFreshnessIndicator(trust: DealTrustInfo): { label: string; color: string } | null {
  if (trust.freshnessHours < 6) return { label: 'Fresh', color: '#059669' };
  if (trust.freshnessHours < 24) return { label: 'Today', color: '#059669' };
  if (trust.freshnessHours < 48) return { label: 'Recent', color: '#D97706' };
  if (trust.isStale) return { label: 'Aging', color: '#DC2626' };
  return null;
}

function getPriceDisplay(deal: VerifiedDealRow): { hasPrice: boolean; priceText: string; valueText: string | null } {
  const hasPrice = deal.price !== null && deal.price !== undefined;
  const hasSavings = deal.savings_amount !== null && deal.savings_amount !== undefined && deal.savings_amount > 0;
  const hasSavingsPercent = deal.savings_percent !== null && deal.savings_percent !== undefined && deal.savings_percent > 0;

  let priceText = '';
  if (hasPrice) {
    priceText = `$${deal.price!.toFixed(2)}`;
  }

  let valueText: string | null = null;
  if (hasSavings) {
    valueText = `Save $${deal.savings_amount!.toFixed(2)}`;
  } else if (hasSavingsPercent) {
    valueText = `${deal.savings_percent!.toFixed(0)}% off`;
  } else if (!hasPrice && deal.description) {
    const match = deal.description.match(/\$[\d]+\.?\d*/);
    if (match) {
      priceText = match[0];
    }
  }

  if (!priceText && !valueText) {
    valueText = 'See deal';
  }

  return { hasPrice: !!priceText, priceText, valueText };
}

function getDealPoster(deal: VerifiedDealRow): { name: string; avatar: string } | null {
  if (DEAL_POSTER_MAP[deal.id]) return DEAL_POSTER_MAP[deal.id];
  if (deal.user_id) {
    const profile = mockProfiles.find((p) => p.id === deal.user_id);
    if (profile) return { name: profile.name, avatar: profile.avatar };
  }
  return null;
}

const DealCard = React.memo(function DealCard({ deal, timeAgo, trust, onPress }: { deal: VerifiedDealRow; timeAgo: string; trust: DealTrustInfo; onPress: () => void }) {
  const catColor = getCategoryColor(deal.category);
  const verified = isVerifiedDeal(deal);
  const isUserDeal = deal.source_type === 'user';
  const hasPhoto = isValidPhotoUrl(deal.photo_url);
  const expired = isExpiredDeal(deal);
  const poster = getDealPoster(deal);
  const productThumbUrl = !hasPhoto ? getProductImageUrl(deal.title ?? '', deal.category ?? 'other') : null;
  const hasSavings = deal.savings_amount !== null && deal.savings_amount !== undefined && deal.savings_amount > 0;
  const hasSavingsPercent = deal.savings_percent !== null && deal.savings_percent !== undefined && deal.savings_percent > 0;
  const hasOriginalPrice = deal.original_price !== null && deal.original_price !== undefined && deal.original_price > 0;
  const priceInfo = getPriceDisplay(deal);
  const trustBadge = getTrustBadgeConfig(trust);
  const freshness = getFreshnessIndicator(trust);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 10 }).start();
  }, [scaleAnim]);

  const onPressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress} style={[styles.dealCard, expired && styles.dealCardExpired]}>
        {hasPhoto && (
          <View style={styles.cardPhotoWrap}>
            <Image
              source={{ uri: deal.photo_url! }}
              style={styles.cardPhoto}
              contentFit="cover"
              transition={200}
              recyclingKey={deal.id}
            />
            <View style={styles.photoGradientOverlay} />
            {hasSavings && (
              <View style={styles.savingsOverlay}>
                <TrendingDown size={11} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.savingsOverlayText}>Save ${deal.savings_amount!.toFixed(2)}</Text>
              </View>
            )}
            {hasSavingsPercent && !hasSavings && (
              <View style={styles.savingsOverlay}>
                <Text style={styles.savingsOverlayText}>{deal.savings_percent!.toFixed(0)}% off</Text>
              </View>
            )}
            {isUserDeal && (
              <View style={[styles.cardSourceBadge, styles.cardSourceBadgeCommunity]}>
                <Flame size={10} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.cardSourceText}>Community</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.cardContent}>
          {!hasPhoto && (
            <View style={styles.badgeRow}>
              {isUserDeal && (
                <View style={styles.communityBadgeInline}>
                  <Flame size={10} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.communityBadgeText}>Community</Text>
                </View>
              )}
              {deal.moderation_status === 'pending' && isUserDeal && (
                <View style={styles.pendingBadgeInline}>
                  <Clock size={10} color="#92400E" strokeWidth={2} />
                  <Text style={styles.pendingBadgeText}>Under Review</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.cardTopRow}>
            <View style={styles.storeRow}>
              {poster ? (
                <View style={styles.posterAvatarWrap}>
                  <Image
                    source={{ uri: poster.avatar }}
                    style={styles.posterAvatar}
                    contentFit="cover"
                    transition={150}
                    recyclingKey={`poster-${deal.id}`}
                  />
                </View>
              ) : !hasPhoto && productThumbUrl ? (
                <View style={styles.productThumbWrap}>
                  <Image
                    source={{ uri: productThumbUrl }}
                    style={styles.productThumb}
                    contentFit="cover"
                    transition={200}
                    recyclingKey={`thumb-${deal.id}`}
                  />
                </View>
              ) : (
                <View style={[styles.storeIcon, { backgroundColor: catColor + '15' }]}>
                  <Store size={13} color={catColor} strokeWidth={1.8} />
                </View>
              )}
              <View style={styles.storeNameCol}>
                {poster && (
                  <Text style={styles.posterName} numberOfLines={1}>{poster.name}</Text>
                )}
                <Text style={[styles.storeName, poster && styles.storeNameSmall]} numberOfLines={1}>
                  {deal.store_name || 'Unknown Store'}
                </Text>
              </View>
            </View>
            <View style={styles.priceBlock}>
              {priceInfo.hasPrice ? (
                <Text style={styles.priceTag}>{priceInfo.priceText}</Text>
              ) : priceInfo.valueText && priceInfo.valueText !== 'See deal' ? (
                <Text style={styles.priceTagGreen}>{priceInfo.valueText}</Text>
              ) : (
                <View style={styles.seeDealPill}>
                  <DollarSign size={10} color="#1B5E3B" strokeWidth={1.8} />
                  <Text style={styles.seeDealText}>See deal</Text>
                </View>
              )}
              {hasOriginalPrice && (
                <Text style={styles.originalPrice}>${deal.original_price!.toFixed(2)}</Text>
              )}
            </View>
          </View>

          <Text style={styles.dealTitle} numberOfLines={2}>
            {deal.title || 'Untitled Deal'}
          </Text>

          {deal.description ? (
            <Text style={styles.dealDesc} numberOfLines={2}>{deal.description}</Text>
          ) : null}

          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              {deal.category && (
                <View style={[styles.catChip, { backgroundColor: catColor + '12' }]}>
                  <Text style={[styles.catChipText, { color: catColor }]}>
                    {deal.category.charAt(0).toUpperCase() + deal.category.slice(1).toLowerCase()}
                  </Text>
                </View>
              )}
              {!verified && trust.level !== 'unverified' && (
                <View style={[styles.trustPill, { backgroundColor: trustBadge.bgColor, borderColor: trustBadge.borderColor }]}>
                  <Text style={[styles.trustPillText, { color: trustBadge.color }]}>{trustBadge.label}</Text>
                </View>
              )}
              {freshness && !expired && (
                <View style={styles.metaItem}>
                  <View style={[styles.freshDot, { backgroundColor: freshness.color }]} />
                  <Text style={[styles.metaText, { color: freshness.color }]}>{freshness.label}</Text>
                </View>
              )}
            </View>
            <View style={styles.footerRight}>
              {timeAgo ? (
                <View style={styles.metaItem}>
                  <Clock size={10} color="#AEAEB2" strokeWidth={1.5} />
                  <Text style={styles.metaText}>{timeAgo}</Text>
                </View>
              ) : null}
              <ChevronRight size={14} color="#C7C7CC" strokeWidth={1.8} />
            </View>
          </View>

          {!hasPhoto && hasSavings && (
            <View style={styles.savingsInline}>
              <TrendingDown size={11} color="#059669" strokeWidth={2.5} />
              <Text style={styles.savingsInlineText}>Save ${deal.savings_amount!.toFixed(2)}</Text>
              {hasSavingsPercent && (
                <View style={styles.savingsPercentPill}>
                  <Text style={styles.savingsPercentPillText}>{deal.savings_percent!.toFixed(0)}%</Text>
                </View>
              )}
            </View>
          )}

          {expired && (
            <View style={styles.expiredBanner}>
              <Text style={styles.expiredBannerText}>Deal may have expired</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
});

export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [syncStatus, setSyncStatus] = useState<string>('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { data: rawDeals, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['deals'],
    queryFn: fetchDeals,
    staleTime: 5000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const deals = useMemo(() => {
    if (!rawDeals) return null;
    return mergeWithSeedDeals(rawDeals);
  }, [rawDeals]);

  const syncMutation = useMutation({
    mutationFn: () => syncStoreBrandDeals((msg) => setSyncStatus(msg)),
    onSuccess: (result) => {
      console.log('[Deals] Sync done:', result.totalDeals, 'deals from', result.brandsProcessed, 'brands');
      setSyncStatus('');
      void queryClient.invalidateQueries({ queryKey: ['deals'] });
      void queryClient.invalidateQueries({ queryKey: ['deals-last-sync'] });
      if (result.totalDeals > 0) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (err) => {
      console.log('[Deals] Sync error:', err);
      setSyncStatus('');
    },
  });

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => {
    const checkAndSync = async () => {
      const needsSync = await shouldSync();
      if (needsSync) {
        console.log('[Deals] Auto-syncing store brand deals...');
        syncMutation.mutate();
      }
    };
    void checkAndSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dealTrustMap = useMemo(() => {
    if (!deals) return new Map<string, DealTrustInfo>();
    const map = new Map<string, DealTrustInfo>();
    deals.forEach((d) => {
      map.set(d.id, computeDealTrust(d));
    });
    return map;
  }, [deals]);

  const sortedDeals = useMemo(() => {
    if (!deals) return [];

    const activeDeals = deals.filter((d) => {
      if (d.is_active === false) return false;
      const trust = dealTrustMap.get(d.id);
      if (trust?.isExpired) return false;
      if (trust?.isStale && trust.level === 'unverified') return false;
      return true;
    });

    const sorted = [...activeDeals].sort((a, b) => {
      const aTrust = dealTrustMap.get(a.id);
      const bTrust = dealTrustMap.get(b.id);
      const aScore = aTrust?.score ?? 0;
      const bScore = bTrust?.score ?? 0;
      if (Math.abs(aScore - bScore) > 15) return bScore - aScore;

      const aVerified = isVerifiedDeal(a) ? 1 : 0;
      const bVerified = isVerifiedDeal(b) ? 1 : 0;
      if (aVerified !== bVerified) return bVerified - aVerified;

      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    console.log('[Deals] Sorted', sorted.length, 'deals by trust score (filtered', deals.length - sorted.length, 'expired/stale)');
    return sorted;
  }, [deals, dealTrustMap]);

  const navigateToDealDetail = useCallback((deal: VerifiedDealRow) => {
    const params: Record<string, string> = {
      dealId: deal.id,
      title: deal.title ?? '',
      storeName: deal.store_name ?? '',
      imageUrl: deal.photo_url ?? '',
      description: deal.description ?? '',
      category: deal.category ?? '',
      city: deal.city ?? '',
      createdAt: deal.created_at ?? '',
      sourceType: deal.source_type ?? '',
    };
    if (deal.price !== null && deal.price !== undefined) params.price = String(deal.price);
    if (deal.original_price !== null && deal.original_price !== undefined) params.originalPrice = String(deal.original_price);
    if (deal.savings_amount !== null && deal.savings_amount !== undefined) params.savingsAmount = String(deal.savings_amount);
    if (deal.savings_percent !== null && deal.savings_percent !== undefined) params.savingsPercent = String(deal.savings_percent);
    if (deal.source_url) params.sourceUrl = deal.source_url;
    if (deal.is_verified) params.isVerified = 'true';
    if (deal.last_verified) params.lastVerified = deal.last_verified;
    if (deal.brand_slug) params.brandSlug = deal.brand_slug;
    if (deal.deal_expires_at) params.dealExpiresAt = deal.deal_expires_at;
    router.push({ pathname: '/post-detail', params });
  }, [router]);

  const openDealDetail = useCallback((deal: VerifiedDealRow) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateToDealDetail(deal);
  }, [navigateToDealDetail]);

  const dealKeyExtractor = useCallback((item: VerifiedDealRow) => item.id, []);

  const renderDealItem = useCallback(({ item, index }: { item: VerifiedDealRow; index: number }) => {
    const adElement = index > 0 && index % 6 === 0
      ? <AdMobBanner key={`admob-${index}`} />
      : null;

    return (
      <>
        {adElement}
        <DealCard
          deal={item}
          timeAgo={getDealDisplayTime(item)}
          trust={dealTrustMap.get(item.id) ?? computeDealTrust(item)}
          onPress={() => openDealDetail(item)}
        />
      </>
    );
  }, [dealTrustMap, openDealDetail]);

  const listFooter = useMemo(() => <View style={{ height: 20 }} />, []);

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <Animated.View style={[styles.headerInner, { opacity: fadeAnim }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.dealsBadge}>
                <Tag size={13} color="#FFFFFF" strokeWidth={1.8} />
              </View>
              <Text style={styles.headerTitle}>Finds</Text>
            </View>
            <Pressable
              onPress={() => router.push('/post-deal')}
              style={({ pressed }) => [styles.postDealIconBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
              testID="post-deal-header-btn"
            >
              <Camera size={20} color="#1B5E3B" strokeWidth={1.8} />
            </Pressable>
          </View>
          {syncMutation.isPending && syncStatus ? (
            <View style={styles.syncStatusRow}>
              <ActivityIndicator size="small" color="#1B5E3B" />
              <Text style={styles.syncStatusText}>{syncStatus}</Text>
            </View>
          ) : null}
        </Animated.View>
      </View>

      {isLoading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="large" color="#1B5E3B" />
          <Text style={styles.stateText}>Loading finds...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateWrap}>
          <View style={styles.errorIcon}>
            <AlertCircle size={22} color={Colors.destructive} strokeWidth={1.5} />
          </View>
          <Text style={styles.stateTitle}>Couldn't load finds</Text>
          <Text style={styles.stateText}>Pull down to refresh</Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]}
            onPress={() => void refetch()}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : sortedDeals.length === 0 ? (
        <View style={styles.stateWrap}>
          <View style={styles.emptyIcon}>
            <ShoppingBag size={22} color="#1B5E3B" strokeWidth={1.5} />
          </View>
          <Text style={styles.stateTitle}>No finds yet</Text>
          <Text style={styles.stateText}>Check back soon for verified savings</Text>
        </View>
      ) : (
        <FlatList
          data={sortedDeals}
          keyExtractor={dealKeyExtractor}
          renderItem={renderDealItem}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS !== 'web'}
          maxToRenderPerBatch={6}
          initialNumToRender={5}
          windowSize={7}
          updateCellsBatchingPeriod={50}
          getItemLayout={undefined}
          ListFooterComponent={listFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
                if (Platform.OS !== 'web' && !syncMutation.isPending) {
                  syncMutation.mutate();
                }
              }}
              tintColor="#1B5E3B"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  headerInner: {},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dealsBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#1B7A45',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#00C853',
    letterSpacing: -0.2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  syncStatusText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#1B7A45',
  },
  scrollContent: {
    paddingTop: 4,
  },
  flatListContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },

  postDealIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1B7A4512',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedContent: {
    paddingHorizontal: 16,
  },
  stateWrap: {
    alignItems: 'center',
    paddingVertical: 44,
    gap: 6,
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    marginTop: 4,
  },
  stateText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400' as const,
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF3B3010',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1B7A4510',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#1B7A45',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },

  dealsList: {
    gap: 8,
  },


  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  dealCardExpired: {
    opacity: 0.5,
  },
  cardPhotoWrap: {
    position: 'relative' as const,
    width: '100%',
    height: CARD_PHOTO_HEIGHT,
    backgroundColor: '#F2F2F7',
  },
  photoGradientOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'transparent',
  },
  cardPhoto: {
    width: '100%',
    height: '100%',
  },
  savingsOverlay: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  savingsOverlayText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  cardContent: {
    padding: 14,
    paddingTop: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  _userBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userBadgeText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    marginRight: 10,
  },
  storeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    flex: 1,
    letterSpacing: -0.2,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  priceTag: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.6,
  },
  priceTagGreen: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1B7A45',
    letterSpacing: -0.3,
  },
  seeDealPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1B7A450A',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  seeDealText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#1B7A45',
  },
  originalPrice: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#8E8E93',
    textDecorationLine: 'line-through' as const,
    marginTop: 1,
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    lineHeight: 21,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  dealDesc: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  catChipText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  trustPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  trustPillText: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  freshDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '400' as const,
  },
  cardSourceBadge: {
    position: 'absolute' as const,
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cardSourceBadgeVerified: {
    backgroundColor: 'rgba(27,94,59,0.85)',
  },
  cardSourceBadgeCommunity: {
    backgroundColor: 'rgba(239,68,68,0.75)',
  },
  cardSourceText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  communityBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  communityBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  pendingBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#D97706',
    letterSpacing: 0.1,
  },
  savingsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start' as const,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  savingsInlineText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#059669',
  },
  savingsPercentPill: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  savingsPercentPillText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  expiredBanner: {
    marginTop: 6,
    backgroundColor: '#FF3B3010',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
    alignSelf: 'flex-start' as const,
  },
  expiredBannerText: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: Colors.destructive,
  },
  productThumbWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    overflow: 'hidden' as const,
    backgroundColor: '#F2F2F7',
  },
  productThumb: {
    width: 36,
    height: 36,
  },
  posterAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden' as const,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  posterAvatar: {
    width: '100%' as const,
    height: '100%' as const,
    borderRadius: 18,
  },
  storeNameCol: {
    flex: 1,
    justifyContent: 'center' as const,
  },
  posterName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
    lineHeight: 16,
  },
  storeNameSmall: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#8E8E93',
    lineHeight: 14,
  },
});
