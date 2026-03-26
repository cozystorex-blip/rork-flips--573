import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Pressable,
  Linking,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  Clock,
  Tag,
  User,
  Store,
  MapPin,
  TrendingDown,
  ExternalLink,
  BadgeCheck,
  Flame,
  Share2,
  ShieldCheck,
  DollarSign,
  CircleAlert,
  CalendarClock,
  RefreshCw,
  CheckCircle,
  Copy,
  LinkIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Colors from '@/constants/colors';
import { computeDealTrust, type DealTrustInfo } from '@/services/dealIngestionService';
import { classifySourceUrl } from '@/utils/sourceUrlQuality';
import AdMobBanner from '@/components/ads/AdMobBanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return '';
  }
}

function formatFullDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function getVerificationSourceLabel(sourceType: string, brandSlug: string): string {
  if (!sourceType && !brandSlug) return 'Verified';

  const brandMap: Record<string, string> = {
    'home-depot': 'Home Depot Weekly Deals',
    'lowes': "Lowe's Deal of the Day",
    'ace-hardware': 'Ace Hardware Savings',
    'harbor-freight': 'Harbor Freight Coupons',
    'menards': 'Menards Tool Deals',
    'tractor-supply': 'Tractor Supply Deals',
    'northern-tool': 'Northern Tool Specials',
    'walmart-hardware': 'Walmart Home Improvement',
  };

  if (brandSlug && brandMap[brandSlug]) {
    return brandMap[brandSlug];
  }

  if (sourceType === 'store_brand') return 'Store Brand Ad';
  if (sourceType === 'user') return 'Community Report';
  return 'Verified Source';
}

function getFreshnessLabel(lastVerified: string | undefined): { label: string; color: string; bgColor: string } {
  if (!lastVerified) return { label: 'Recently checked', color: '#636366', bgColor: '#F2F2F7' };

  const diffMs = Date.now() - new Date(lastVerified).getTime();
  const diffHours = diffMs / 3600000;

  if (diffHours < 1) return { label: 'Checked just now', color: '#059669', bgColor: '#ECFDF5' };
  if (diffHours < 6) return { label: `Checked ${Math.floor(diffHours)}h ago`, color: '#059669', bgColor: '#ECFDF5' };
  if (diffHours < 24) return { label: `Checked ${Math.floor(diffHours)}h ago`, color: '#D97706', bgColor: '#FFFBEB' };
  if (diffHours < 48) return { label: 'Checked yesterday', color: '#D97706', bgColor: '#FFFBEB' };
  return { label: `Checked ${Math.floor(diffHours / 24)}d ago`, color: '#DC2626', bgColor: '#FEF2F2' };
}

function getTrustLevelDisplay(trust: DealTrustInfo): { label: string; color: string; bgColor: string; icon: 'shield' | 'alert' | 'info' } {
  switch (trust.level) {
    case 'high':
      return { label: 'Highly Trusted', color: '#166534', bgColor: '#F0FDF4', icon: 'shield' };
    case 'medium':
      return { label: 'Likely Accurate', color: '#92400E', bgColor: '#FFFBEB', icon: 'info' };
    case 'low':
      return { label: 'Estimated Deal', color: '#9A3412', bgColor: '#FFF7ED', icon: 'alert' };
    default:
      return { label: 'Unverified', color: '#6B7280', bgColor: '#F9FAFB', icon: 'alert' };
  }
}

function getExpiryLabel(expiresAt: string | undefined): { label: string; isExpired: boolean; isExpiringSoon: boolean } | null {
  if (!expiresAt) return null;
  const expiryTime = new Date(expiresAt).getTime();
  const now = Date.now();
  if (expiryTime < now) return { label: 'This deal has expired', isExpired: true, isExpiringSoon: false };
  const hoursLeft = (expiryTime - now) / 3600000;
  if (hoursLeft < 24) return { label: `Expires in ${Math.floor(hoursLeft)}h`, isExpired: false, isExpiringSoon: true };
  const daysLeft = Math.floor(hoursLeft / 24);
  if (daysLeft <= 3) return { label: `Expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`, isExpired: false, isExpiringSoon: true };
  return { label: `Valid for ${daysLeft} more days`, isExpired: false, isExpiringSoon: false };
}

