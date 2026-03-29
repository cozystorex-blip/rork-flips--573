import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { usePremium } from '@/contexts/PremiumContext';

export default function AdMobBanner() {
  const { isPremium } = usePremium();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  if (isPremium) return null;

  return (
    <Animated.View
      style={[styles.wrapper, { opacity: fadeAnim }]}
      testID="ad-banner"
    >
      <View style={styles.container}>
        <View style={styles.inner}>
          <Text style={styles.adText}>Test Ad</Text>
          <Text style={styles.adSubtext}>Google AdMob Banner</Text>
        </View>
        <View style={styles.adLabel}>
          <Text style={styles.adLabelText}>Ad</Text>
        </View>
      </View>
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
    backgroundColor: '#F0F0F0',
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    color: '#555555',
    letterSpacing: 0.3,
  },
  adSubtext: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#999999',
    marginTop: 2,
  },
  adLabel: {
    position: 'absolute' as const,
    top: 4,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adLabelText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#999999',
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
});
