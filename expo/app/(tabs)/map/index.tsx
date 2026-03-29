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

function getTrustBadgeConfig(trust: DealTrustInfo): { label: string; color: string; bgColor: string; borderColor: string } {
  switch (trust.level) {
    case 'high':
      return { label: 'Store Verified', color: '#22C55E', bgColor: '#22C55E15', borderColor: '#22C55E33' };
    case 'medium':
      return { label: 'Likely Accurate', color: '#F59E0B', bgColor: '#F59E0B15', borderColor: '#F59E0B33' };
    case 'low':
      return { label: 'Estimate', color: '#F97316', bgColor: '#F9731615', borderColor: '#F9731633' };
    default:
      return { label: 'Unverified', color: '#666666', bgColor: '#66666615', borderColor: '#66666633' };
  }
}

function getFreshnessIndicator(trust: DealTrustInfo): { label: string; color: string } | null {
  if (trust.freshnessHours < 6) return { label: 'Fresh', color: '#22C55E' };
  if (trust.freshnessHours < 24) return { label: 'Today', color: '#22C55E' };
  if (trust.freshnessHours < 48) return { label: 'Recent', color: '#F59E0B' };
  if (trust.isStale) return { label: 'Aging', color: '#EF4444' };
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
                  <Clock size={10} color="#F59E0B" strokeWidth={2} />
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
                  <DollarSign size={10} color="#22C55E" strokeWidth={1.8} />
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
                <View style={[styles.catChip, { backgroundColor: catColor + '15' }]}>
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
                  <Clock size={10} color="#555555" strokeWidth={1.5} />
                  <Text style={styles.metaText}>{timeAgo}</Text>
                </View>
              ) : null}
              <ChevronRight size={14} color="#444444" strokeWidth={1.8} />
            </View>
          </View>

          {!hasPhoto && hasSavings && (
            <View style={styles.savingsInline}>
              <TrendingDown size={11} color="#22C55E" strokeWidth={2.5} />
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
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <Animated.View style={[styles.headerInner, { opacity: fadeAnim }]}>
          <Text style={styles.headerTitle}>Flips</Text>
          <Text style={styles.headerSubtitle}>Discover and share deals</Text>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft} />
            <Pressable
              onPress={() => router.push('/post-deal')}
              style={({ pressed }) => [styles.postDealIconBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
              testID="post-deal-header-btn"
            >
              <Tag size={20} color="#22C55E" strokeWidth={1.8} />
            </Pressable>
          </View>
        </Animated.View>
      </View>

      {isLoading ? (
        <View style={styles.stateWrap}>
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text style={styles.stateText}>Loading finds...</Text>
          </View>
        </View>
      ) : error ? (
        <View style={styles.stateWrap}>
          <View style={styles.stateCard}>
            <View style={styles.errorIcon}>
              <AlertCircle size={24} color={Colors.destructive} strokeWidth={1.5} />
            </View>
            <Text style={styles.stateTitle}>Couldn't load finds</Text>
            <Text style={styles.stateText}>Pull down to refresh</Text>
            <Pressable
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              onPress={() => void refetch()}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        </View>
      ) : sortedDeals.length === 0 ? (
        <View style={styles.stateWrap}>
          <View style={styles.stateCard}>
            <View style={styles.emptyIcon}>
              <ShoppingBag size={26} color="#22C55E" strokeWidth={1.5} />
            </View>
            <Text style={styles.stateTitle}>No flips yet</Text>
            <Text style={styles.stateText}>Real flips will appear here once they are posted.</Text>
            <Pressable
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              onPress={() => router.push('/post-deal')}
            >
              <Text style={styles.retryBtnText}>Post your first flip</Text>
            </Pressable>
          </View>
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
              tintColor="#22C55E"
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
    backgroundColor: '#0A0A0A',
  },
  headerBar: {
    backgroundColor: '#0A0A0A',
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
  },
  headerInner: {},
  headerTitle: {
    fontSize: 34,
    fontWeight: '900' as const,
    color: '#F5F5F5',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#22C55E',
    marginTop: 3,
    letterSpacing: 0.2,
    textTransform: 'uppercase' as const,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
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
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#1A1A1A',
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
    color: '#22C55E',
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
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#22C55E18',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22C55E33',
  },
  feedContent: {
    paddingHorizontal: 16,
  },
  stateWrap: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 0,
  },
  stateCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  stateTitle: {
    fontSize: 19,
    fontWeight: '800' as const,
    color: '#F5F5F5',
    marginTop: 14,
    letterSpacing: -0.3,
  },
  stateText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '400' as const,
    textAlign: 'center' as const,
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  errorIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#EF444418',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#22C55E18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBtn: {
    marginTop: 18,
    backgroundColor: '#22C55E',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  dealsList: {
    gap: 8,
  },


  dealCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 14,
  },
  dealCardExpired: {
    opacity: 0.5,
  },
  cardPhotoWrap: {
    position: 'relative' as const,
    width: '100%',
    height: CARD_PHOTO_HEIGHT,
    backgroundColor: '#111111',
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
    backgroundColor: '#22C55E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
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
    backgroundColor: '#22C55E',
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
    color: '#666666',
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
    fontWeight: '700' as const,
    color: '#F5F5F5',
    flex: 1,
    letterSpacing: -0.2,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  priceTag: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#F5F5F5',
    letterSpacing: -0.6,
  },
  priceTagGreen: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#22C55E',
    letterSpacing: -0.3,
  },
  seeDealPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#22C55E18',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  seeDealText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#22C55E',
  },
  originalPrice: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#666666',
    textDecorationLine: 'line-through' as const,
    marginTop: 1,
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#F5F5F5',
    lineHeight: 21,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  dealDesc: {
    fontSize: 13,
    color: '#666666',
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
    borderTopColor: '#2A2A2A',
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
    color: '#555555',
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
    backgroundColor: 'rgba(34,197,94,0.85)',
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
    backgroundColor: '#F59E0B18',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#F59E0B33',
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#F59E0B',
    letterSpacing: 0.1,
  },
  savingsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#22C55E15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start' as const,
    borderWidth: 1,
    borderColor: '#22C55E33',
  },
  savingsInlineText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#22C55E',
  },
  savingsPercentPill: {
    backgroundColor: '#22C55E',
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
    backgroundColor: '#EF444418',
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
    backgroundColor: '#111111',
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
    borderColor: '#2A2A2A',
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
    color: '#F5F5F5',
    letterSpacing: -0.2,
    lineHeight: 16,
  },
  storeNameSmall: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#666666',
    lineHeight: 14,
  },
});
