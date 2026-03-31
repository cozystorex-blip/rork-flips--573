import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { usePremium } from '@/contexts/PremiumContext';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').default;
  } catch {
    console.warn('[AdMobBanner] react-native-webview not available');
  }
}

const AD_CLIENT = 'ca-pub-3643873601626975';
const IOS_AD_SLOT = '1979589861';
const ANDROID_AD_SLOT = '9727556676';

function getAdSlot(): string {
  if (Platform.OS === 'ios') return IOS_AD_SLOT;
  if (Platform.OS === 'android') return ANDROID_AD_SLOT;
  return IOS_AD_SLOT;
}

function buildAdHtml(): string {
  const slot = getAdSlot();
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
    .ad-wrap { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
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

export default function AdMobBanner() {
  const { isPremium } = usePremium();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const existing = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
      if (!existing) {
        const script = document.createElement('script');
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + AD_CLIENT;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
          console.log('[AdMobBanner] AdSense script loaded');
          setAdLoaded(true);
        };
        script.onerror = () => {
          console.warn('[AdMobBanner] AdSense script failed to load');
        };
        document.head.appendChild(script);
      } else {
        setAdLoaded(true);
      }
    }
  }, []);

  useEffect(() => {
    if (adLoaded && Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        console.log('[AdMobBanner] AdSense ad pushed');
      } catch (e) {
        console.warn('[AdMobBanner] AdSense push error:', e);
      }
    }
  }, [adLoaded]);

  if (isPremium) return null;

  const renderNativeAd = () => {
    if (WebView) {
      return (
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
              if (request.url.startsWith('http') && !request.url.includes('pagead2.googlesyndication.com') && !request.url.includes('about:blank')) {
                console.log('[AdMobBanner] Ad clicked, opening:', request.url);
                return true;
              }
              return true;
            }}
            onError={(e: any) => console.warn('[AdMobBanner] WebView error:', e.nativeEvent?.description)}
            onLoadEnd={() => console.log('[AdMobBanner] Native ad WebView loaded')}
          />
          <View style={styles.adLabel} pointerEvents="none">
            <Text style={styles.adLabelText}>Ad</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.inner}>
        <Text style={styles.adText}>Sponsored</Text>
        <View style={styles.adLabel}>
          <Text style={styles.adLabelText}>Ad</Text>
        </View>
      </View>
    );
  };

  return (
    <Animated.View
      style={[styles.wrapper, { opacity: fadeAnim }]}
      testID="ad-banner"
    >
      <View style={styles.container}>
        {Platform.OS === 'web' ? (
          <View style={styles.iframeWrap}>
            <iframe
              src={`https://pagead2.googlesyndication.com/pagead/ads?client=${AD_CLIENT}&slotname=${getAdSlot()}&output=html&w=320&h=50`}
              width="320"
              height="50"
              style={{
                border: 'none',
                overflow: 'hidden',
                borderRadius: 8,
              } as any}
              scrolling="no"
              allowFullScreen
            />
            <View style={styles.adLabel} pointerEvents="none">
              <Text style={styles.adLabelText}>Ad</Text>
            </View>
          </View>
        ) : (
          renderNativeAd()
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
    backgroundColor: '#F2F2F7',
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  webviewWrap: {
    width: 320,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
  },
  webview: {
    width: 320,
    height: 50,
    backgroundColor: 'transparent',
  },
  iframeWrap: {
    width: 320,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
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
