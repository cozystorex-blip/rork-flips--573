import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { showInterstitialIfReady, isInterstitialReady } from '@/services/adService';
import { usePremium } from '@/contexts/PremiumContext';

interface UseAdInterstitialOptions {
  delayMs?: number;
}

export function useAdInterstitial(options: UseAdInterstitialOptions = {}) {
  const { delayMs = 600 } = options;
  const { isPremium } = usePremium();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showInterstitial = useCallback(async (): Promise<boolean> => {
    if (isPremium) {
      console.log('[useAdInterstitial] Premium user — skipping interstitial');
      return false;
    }
    if (Platform.OS === 'web') {
      return false;
    }
    try {
      const shown = await showInterstitialIfReady();
      console.log('[useAdInterstitial] Interstitial result:', shown);
      return shown;
    } catch (e) {
      console.log('[useAdInterstitial] Error showing interstitial:', e);
      return false;
    }
  }, [isPremium]);

  const showInterstitialDelayed = useCallback(() => {
    if (isPremium || Platform.OS === 'web') return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      try {
        await showInterstitialIfReady();
      } catch (e) {
        console.log('[useAdInterstitial] Delayed interstitial error:', e);
      }
    }, delayMs);
  }, [isPremium, delayMs]);

  const canShowInterstitial = useCallback((): boolean => {
    if (isPremium || Platform.OS === 'web') return false;
    return isInterstitialReady();
  }, [isPremium]);

  return {
    showInterstitial,
    showInterstitialDelayed,
    canShowInterstitial,
  };
}
