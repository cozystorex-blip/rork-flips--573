import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { Megaphone, Sparkles, Tag, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePremium } from '@/contexts/PremiumContext';

const AD_VARIANTS = [
  {
    icon: 'sparkles' as const,
    headline: 'Go Premium',
    body: 'No ads, unlimited scans',
    accent: '#1B7A45',
    bg: '#F0FDF4',
    iconBg: '#1B7A45',
  },
  {
    icon: 'tag' as const,
    headline: 'Deal Alerts',
    body: 'Never miss a price drop',
    accent: '#0369A1',
    bg: '#F0F9FF',
    iconBg: '#0369A1',
  },
  {
    icon: 'zap' as const,
    headline: 'Scan Smarter',
    body: 'Upgrade for full access',
    accent: '#7C3AED',
    bg: '#F5F3FF',
    iconBg: '#7C3AED',
  },
  {
    icon: 'megaphone' as const,
    headline: 'Save More',
    body: 'Exclusive savings inside',
    accent: '#D97706',
    bg: '#FFFBEB',
    iconBg: '#D97706',
  },
];

const IconMap = {
  sparkles: Sparkles,
  tag: Tag,
  zap: Zap,
  megaphone: Megaphone,
} as const;

interface AdProfileCardProps {
  width: number;
  index?: number;
}

function AdProfileCard({ width, index = 0 }: AdProfileCardProps) {
  const { isPremium } = usePremium();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const variant = AD_VARIANTS[index % AD_VARIANTS.length];
  const IconComponent = IconMap[variant.icon];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      delay: 80,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  if (isPremium) return null;

  return (
    <Animated.View style={[{ opacity: fadeAnim, width }]}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          cardStyles.card,
          { backgroundColor: variant.bg },
          pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
        ]}
        testID={`ad-profile-card-${index}`}
      >
        <View style={[cardStyles.heroBg, { backgroundColor: variant.accent + '12' }]}>
          <View style={[cardStyles.iconCircle, { backgroundColor: variant.iconBg }]}>
            <IconComponent size={22} color="#FFFFFF" strokeWidth={2} />
          </View>
        </View>
        <View style={cardStyles.body}>
          <Text style={[cardStyles.headline, { color: variant.accent }]} numberOfLines={1}>
            {variant.headline}
          </Text>
          <Text style={cardStyles.bodyText} numberOfLines={2}>
            {variant.body}
          </Text>
        </View>
        <View style={cardStyles.adBadge}>
          <Text style={cardStyles.adBadgeText}>Sponsored</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(AdProfileCard);

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroBg: {
    width: '100%',
    aspectRatio: 1.22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    paddingHorizontal: 9,
    paddingTop: 5,
    paddingBottom: 7,
    gap: 2,
  },
  headline: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  bodyText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '400' as const,
    lineHeight: 15,
  },
  adBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adBadgeText: {
    fontSize: 8,
    fontWeight: '600' as const,
    color: '#AEAEB2',
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
});
