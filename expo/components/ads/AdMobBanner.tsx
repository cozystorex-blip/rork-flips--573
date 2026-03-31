import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { usePremium } from '@/contexts/PremiumContext';

const AD_CLICK_URL = 'https://admob.google.com/home/';

export default function AdMobBanner() {
  const { isPremium } = usePremium();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [fadeAnim]);

  const handleAdPress = useCallback(async () => {
    try {
      console.log('[AdMobBanner] Ad clicked');
      await Linking.openURL(AD_CLICK_URL);
    } catch (e) {
      console.warn('[AdMobBanner] Could not open ad URL:', e);
    }
  }, []);

  if (isPremium) return null;

  return (
    <Animated.View
      style={[styles.wrapper, { opacity: fadeAnim }]}
      testID="ad-banner"
    >
      <TouchableOpacity
        style={styles.container}
        onPress={handleAdPress}
        activeOpacity={0.85}
        accessibilityRole="link"
        accessibilityLabel="Advertisement"
      >
        <View style={styles.inner}>
          <Text style={styles.adText}>Sponsored</Text>
          <Text style={styles.adSubtext}>Tap to learn more</Text>
        </View>
        <View style={styles.adLabel}>
          <Text style={styles.adLabelText}>Ad</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
    alignItems: 'center',
  },
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  inner: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  adText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8E8E93',
    letterSpacing: 0.3,
  },
  adSubtext: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#AEAEB2',
    marginTop: 2,
  },
  adLabel: {
    position: 'absolute' as const,
    top: 4,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adLabelText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#AEAEB2',
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
});
