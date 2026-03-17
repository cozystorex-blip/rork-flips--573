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
import { ShoppingCart, ChevronRight, X, Percent, Tag } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePremium } from '@/contexts/PremiumContext';

const PROFILE_AD_DEALS = [
  {
    store: 'Aldi',
    item: 'Whole Chicken — Fresh',
    price: '$4.89',
    originalPrice: '$7.29',
    savings: 'Save 33%',
    image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&h=220&fit=crop',
    accent: '#0072CE',
  },
  {
    store: 'Target',
    item: 'Bounty Paper Towels 8pk',
    price: '$15.99',
    originalPrice: '$22.49',
    savings: 'Save $6.50',
    image: 'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=400&h=220&fit=crop',
    accent: '#CC0000',
  },
  {
    store: 'Walmart',
    item: 'Great Value Peanut Butter 40oz',
    price: '$3.98',
    originalPrice: '$5.47',
    savings: 'Save 27%',
    image: 'https://images.unsplash.com/photo-1598511757337-fe2cafc31ba0?w=400&h=220&fit=crop',
    accent: '#0071DC',
  },
  {
    store: 'Costco',
    item: 'Rotisserie Chicken',
    price: '$4.99',
    originalPrice: '$7.99',
    savings: 'Save $3.00',
    image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=220&fit=crop',
    accent: '#E31837',
  },
  {
    store: 'Kroger',
    item: 'Kroger Whole Milk Gallon',
    price: '$2.99',
    originalPrice: '$4.49',
    savings: 'Save $1.50',
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=220&fit=crop',
    accent: '#0068B5',
  },
  {
    store: 'Trader Joe\'s',
    item: 'Everything But The Bagel',
    price: '$1.99',
    originalPrice: '$3.49',
    savings: 'Save 43%',
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=220&fit=crop',
    accent: '#B7312C',
  },
];

interface NativeAdCardProps {
  index: number;
}

export default function NativeAdCard({ index }: NativeAdCardProps) {
  const { isPremium } = usePremium();
  const [dismissed, setDismissed] = useState(false);
  const [dealIdx] = useState(() => (index ?? 0) % PROFILE_AD_DEALS.length);
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

  const deal = PROFILE_AD_DEALS[dealIdx];

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
        testID="native-ad-card"
      >
        <View style={styles.imageSection}>
          <Image
            source={{ uri: deal.image }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <View style={styles.savingsPill}>
            <Percent size={9} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.savingsPillText}>{deal.savings}</Text>
          </View>
          <View style={styles.checkoutBadge}>
            <ShoppingCart size={10} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.checkoutBadgeText}>Checkout Deal</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={[styles.storeTag, { backgroundColor: deal.accent + '12' }]}>
              <Text style={[styles.storeTagText, { color: deal.accent }]}>{deal.store}</Text>
            </View>
            <Pressable
              onPress={handleDismiss}
              hitSlop={12}
              style={styles.closeBtn}
              testID="native-ad-dismiss"
            >
              <X size={11} color="#C7C7CC" strokeWidth={2} />
            </Pressable>
          </View>

          <Text style={styles.itemName} numberOfLines={1}>{deal.item}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{deal.price}</Text>
            <Text style={styles.origPrice}>{deal.originalPrice}</Text>
            <View style={styles.spacer} />
            <View style={styles.viewDealBtn}>
              <Tag size={9} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.viewDealText}>View</Text>
              <ChevronRight size={9} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </View>

          <View style={styles.sponsoredRow}>
            <View style={styles.sponsoredPill}>
              <Text style={styles.sponsoredText}>Sponsored</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 4,
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
  imageSection: {
    width: '100%',
    height: 120,
    backgroundColor: '#F2F2F7',
    position: 'relative' as const,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  savingsPill: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  savingsPillText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  checkoutBadge: {
    position: 'absolute' as const,
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  checkoutBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  content: {
    padding: 10,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storeTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  storeTagText: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  closeBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  price: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.4,
  },
  origPrice: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#8E8E93',
    textDecorationLine: 'line-through' as const,
  },
  spacer: {
    flex: 1,
  },
  viewDealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1B7A45',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  viewDealText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  sponsoredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  sponsoredPill: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  sponsoredText: {
    fontSize: 8,
    fontWeight: '600' as const,
    color: '#AEAEB2',
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
});
