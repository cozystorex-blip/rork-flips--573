import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { getBannerUnitId, isAdsInitialized, onAdsInitialized, isAdModuleAvailable } from '@/services/adService';
import { usePremium } from '@/contexts/PremiumContext';

let BannerAd: any = null;
let BannerAdSize: any = {};
try {
  const mod = require('react-native-google-mobile-ads');
  BannerAd = mod.BannerAd;
  BannerAdSize = mod.BannerAdSize ?? {};
  console.log('[AdMobBanner] Native BannerAd component loaded');
} catch {
  console.warn('[AdMobBanner] react-native-google-mobile-ads not available — real ads require a production build (EAS/TestFlight)');
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 15000;

export default function AdMobBanner() {
  const { isPremium } = usePremium();
  const [adReady, setAdReady] = useState(false);
  const [adError, setAdError] = useState(false);
  const [sdkReady, setSdkReady] = useState(isAdsInitialized());
  const [retryCount, setRetryCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [fadeAnim]);

  useEffect(() => {
    if (!isAdModuleAvailable() || !BannerAd) {
      console.log('[AdMobBanner] Native SDK not available, showing placeholder');
      return;
    }
    if (isAdsInitialized()) {
      setSdkReady(true);
      return;
    }
    const unsub = onAdsInitialized(() => {
      console.log('[AdMobBanner] SDK ready, showing banner');
      if (mountedRef.current) {
        setSdkReady(true);
      }
    });
    return unsub;
  }, []);

  const handleAdLoaded = useCallback(() => {
    console.log('[AdMobBanner] Banner ad loaded successfully');
    if (mountedRef.current) {
      setAdReady(true);
      setAdError(false);
      setRetryCount(0);
    }
  }, []);

  const handleAdFailed = useCallback((error: Error) => {
    console.log('[AdMobBanner] Banner ad failed:', error.message);
    if (!mountedRef.current) return;
    setAdReady(false);
    setRetryCount((prev) => {
      const next = prev + 1;
      if (next < MAX_RETRY_ATTEMPTS) {
        console.log(`[AdMobBanner] Will retry in ${RETRY_DELAY_MS / 1000}s (attempt ${next}/${MAX_RETRY_ATTEMPTS})`);
        retryTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            console.log('[AdMobBanner] Retrying banner load...');
            setAdError(false);
          }
        }, RETRY_DELAY_MS);
      } else {
        console.log('[AdMobBanner] Max retries reached');
      }
      return next;
    });
    setAdError(true);
  }, []);

  if (isPremium) return null;

  const useNativeSDK = isAdModuleAvailable() && BannerAd;

  if (useNativeSDK) {
    if (!sdkReady) return null;
    if (adError && retryCount >= MAX_RETRY_ATTEMPTS) return null;
    if (adError) return null;

    const unitId = getBannerUnitId();
    console.log('[AdMobBanner] Rendering native banner with unit ID:', unitId);

    return (
      <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]} testID="ad-banner-native">
        <View style={styles.nativeContainer} pointerEvents="box-none">
          <BannerAd
            unitId={unitId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER ?? BannerAdSize.BANNER}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            onAdLoaded={handleAdLoaded}
            onAdFailedToLoad={handleAdFailed}
          />
          {adReady && (
            <View style={styles.adLabel} pointerEvents="none">
              <Text style={styles.adLabelText}>Ad</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[styles.wrapper, { opacity: fadeAnim }]}
      testID="ad-banner-placeholder"
    >
      <View style={styles.container}>
        <View style={styles.placeholderInner}>
          <Text style={styles.placeholderTitle}>Ad Space</Text>
          <Text style={styles.placeholderText}>Real ads appear in production builds</Text>
        </View>
        <View style={styles.adLabel} pointerEvents="none">
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
  nativeContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
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
  placeholderInner: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  placeholderTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8E8E93',
    letterSpacing: 0.2,
  },
  placeholderText: {
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
