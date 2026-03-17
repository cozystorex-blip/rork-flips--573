import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { ShoppingCart, Tag, ChevronRight, X, Percent } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePremium } from '@/contexts/PremiumContext';

const CHECKOUT_DEALS = [
  {
    headline: 'Weekly Checkout Deals',
    store: 'Aldi',
    item: 'Organic Whole Milk — 1 Gallon',
    price: '$3.29',
    originalPrice: '$4.49',
    savings: 'Save $1.20',
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=300&fit=crop',
    accent: '#0072CE',
    bg: '#EFF6FF',
  },
  {
    headline: 'Flash Sale',
    store: 'Target',
    item: 'Clorox Disinfecting Wipes 75ct',
    price: '$3.99',
    originalPrice: '$5.49',
    savings: 'Save $1.50',
    image: 'https://images.unsplash.com/photo-1584813539806-4f0e1cf1e4fa?w=400&h=300&fit=crop',
    accent: '#CC0000',
    bg: '#FEF2F2',
  },
  {
    headline: 'Clearance Finds',
    store: 'Walmart',
    item: 'Great Value Paper Towels 12pk',
    price: '$7.97',
    originalPrice: '$11.98',
    savings: 'Save 33%',
    image: 'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=400&h=300&fit=crop',
    accent: '#0071DC',
    bg: '#EFF6FF',
  },
  {
    headline: 'Member Deal',
    store: 'Costco',
    item: 'Kirkland Olive Oil — 2L',
    price: '$12.99',
    originalPrice: '$18.49',
    savings: 'Save $5.50',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=300&fit=crop',
    accent: '#E31837',
    bg: '#FEF2F2',
  },
  {
    headline: 'Price Drop',
    store: 'Kroger',
    item: 'Kroger Cage-Free Eggs 18ct',
    price: '$3.49',
    originalPrice: '$5.29',
    savings: 'Save $1.80',
    image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=300&fit=crop',
    accent: '#0068B5',
    bg: '#EFF6FF',
  },
];

interface DealAdCardProps {
  index: number;
}

export default function DealAdCard({ index }: DealAdCardProps) {
  const { isPremium } = usePremium();
  const [dismissed, setDismissed] = useState(false);
  const [dealIdx] = useState(() => (index ?? 0) % CHECKOUT_DEALS.length);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleDismiss = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setDismissed(true));
  }, [fadeAnim]);

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const onPressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [scaleAnim]);

  const onPressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [scaleAnim]);

  if (isPremium || dismissed) return null;

  const deal = CHECKOUT_DEALS[dealIdx];

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.card}
        testID="deal-ad-card"
      >
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: deal.image }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <View style={styles.savingsBadge}>
            <Percent size={10} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.savingsBadgeText}>{deal.savings}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={[styles.storeChip, { backgroundColor: deal.accent + '15' }]}>
              <ShoppingCart size={10} color={deal.accent} strokeWidth={2} />
              <Text style={[styles.storeChipText, { color: deal.accent }]}>{deal.store}</Text>
            </View>
            <Pressable
              onPress={handleDismiss}
              hitSlop={12}
              style={styles.closeBtn}
              testID="deal-ad-dismiss-btn"
            >
              <X size={12} color="#C7C7CC" strokeWidth={2} />
            </Pressable>
          </View>

          <Text style={styles.itemName} numberOfLines={1}>{deal.item}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.salePrice}>{deal.price}</Text>
            <Text style={styles.originalPrice}>{deal.originalPrice}</Text>
            <View style={styles.spacer} />
            <View style={styles.ctaPill}>
              <Tag size={10} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.ctaText}>View Deal</Text>
              <ChevronRight size={10} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </View>

          <View style={styles.adLabelRow}>
            <View style={styles.adLabel}>
              <Text style={styles.adLabelText}>Sponsored</Text>
            </View>
            <Text style={styles.headlineText}>{deal.headline}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  imageWrap: {
    width: '100%',
    height: 140,
    backgroundColor: '#F2F2F7',
    position: 'relative' as const,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  savingsBadge: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  savingsBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  content: {
    padding: 12,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  storeChipText: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  closeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  salePrice: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  originalPrice: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    textDecorationLine: 'line-through' as const,
  },
  spacer: {
    flex: 1,
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1B7A45',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  adLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  adLabel: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adLabelText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#AEAEB2',
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  headlineText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
});
