import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  ActivityIndicator,
  RefreshControl,
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
  Flame,
  ChevronRight,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import Colors, { CategoryColors } from '@/constants/colors';
import type { CategoryType } from '@/types';
import type { VerifiedDealRow } from '@/types';
import { useRouter } from 'expo-router';
import { computeDealTrust, type DealTrustInfo } from '@/services/dealIngestionService';
import { getProductImageUrl } from '@/constants/productImages';
import AdMobBanner from '@/components/ads/AdMobBanner';


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
  console.log('[Deals] Fetching real deals from Supabase only...');
  try {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('source_type', 'user')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.log('[Deals] Supabase error:', error.message);
      return [];
    }
    const deals = (data ?? []) as VerifiedDealRow[];
    const validDeals = deals.filter((d) => {
      if (!d.id) {
        console.log('[Deals] Blocked deal without backend id:', d.title);
        return false;
      }
      return true;
    });
    console.log('[Deals] Fetched', validDeals.length, 'real user-posted deals from Supabase');
    return validDeals;
  } catch (err) {
    console.log('[Deals] Supabase fetch failed:', err);
    return [];
  }
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

function getTrustBadgeConfig(trust: DealTrustInfo): { label: string; color: string } {
  switch (trust.level) {
    case 'high':
      return { label: 'Verified', color: '#34C759' };
    case 'medium':
      return { label: 'Likely Accurate', color: '#FF9500' };
    case 'low':
      return { label: 'Estimate', color: '#FF9500' };
    default:
      return { label: 'Unverified', color: '#8E8E93' };
  }
}

function getFreshnessIndicator(trust: DealTrustInfo): { label: string; color: string } | null {
  if (trust.freshnessHours < 6) return { label: 'Fresh', color: '#34C759' };
  if (trust.freshnessHours < 24) return { label: 'Today', color: '#34C759' };
  if (trust.freshnessHours < 48) return { label: 'Recent', color: '#FF9500' };
  if (trust.isStale) return { label: 'Aging', color: '#FF3B30' };
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

function getDealPoster(_deal: VerifiedDealRow): { name: string; avatar: string } | null {
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

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.dealCard,
        expired && styles.dealCardExpired,
        pressed && styles.dealCardPressed,
      ]}
    >
      {hasPhoto && (
        <View style={styles.cardPhotoWrap}>
          <Image
            source={{ uri: deal.photo_url! }}
            style={styles.cardPhoto}
            contentFit="cover"
            transition={200}
            recyclingKey={deal.id}
          />
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
            <View style={styles.communityBadgeOverlay}>
              <Flame size={10} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.communityBadgeOverlayText}>Community</Text>
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
              <View style={styles.pendingBadge}>
                <Clock size={10} color="#FF9500" strokeWidth={2} />
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
              <View style={styles.storeIcon}>
                <Store size={13} color="#8E8E93" strokeWidth={1.8} />
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
                <DollarSign size={10} color="#34C759" strokeWidth={1.8} />
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
              <View style={styles.catChip}>
                <Text style={[styles.catChipText, { color: catColor }]}>
                  {deal.category.charAt(0).toUpperCase() + deal.category.slice(1).toLowerCase()}
                </Text>
              </View>
            )}
            {!verified && trust.level !== 'unverified' && (
              <Text style={[styles.trustText, { color: trustBadge.color }]}>{trustBadge.label}</Text>
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
                <Clock size={10} color="#636366" strokeWidth={1.5} />
                <Text style={styles.metaText}>{timeAgo}</Text>
              </View>
            ) : null}
            <ChevronRight size={14} color="#48484A" strokeWidth={1.8} />
          </View>
        </View>

        {!hasPhoto && hasSavings && (
          <View style={styles.savingsInline}>
            <TrendingDown size={11} color="#34C759" strokeWidth={2.5} />
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
  );
});

