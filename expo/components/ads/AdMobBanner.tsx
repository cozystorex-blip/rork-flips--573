import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { Megaphone, ExternalLink, X, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePremium } from '@/contexts/PremiumContext';

const AD_PROMOTIONS = [
  {
    headline: 'Save more with Premium',
    body: 'Unlimited scan history, no ads, and exclusive deal alerts.',
    cta: 'Go Premium',
    type: 'premium' as const,
    accent: '#1B7A45',
    bgGradientStart: '#F0FDF4',
    bgGradientEnd: '#DCFCE7',
    iconBg: '#1B7A45',
  },
  {
    headline: 'Never miss a deal',
    body: 'Get notified when prices drop at your favorite stores.',
    cta: 'Learn More',
    type: 'premium' as const,
    accent: '#0369A1',
    bgGradientStart: '#F0F9FF',
    bgGradientEnd: '#E0F2FE',
    iconBg: '#0369A1',
  },
  {
    headline: 'Scan smarter, save bigger',
    body: 'Our AI finds the best value — upgrade for unlimited scans.',
    cta: 'Upgrade Now',
    type: 'premium' as const,
    accent: '#7C3AED',
    bgGradientStart: '#F5F3FF',
    bgGradientEnd: '#EDE9FE',
    iconBg: '#7C3AED',
  },
];

export default function AdMobBanner() {
  const { isPremium } = usePremium();
  const [dismissed, setDismissed] = useState(false);
  const [promoIndex] = useState(() => Math.floor(Math.random() * AD_PROMOTIONS.length));
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
      toValue: 0.98,
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

  const promo = AD_PROMOTIONS[promoIndex];

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
        style={[styles.card, { backgroundColor: promo.bgGradientStart }]}
        testID="ad-banner"
      >
        <View style={[styles.accentStripe, { backgroundColor: promo.accent }]} />

        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={[styles.iconCircle, { backgroundColor: promo.iconBg }]}>
              {promo.accent === '#7C3AED' ? (
                <Sparkles size={14} color="#FFFFFF" strokeWidth={2} />
              ) : (
                <Megaphone size={14} color="#FFFFFF" strokeWidth={2} />
              )}
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.headline, { color: promo.accent }]}>{promo.headline}</Text>
              <Text style={styles.body}>{promo.body}</Text>
            </View>
            <Pressable
              onPress={handleDismiss}
              hitSlop={12}
              style={styles.closeBtn}
              testID="ad-dismiss-btn"
            >
              <X size={14} color="#AEAEB2" strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.adLabel}>
              <Text style={styles.adLabelText}>Sponsored</Text>
            </View>
            <Pressable
              onPress={handlePress}
              style={({ pressed }) => [
                styles.ctaBtn,
                { backgroundColor: promo.accent },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.ctaText}>{promo.cta}</Text>
              <ExternalLink size={11} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
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
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  accentStripe: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  textCol: {
    flex: 1,
    gap: 3,
  },
  headline: {
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
    fontWeight: '400' as const,
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adLabel: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 7,
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
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
