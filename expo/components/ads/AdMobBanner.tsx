import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { usePremium } from '@/contexts/PremiumContext';

const AD_CLIENT = 'ca-pub-3643873601626975';
const AD_SLOT = '1979589861';

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

  return (
    <Animated.View
      style={[styles.wrapper, { opacity: fadeAnim }]}
      testID="ad-banner"
    >
      <View style={styles.container}>
        {Platform.OS === 'web' ? (
          <View style={styles.iframeWrap}>
            <iframe
              src={`https://pagead2.googlesyndication.com/pagead/ads?client=${AD_CLIENT}&slotname=${AD_SLOT}&output=html&w=320&h=50`}
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
          <View style={styles.inner}>
            <Text style={styles.adText}>Sponsored</Text>
            <Text style={styles.adSubtext}>Tap to learn more</Text>
            <View style={styles.adLabel}>
              <Text style={styles.adLabelText}>Ad</Text>
            </View>
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
    backgroundColor: '#F2F2F7',
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
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