export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();


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
    return rawDeals;
  }, [rawDeals]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [fadeAnim]);

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
    const showAd = index === 2 || (index > 2 && (index - 2) % 5 === 0);

    return (
      <>
        {showAd && <AdMobBanner key={`admob-${index}`} />}
        <DealCard
          deal={item}
          timeAgo={getDealDisplayTime(item)}
          trust={dealTrustMap.get(item.id) ?? computeDealTrust(item)}
          onPress={() => openDealDetail(item)}
        />
      </>
    );
  }, [dealTrustMap, openDealDetail]);

  const listHeader = useMemo(() => <AdMobBanner key="admob-top" />, []);
  const listFooter = useMemo(() => (
    <View>
      <AdMobBanner key="admob-bottom" />
      <View style={{ height: 20 }} />
    </View>
  ), []);

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerInner}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Flips</Text>
            <Pressable
              onPress={() => router.push('/post-deal')}
              style={({ pressed }) => [styles.postDealBtn, pressed && { opacity: 0.6 }]}
              testID="post-deal-header-btn"
            >
              <Tag size={18} color="#34C759" strokeWidth={1.8} />
            </Pressable>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="large" color="#34C759" />
          <Text style={styles.stateText}>Loading finds...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateWrap}>
          <AlertCircle size={28} color="#FF3B30" strokeWidth={1.5} />
          <Text style={styles.stateTitle}>Couldn't load finds</Text>
          <Text style={styles.stateText}>Pull down to refresh</Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}
            onPress={() => void refetch()}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : sortedDeals.length === 0 ? (
        <View style={styles.stateWrap}>
          <ShoppingBag size={28} color="#636366" strokeWidth={1.3} />
          <Text style={styles.stateTitle}>No flips yet</Text>
          <Text style={styles.stateText}>Real flips will appear here once they are posted.</Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}
            onPress={() => router.push('/post-deal')}
          >
            <Text style={styles.retryBtnText}>Post your first flip</Text>
          </Pressable>
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
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                console.log('[Deals] Pull-to-refresh: fetching fresh backend-only data');
                void refetch();
              }}
              tintColor="#34C759"
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
    backgroundColor: '#000000',
  },
  headerBar: {
    backgroundColor: '#000000',
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  headerInner: {},
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  postDealBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatListContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 20,
  },
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 8,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginTop: 4,
  },
  stateText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#34C759',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  dealCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  dealCardExpired: {
    opacity: 0.5,
  },
  dealCardPressed: {
    backgroundColor: '#2C2C2E',
  },
  cardPhotoWrap: {
    position: 'relative' as const,
    width: '100%',
    backgroundColor: '#2C2C2E',
  },
  cardPhoto: {
    width: '100%',
    aspectRatio: 1 / 0.48,
  },
  savingsOverlay: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#34C759',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  savingsOverlayText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  communityBadgeOverlay: {
    position: 'absolute' as const,
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  communityBadgeOverlayText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  cardContent: {
    padding: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  communityBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  communityBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#FF9500',
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
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  storeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    flex: 1,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  priceTag: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#34C759',
    letterSpacing: -0.3,
  },
  priceTagGreen: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#34C759',
  },
  seeDealPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  seeDealText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#34C759',
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
    color: '#FFFFFF',
    lineHeight: 21,
    marginBottom: 4,
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
    borderTopColor: '#38383A',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catChip: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '500' as const,
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
    color: '#636366',
    fontWeight: '400' as const,
  },
  savingsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start' as const,
  },
  savingsInlineText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#34C759',
  },
  savingsPercentPill: {
    backgroundColor: '#34C759',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  savingsPercentPillText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  expiredBanner: {
    marginTop: 6,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start' as const,
  },
  expiredBannerText: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#FF3B30',
  },
  productThumbWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden' as const,
    backgroundColor: '#2C2C2E',
  },
  productThumb: {
    width: 32,
    height: 32,
  },
  posterAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden' as const,
  },
  posterAvatar: {
    width: '100%' as const,
    height: '100%' as const,
    borderRadius: 16,
  },
  storeNameCol: {
    flex: 1,
    justifyContent: 'center' as const,
  },
  posterName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    lineHeight: 16,
  },
  storeNameSmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#8E8E93',
    lineHeight: 14,
  },
});
