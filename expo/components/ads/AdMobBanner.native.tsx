import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Linking,
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

let WebView: any = null;
try {
  WebView = require('react-native-webview').default;
} catch {
  console.warn('[AdMobBanner] react-native-webview not available');
}

const AD_CLIENT = 'ca-pub-3643873601626975';
const IOS_AD_SLOT = '1979589861';
const ANDROID_AD_SLOT = '9727556676';

function getAdSlot(): string {
  if (Platform.OS === 'ios') return IOS_AD_SLOT;
  return ANDROID_AD_SLOT;
}

function buildAdHtml(): string {
  const slot = getAdSlot();
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #F2F2F7; }
    .ad-wrap { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 50px; padding: 4px 0; }
    ins.adsbygoogle { display: block; width: 320px; height: 50px; }
  </style>
</head>
<body>
  <div class="ad-wrap">
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}" crossorigin="anonymous"></script>
    <ins class="adsbygoogle"
         style="display:inline-block;width:320px;height:50px"
         data-ad-client="${AD_CLIENT}"
         data-ad-slot="${slot}"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>
</body>
</html>`;
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
      <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
        <View style={styles.container} pointerEvents="box-none">
          <BannerAd
            unitId={unitId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
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

  if (WebView) {
    return (
      <Animated.View
        style={[styles.wrapper, { opacity: fadeAnim }]}
        testID="ad-banner-webview"
      >
        <View style={styles.container}>
          <View style={styles.webviewWrap}>
            <WebView
              source={{ html: buildAdHtml() }}
              style={styles.webview}
              scrollEnabled={false}
              bounces={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsInlineMediaPlayback={true}
              mixedContentMode="always"
              originWhitelist={['*']}
              setSupportMultipleWindows={false}
              onShouldStartLoadWithRequest={(request: { url: string }) => {
                const url = request.url;
                if (
                  url === 'about:blank' ||
                  url.includes('pagead2.googlesyndication.com') ||
                  url.includes('googleads') ||
                  url.includes('doubleclick.net') ||
                  url.includes('google.com/aclk') ||
                  url.includes('tpc.googlesyndication.com') ||
                  url.startsWith('data:')
                ) {
                  return true;
                }
                if (url.startsWith('http')) {
                  console.log('[AdMobBanner] Ad clicked, opening externally:', url);
                  void Linking.openURL(url);
                  return false;
                }
                return true;
              }}
              onError={(e: any) => console.warn('[AdMobBanner] WebView error:', e.nativeEvent?.description)}
              onLoadEnd={() => console.log('[AdMobBanner] WebView ad loaded')}
            />
          </View>
          <View style={styles.adLabel} pointerEvents="none">
            <Text style={styles.adLabelText}>Ad</Text>
          </View>
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
          <Text style={styles.placeholderText}>Sponsored</Text>
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
    backgroundColor: '#F2F2F7',
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  webviewWrap: {
    width: '100%',
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    width: 320,
    height: 50,
    backgroundColor: 'transparent',
  },
  placeholderInner: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8E8E93',
    letterSpacing: 0.3,
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
