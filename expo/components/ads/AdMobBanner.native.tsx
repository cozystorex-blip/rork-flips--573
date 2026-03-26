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
} catch (e) {
  console.warn('[AdMobBanner] react-native-google-mobile-ads not available:', e);
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
    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAdModuleAvailable() || !BannerAd) return;
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
        console.log('[AdMobBanner] Max retries reached, hiding banner');
      }
      return next;
    });

    setAdError(true);
  }, []);

  if (isPremium) return null;
  if (!isAdModuleAvailable() || !BannerAd) return null;
  if (!sdkReady) return null;
  if (adError && retryCount >= MAX_RETRY_ATTEMPTS) return null;
  if (adError) return null;

  const unitId = getBannerUnitId();
  console.log('[AdMobBanner] Rendering banner with unit ID:', unitId);

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
    marginVertical: 8,
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
