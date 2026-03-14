import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { getBannerUnitId, isAdsInitialized, onAdsInitialized } from '@/services/adService';
import { usePremium } from '@/contexts/PremiumContext';

export default function AdMobBanner() {
  const { isPremium } = usePremium();
  const [adReady, setAdReady] = useState(false);
  const [adError, setAdError] = useState(false);
  const [sdkReady, setSdkReady] = useState(isAdsInitialized());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAdsInitialized()) {
      setSdkReady(true);
      return;
    }
    const unsub = onAdsInitialized(() => {
      console.log('[AdMobBanner] SDK ready, showing banner');
      setSdkReady(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (adReady) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [adReady, fadeAnim]);

  const handleAdLoaded = useCallback(() => {
    console.log('[AdMobBanner] Banner ad loaded');
    setAdReady(true);
    setAdError(false);
  }, []);

  const handleAdFailed = useCallback((error: Error) => {
    console.log('[AdMobBanner] Banner ad failed:', error.message);
    setAdError(true);
    setAdReady(false);
  }, []);

  if (isPremium) return null;

  if (!sdkReady) {
    return null;
  }

  const unitId = getBannerUnitId();
  console.log('[AdMobBanner] Rendering banner with unit ID:', unitId);

  if (adError) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { opacity: fadeAnim },
      ]}
    >
      <View style={styles.container}>
        <BannerAd
          unitId={unitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdLoaded={handleAdLoaded}
          onAdFailedToLoad={handleAdFailed}
        />
        {adReady && (
          <View style={styles.adLabel}>
            <Text style={styles.adLabelText}>Ad</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
    alignItems: 'center',
  },
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    width: '100%',
    alignItems: 'center',
  },
  adLabel: {
    position: 'absolute' as const,
    top: 4,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