export default function PostDetailScreen() {
  const params = useLocalSearchParams<{
    imageUrl?: string;
    description?: string;
    title?: string;
    tagLeft?: string;
    createdAt?: string;
    userName?: string;
    dealId?: string;
    storeName?: string;
    category?: string;
    city?: string;
    price?: string;
    originalPrice?: string;
    savingsAmount?: string;
    savingsPercent?: string;
    sourceType?: string;
    sourceUrl?: string;
    isVerified?: string;
    lastVerified?: string;
    brandSlug?: string;
    dealExpiresAt?: string;
  }>();
  const _router = useRouter();

  const imageUrl = params.imageUrl ?? '';
  const description = params.description ?? '';
  const title = params.title ?? '';
  const tagLeft = params.tagLeft ?? '';
  const createdAt = params.createdAt ?? '';
  const userName = params.userName ?? '';
  const storeName = params.storeName ?? '';
  const category = params.category ?? '';
  const city = params.city ?? '';
  const price = params.price ? Number.parseFloat(params.price) : null;
  const originalPrice = params.originalPrice ? Number.parseFloat(params.originalPrice) : null;
  const savingsAmount = params.savingsAmount ? Number.parseFloat(params.savingsAmount) : null;
  const savingsPercent = params.savingsPercent ? Number.parseFloat(params.savingsPercent) : null;
  const sourceType = params.sourceType ?? '';
  const sourceUrl = params.sourceUrl ?? '';
  const isVerified = params.isVerified === 'true';
  const lastVerified = params.lastVerified ?? '';
  const brandSlug = params.brandSlug ?? '';
  const dealExpiresAt = params.dealExpiresAt ?? '';


  const isDeal = !!(storeName || price !== null || params.dealId);

  const dealTrust = useMemo(() => {
    if (!isDeal) return null;
    return computeDealTrust({
      is_verified: isVerified,
      source_type: sourceType,
      source_url: sourceUrl,
      last_verified: lastVerified || undefined,
      created_at: createdAt || undefined,
      deal_expires_at: dealExpiresAt || undefined,
      price,
      store_name: storeName,
      brand_slug: brandSlug,
    });
  }, [isDeal, isVerified, sourceType, sourceUrl, lastVerified, createdAt, dealExpiresAt, price, storeName, brandSlug]);

  const trustDisplay = useMemo(() => {
    if (!dealTrust) return null;
    return getTrustLevelDisplay(dealTrust);
  }, [dealTrust]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 100, friction: 12 }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const computedSavings = useMemo(() => {
    if (savingsAmount && savingsAmount > 0) {
      return { amount: savingsAmount, percent: savingsPercent };
    }
    if (originalPrice && price && originalPrice > price) {
      const saved = originalPrice - price;
      const pct = Math.round((saved / originalPrice) * 100);
      return { amount: saved, percent: pct };
    }
    return null;
  }, [price, originalPrice, savingsAmount, savingsPercent]);

  const verificationSource = useMemo(() => {
    return getVerificationSourceLabel(sourceType, brandSlug);
  }, [sourceType, brandSlug]);

  const freshness = useMemo(() => {
    return getFreshnessLabel(lastVerified || undefined);
  }, [lastVerified]);

  const expiry = useMemo(() => {
    return getExpiryLabel(dealExpiresAt || undefined);
  }, [dealExpiresAt]);

  const handleShare = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const isValidUrl = useMemo(() => {
    if (!sourceUrl) return false;
    try {
      const u = new URL(sourceUrl);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }, [sourceUrl]);

  const sourceQuality = useMemo(() => {
    return classifySourceUrl(sourceUrl, storeName);
  }, [sourceUrl, storeName]);

  const handleOpenSource = () => {
    if (sourceUrl && isValidUrl) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void Linking.openURL(sourceUrl).catch(() => {
        console.log('[PostDetail] Failed to open URL:', sourceUrl);
      });
    }
  };

  const handleCopyLink = async () => {
    if (sourceUrl) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      try {
        await Clipboard.setStringAsync(sourceUrl);
        console.log('[PostDetail] Link copied to clipboard');
      } catch (err) {
        console.log('[PostDetail] Failed to copy link:', err);
      }
    }
  };

  if (isDeal) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: '',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#1C1C1E',
            headerShadowVisible: false,
          }}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces
        >
          {imageUrl ? (
            <Animated.View style={[styles.dealImageWrap, { opacity: fadeAnim }]}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.dealImage}
                contentFit="cover"
                transition={250}
              />
              {computedSavings && (
                <View style={styles.dealSavingsOverlay}>
                  <TrendingDown size={12} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.dealSavingsOverlayText}>
                    Save ${computedSavings.amount.toFixed(2)}
                  </Text>
                  {computedSavings.percent && computedSavings.percent > 0 && (
                    <View style={styles.dealSavingsPctBadge}>
                      <Text style={styles.dealSavingsPctText}>{computedSavings.percent}%</Text>
                    </View>
                  )}
                </View>
              )}
              <View style={styles.dealTypeBadge}>
                {isVerified ? (
                  <>
                    <BadgeCheck size={10} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.dealTypeBadgeText}>Verified Deal</Text>
                  </>
                ) : sourceType === 'user' ? (
                  <>
                    <Flame size={10} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.dealTypeBadgeText}>Community</Text>
                  </>
                ) : (
                  <>
                    <Tag size={10} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.dealTypeBadgeText}>Deal</Text>
                  </>
                )}
              </View>
            </Animated.View>
          ) : null}

          <Animated.View
            style={[
              styles.dealContentSection,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {isVerified ? (
              <View style={styles.verifiedHeroBanner}>
                <View style={styles.verifiedHeroLeft}>
                  <View style={styles.verifiedHeroIcon}>
                    <ShieldCheck size={16} color="#1B5E3B" strokeWidth={2} />
                  </View>
                  <View style={styles.verifiedHeroTextWrap}>
                    <Text style={styles.verifiedHeroTitle}>Verified Deal</Text>
                    <Text style={styles.verifiedHeroSub}>{verificationSource}</Text>
                  </View>
                </View>
                <View style={[styles.freshnessPill, { backgroundColor: freshness.bgColor }]}>
                  <RefreshCw size={9} color={freshness.color} strokeWidth={2} />
                  <Text style={[styles.freshnessText, { color: freshness.color }]}>{freshness.label}</Text>
                </View>
              </View>
            ) : dealTrust && trustDisplay && dealTrust.level !== 'unverified' ? (
              <View style={[styles.trustScoreBanner, { backgroundColor: trustDisplay.bgColor }]}>
                <View style={styles.trustScoreLeft}>
                  {trustDisplay.icon === 'info' ? (
                    <CircleAlert size={18} color={trustDisplay.color} strokeWidth={1.5} />
                  ) : (
                    <CircleAlert size={18} color={trustDisplay.color} strokeWidth={1.5} />
                  )}
                  <View style={styles.trustScoreTextWrap}>
                    <Text style={[styles.trustScoreTitle, { color: trustDisplay.color }]}>{trustDisplay.label}</Text>
                  </View>
                </View>
                <View style={[styles.freshnessPill, { backgroundColor: freshness.bgColor }]}>
                  <RefreshCw size={9} color={freshness.color} strokeWidth={2} />
                  <Text style={[styles.freshnessText, { color: freshness.color }]}>{freshness.label}</Text>
                </View>
              </View>
            ) : null}

            {expiry && (
              <View style={[
                styles.expiryBanner,
                expiry.isExpired && styles.expiryBannerExpired,
                expiry.isExpiringSoon && !expiry.isExpired && styles.expiryBannerSoon,
              ]}>
                <CalendarClock size={13} color={expiry.isExpired ? '#DC2626' : expiry.isExpiringSoon ? '#D97706' : '#059669'} strokeWidth={1.5} />
                <Text style={[
                  styles.expiryText,
                  { color: expiry.isExpired ? '#DC2626' : expiry.isExpiringSoon ? '#92400E' : '#065F46' },
                ]}>{expiry.label}</Text>
              </View>
            )}

            <View style={styles.dealStoreRow}>
              <View style={styles.dealStoreIcon}>
                <Store size={14} color="#1B5E3B" strokeWidth={1.8} />
              </View>
              <View style={styles.dealStoreInfo}>
                <Text style={styles.dealStoreName}>{storeName || 'Store'}</Text>
                {city ? (
                  <View style={styles.dealCityRow}>
                    <MapPin size={10} color="#AEAEB2" strokeWidth={1.5} />
                    <Text style={styles.dealCityText}>{city}</Text>
                  </View>
                ) : null}
              </View>
              {createdAt ? (
                <Text style={styles.dealTimeAgo}>{formatDate(createdAt)}</Text>
              ) : null}
            </View>

            <Text style={styles.dealTitleText}>{title || 'Untitled Deal'}</Text>

            {(price !== null || originalPrice !== null) && (
              <View style={styles.dealPriceCard}>
                <View style={styles.dealPriceMain}>
                  {price !== null && (
                    <Text style={styles.dealPriceValue}>${price.toFixed(2)}</Text>
                  )}
                  {originalPrice !== null && originalPrice > 0 && (
                    <Text style={styles.dealOriginalPrice}>${originalPrice.toFixed(2)}</Text>
                  )}
                </View>
                {computedSavings && (
                  <View style={styles.dealSavingsRow}>
                    <View style={styles.dealSavingsBadge}>
                      <TrendingDown size={11} color="#059669" strokeWidth={2} />
                      <Text style={styles.dealSavingsBadgeText}>
                        Save ${computedSavings.amount.toFixed(2)}
                      </Text>
                    </View>
                    {computedSavings.percent && computedSavings.percent > 0 && (
                      <View style={styles.dealSavingsPctInline}>
                        <Text style={styles.dealSavingsPctInlineText}>
                          {computedSavings.percent}% off
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                {isVerified && price !== null && (
                  <View style={styles.priceConfidenceRow}>
                    <CheckCircle size={10} color="#059669" strokeWidth={2} />
                    <Text style={styles.priceConfidenceText}>Price from store ad — may vary by location</Text>
                  </View>
                )}
                {!isVerified && price !== null && (
                  <View style={styles.priceConfidenceRow}>
                    <CircleAlert size={10} color="#D97706" strokeWidth={1.5} />
                    <Text style={[styles.priceConfidenceText, { color: '#92400E' }]}>Community-reported price — verify in store</Text>
                  </View>
                )}
              </View>
            )}

            {description ? (
              <View style={styles.dealDescCard}>
                <Text style={styles.dealDescText}>{description}</Text>
              </View>
            ) : null}

            {isVerified && dealTrust && dealTrust.level === 'high' && (
              <View style={styles.verificationProofCard}>
                <View style={styles.proofHeader}>
                  <ShieldCheck size={14} color="#1B5E3B" strokeWidth={1.8} />
                  <Text style={styles.proofTitle}>Deal verification</Text>
                </View>
                {isVerified && verificationSource ? (
                  <View style={styles.proofItemRow}>
                    <View style={[styles.proofDot, { backgroundColor: '#34D399' }]} />
                    <Text style={styles.proofItemText}>Sourced from <Text style={styles.proofBold}>{verificationSource}</Text></Text>
                  </View>
                ) : null}
                {dealTrust.isStale && (
                  <View style={[styles.proofDisclaimerRow, { borderTopColor: '#FDE68A' }]}>
                    <CircleAlert size={10} color="#D97706" strokeWidth={1.5} />
                    <Text style={[styles.proofDisclaimer, { color: '#92400E' }]}>This deal hasn't been checked recently — verify in store</Text>
                  </View>
                )}
                <View style={styles.proofDisclaimerRow}>
                  <CircleAlert size={10} color="#8E8E93" strokeWidth={1.5} />
                  <Text style={styles.proofDisclaimer}>Prices may vary by location and availability</Text>
                </View>
              </View>
            )}

            <View style={styles.dealMetaCard}>
              {category ? (
                <View style={styles.dealMetaRow}>
                  <Tag size={13} color="#8E8E93" strokeWidth={1.5} />
                  <Text style={styles.dealMetaLabel}>Category</Text>
                  <View style={styles.dealMetaCatPill}>
                    <Text style={styles.dealMetaCatText}>
                      {category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()}
                    </Text>
                  </View>
                </View>
              ) : null}

              {isVerified ? (
                <View style={[styles.dealMetaRow, styles.dealMetaRowBorder]}>
                  <ShieldCheck size={13} color="#1B5E3B" strokeWidth={1.5} />
                  <Text style={styles.dealMetaLabel}>Source</Text>
                  <View style={styles.verifiedSourcePill}>
                    <Text style={styles.verifiedSourceText}>{verificationSource}</Text>
                  </View>
                </View>
              ) : sourceType === 'user' ? (
                <View style={[styles.dealMetaRow, styles.dealMetaRowBorder]}>
                  <User size={13} color="#8E8E93" strokeWidth={1.5} />
                  <Text style={styles.dealMetaLabel}>Posted by</Text>
                  <Text style={styles.dealMetaValue}>{userName || 'Community member'}</Text>
                </View>
              ) : null}

              {createdAt ? (
                <View style={[styles.dealMetaRow, styles.dealMetaRowBorder]}>
                  <Clock size={13} color="#8E8E93" strokeWidth={1.5} />
                  <Text style={styles.dealMetaLabel}>Posted</Text>
                  <Text style={styles.dealMetaValue}>{formatFullDate(createdAt)}</Text>
                </View>
              ) : null}

              {lastVerified && isVerified ? (
                <View style={[styles.dealMetaRow, styles.dealMetaRowBorder]}>
                  <RefreshCw size={13} color="#8E8E93" strokeWidth={1.5} />
                  <Text style={styles.dealMetaLabel}>Last checked</Text>
                  <Text style={styles.dealMetaValue}>{formatFullDate(lastVerified)}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.dealActions}>
              <Pressable
                onPress={handleShare}
                style={({ pressed }) => [styles.dealActionBtn, styles.dealActionPrimary, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              >
                <Share2 size={15} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.dealActionPrimaryText}>Share Deal</Text>
              </Pressable>
            </View>

            {isValidUrl && sourceQuality.showExternalLink ? (
              <View style={styles.storeLinkSection}>
                <Pressable
                  onPress={handleOpenSource}
                  style={({ pressed }) => [styles.externalLinkCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                  testID="deal-source-btn"
                >
                  <View style={styles.externalLinkLeft}>
                    <View style={styles.externalLinkIcon}>
                      <ExternalLink size={14} color="#1B5E3B" strokeWidth={1.8} />
                    </View>
                    <View style={styles.externalLinkTextWrap}>
                      <Text style={styles.externalLinkTitle}>{sourceQuality.label}</Text>
                      <Text style={styles.externalLinkSub} numberOfLines={1}>
                        {sourceQuality.sublabel}
                      </Text>
                    </View>
                  </View>
                  <ExternalLink size={14} color="#AEAEB2" strokeWidth={1.5} />
                </Pressable>
                {sourceQuality.quality === 'category' && (
                  <View style={styles.sourceDisclaimerRow}>
                    <CircleAlert size={10} color="#D97706" strokeWidth={1.5} />
                    <Text style={styles.sourceDisclaimerText}>This links to the store deals page, not the exact product listing</Text>
                  </View>
                )}
                <Pressable
                  onPress={() => void handleCopyLink()}
                  style={({ pressed }) => [styles.copyLinkBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                  testID="deal-copy-link-btn"
                >
                  <Copy size={13} color="#636366" strokeWidth={1.8} />
                  <Text style={styles.copyLinkText}>Copy Link</Text>
                </Pressable>
              </View>
            ) : isDeal ? (
              <View style={styles.linkUnavailableCard}>
                <LinkIcon size={14} color="#AEAEB2" strokeWidth={1.5} />
                <Text style={styles.linkUnavailableText}>
                  {sourceQuality.quality === 'generic'
                    ? 'Source is a general store page — in-app details only'
                    : sourceQuality.quality === 'none'
                    ? 'In-app details only — no external source available'
                    : 'Source link unavailable'}
                </Text>
              </View>
            ) : null}

            {!imageUrl && !price && !computedSavings && (
              <View style={styles.dealTipCard}>
                <DollarSign size={14} color="#1B5E3B" strokeWidth={1.5} />
                <Text style={styles.dealTipText}>
                  Check in store for the latest price on this deal.
                </Text>
              </View>
            )}

            {!isVerified && sourceType === 'user' && (
              <View style={styles.communityNote}>
                <Flame size={12} color="#D97706" strokeWidth={1.5} />
                <Text style={styles.communityNoteText}>
                  This deal was shared by a community member. Verify the price and availability before heading to the store.
                </Text>
              </View>
            )}

            {!isVerified && sourceType !== 'user' && (
              <View style={styles.communityNote}>
                <CircleAlert size={12} color="#D97706" strokeWidth={1.5} />
                <Text style={styles.communityNoteText}>
                  This deal has limited verification. Check price in store before buying.
                </Text>
              </View>
            )}
          </Animated.View>

          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <AdMobBanner />
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    );
  }

  const initials = userName
    ? userName.split(' ').map((w) => w.charAt(0).toUpperCase()).slice(0, 2).join('')
    : '?';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces
      >
        {userName ? (
          <View style={styles.authorRow}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorInitials}>{initials}</Text>
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{userName}</Text>
              {createdAt ? (
                <Text style={styles.authorTime}>{formatDate(createdAt)}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {imageUrl ? (
          <Animated.View style={[styles.imageWrap, { opacity: fadeAnim }]}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={280}
            />
          </Animated.View>
        ) : null}

        <Animated.View
          style={[
            styles.contentSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {(description || title) ? (
            <View style={styles.captionArea}>
              {userName ? (
                <Text style={styles.captionText}>
                  <Text style={styles.captionBoldName}>{userName}</Text>
                  {'  '}
                  {description || title}
                </Text>
              ) : (
                <Text style={styles.captionText}>{description || title}</Text>
              )}
            </View>
          ) : null}

          {tagLeft ? (
            <View style={styles.tagRow}>
              <View style={styles.tagPill}>
                <Tag size={11} color="#1B5E3B" strokeWidth={2} />
                <Text style={styles.tagText}>{tagLeft}</Text>
              </View>
            </View>
          ) : null}

          {createdAt ? (
            <View style={styles.fullDateRow}>
              <Text style={styles.fullDateText}>{formatFullDate(createdAt)}</Text>
            </View>
          ) : null}
        </Animated.View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 11,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1B7A45',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorInitials: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  authorInfo: {
    flex: 1,
    gap: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  authorTime: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '400' as const,
  },
  imageWrap: {
    width: SCREEN_WIDTH,
    aspectRatio: 1,
    backgroundColor: '#F2F2F7',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  contentSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  captionArea: {
    paddingBottom: 8,
  },
  captionText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  captionBoldName: {
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  tagRow: {
    flexDirection: 'row',
    paddingBottom: 10,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1B7A4510',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#1B7A45',
    letterSpacing: 0.3,
  },
  fullDateRow: {
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    paddingVertical: 12,
  },
  fullDateText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '400' as const,
    letterSpacing: 0.1,
  },

  dealImageWrap: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.6,
    backgroundColor: '#F2F2F7',
    position: 'relative' as const,
  },
  dealImage: {
    width: '100%',
    height: '100%',
  },
  dealSavingsOverlay: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  dealSavingsOverlayText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  dealSavingsPctBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  dealSavingsPctText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  dealTypeBadge: {
    position: 'absolute' as const,
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  dealTypeBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  dealContentSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  verifiedHeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  verifiedHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  verifiedHeroIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedHeroTextWrap: {
    flex: 1,
    gap: 1,
  },
  verifiedHeroTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#059669',
    letterSpacing: -0.2,
  },
  verifiedHeroSub: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#16A34A',
  },
  freshnessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freshnessText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },

  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  expiryBannerExpired: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  expiryBannerSoon: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  expiryText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },

  dealStoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  dealStoreIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1B7A4510',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1B7A4518',
  },
  dealStoreInfo: {
    flex: 1,
    gap: 2,
  },
  dealStoreName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  dealCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dealCityText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '400' as const,
  },
  dealTimeAgo: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '400' as const,
  },
  dealTitleText: {
    fontSize: 21,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.4,
    lineHeight: 27,
    marginBottom: 12,
  },
  dealPriceCard: {
    backgroundColor: '#F8FBF9',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D6EFE1',
  },
  dealPriceMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  dealPriceValue: {
    fontSize: 34,
    fontWeight: '700' as const,
    color: '#1B7A45',
    letterSpacing: -1,
  },
  dealOriginalPrice: {
    fontSize: 18,
    fontWeight: '500' as const,
    color: '#8E8E93',
    textDecorationLine: 'line-through' as const,
  },
  dealSavingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  dealSavingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  dealSavingsBadgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#059669',
  },
  dealSavingsPctInline: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  dealSavingsPctInlineText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  priceConfidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0F2E9',
  },
  priceConfidenceText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#065F46',
    flex: 1,
  },
  dealDescCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  dealDescText: {
    fontSize: 14,
    color: '#555558',
    lineHeight: 20,
  },

  trustScoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  trustScoreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  trustScoreTextWrap: {
    flex: 1,
    gap: 1,
  },
  trustScoreTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  trustScoreSub: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  verificationProofCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  proofTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#166534',
    letterSpacing: -0.2,
  },
  proofItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  proofDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#34D399',
    marginTop: 5,
  },
  proofItemText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#374151',
    lineHeight: 18,
    flex: 1,
  },
  proofBold: {
    fontWeight: '600' as const,
    color: '#166534',
  },
  proofDisclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EAEAEF',
  },
  proofDisclaimer: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#86868B',
    flex: 1,
  },

  dealMetaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 0,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dealMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dealMetaRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EAEAEF',
  },
  dealMetaLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#86868B',
    flex: 1,
  },
  dealMetaValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#111113',
    textAlign: 'right' as const,
    maxWidth: '50%',
  },
  dealMetaCatPill: {
    backgroundColor: '#F0F0F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dealMetaCatText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#555558',
  },
  verifiedSourcePill: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  verifiedSourceText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#166534',
  },
  dealActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  dealActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 14,
    borderRadius: 16,
  },
  dealActionPrimary: {
    backgroundColor: '#1B7A45',
    shadowColor: '#1B7A45',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  dealActionPrimaryText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },

  externalLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  externalLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  externalLinkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1B5E3B0C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1B5E3B12',
  },
  externalLinkTextWrap: {
    flex: 1,
    gap: 2,
  },
  externalLinkTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#111113',
    letterSpacing: -0.1,
  },
  externalLinkSub: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#86868B',
  },

  dealTipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginBottom: 14,
  },
  dealTipText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#166534',
    flex: 1,
    lineHeight: 18,
  },

  communityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },
  communityNoteText: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#92400E',
    flex: 1,
    lineHeight: 17,
  },
  storeLinkSection: {
    gap: 8,
    marginBottom: 14,
  },
  copyLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#F2F2F7',
    paddingVertical: 12,
    borderRadius: 12,
  },
  copyLinkText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#636366',
  },
  linkUnavailableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9F9FB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E8ED',
  },
  linkUnavailableText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#AEAEB2',
    flex: 1,
  },
  sourceDisclaimerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sourceDisclaimerText: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
});
