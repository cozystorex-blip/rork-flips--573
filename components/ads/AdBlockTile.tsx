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
    label: 'Premium',
    accent: '#1B7A45',
    bg: '#F0FDF4',
  },
  {
    icon: 'tag' as const,
    label: 'Deals',
    accent: '#0369A1',
    bg: '#F0F9FF',
  },
  {
    icon: 'zap' as const,
    label: 'Upgrade',
    accent: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    icon: 'megaphone' as const,
    label: 'Sponsored',
    accent: '#D97706',
    bg: '#FFFBEB',
  },
];

interface AdBlockTileProps {
  size: number;
  index?: number;
}

const IconMap = {
  sparkles: Sparkles,
  tag: Tag,
  zap: Zap,
  megaphone: Megaphone,
} as const;

function AdBlockTile({ size, index = 0 }: AdBlockTileProps) {
  const { isPremium } = usePremium();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const variant = AD_VARIANTS[index % AD_VARIANTS.length];
  const IconComponent = IconMap[variant.icon];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      delay: 100,
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
    <Animated.View style={[{ opacity: fadeAnim }]}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          tileStyles.tile,
          { width: size, height: size, backgroundColor: variant.bg },
          pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        ]}
        testID={`ad-block-tile-${index}`}
      >
        <View style={[tileStyles.iconWrap, { backgroundColor: variant.accent }]}>
          <IconComponent size={16} color="#FFFFFF" strokeWidth={2} />
        </View>
        <Text style={[tileStyles.label, { color: variant.accent }]} numberOfLines={1}>
          {variant.label}
        </Text>
        <View style={tileStyles.adBadge}>
          <Text style={tileStyles.adBadgeText}>Ad</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(AdBlockTile);

const tileStyles = StyleSheet.create({
  tile: {
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  adBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  adBadgeText: {
    fontSize: 8,
    fontWeight: '600' as const,
    color: '#8E8E93',
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
});
